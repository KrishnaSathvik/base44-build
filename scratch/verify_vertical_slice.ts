type Status = "PASSED" | "FAILED" | "SKIPPED";
type Result = { name: string; status: Status; detail?: string };

const results: Result[] = [];

async function invokeLocalFunction(name: string, payload: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(`http://localhost:4400/api/apps/6a627102d65aedec9330ed4c/functions/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-App-Id": "6a627102d65aedec9330ed4c", ...headers },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

async function check(name: string, test: () => Promise<void>) {
  try {
    await test();
    results.push({ name, status: "PASSED" });
    console.log(`PASS    ${name}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : JSON.stringify(error);
    results.push({ name, status: "FAILED", detail });
    console.log(`FAIL    ${name}: ${detail}`);
  }
}

function skip(name: string, detail: string) {
  results.push({ name, status: "SKIPPED", detail });
  console.log(`SKIP    ${name}: ${detail}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function runVerification() {
  console.log("VensaOS vertical-slice verification\n");
  const projectSlug = `test-project-${Date.now()}`;
  let submission: any;
  let duplicate: any;
  let tracking: any;
  const payload = {
    projectSlug,
    submissionKey: crypto.randomUUID(),
    type: "bug",
    description: "Buttons are misaligned on the profile settings page after latest deployment.",
    expectedBehavior: "Buttons should align to the right grid container.",
    pageUrl: "https://example.com/settings/profile",
    reporterEmail: "reporter@example.local",
    emailUpdatesEnabled: true,
  };

  await check("Public project lookup", async () => {
    const project = await invokeLocalFunction("get-public-project", { slug: projectSlug, createIfMissing: true });
    assert(project.slug === projectSlug, "project slug did not match");
  });

  await check("Anonymous feedback submission", async () => {
    submission = await invokeLocalFunction("submit-feedback", payload);
    assert(submission.success === true && submission.duplicate === false, "first submission was not created");
    assert(submission.publicCode && submission.trackingToken, "submission response omitted public tracking data");
  });

  if (submission) {
    await check("Idempotent resubmission", async () => {
      duplicate = await invokeLocalFunction("submit-feedback", payload);
      assert(duplicate.duplicate === true, "duplicate flag was not true");
      assert(duplicate.submissionRef === submission.submissionRef, "submission reference changed");
      assert(duplicate.publicCode === submission.publicCode, "public code changed");
      assert(duplicate.trackingUrl === null, "raw tracking URL was exposed twice");
    });

    await check("Private tracking before resolution", async () => {
      tracking = await invokeLocalFunction("access-tracking-page", { token: submission.trackingToken });
      assert(tracking.originalDescription === payload.description, "original report text changed");
      assert(tracking.status === "open", "new issue was not open");
    });
  } else {
    skip("Idempotent resubmission", "initial submission failed");
    skip("Private tracking before resolution", "initial submission failed");
  }

  await check("Unauthenticated resolution is rejected", async () => {
    try {
      await invokeLocalFunction("resolve-issue", { issueId: "non-existent-issue", publicResolutionNote: "Fixed" });
      throw new Error("unauthenticated resolution unexpectedly succeeded");
    } catch (error: any) {
      assert(error.status === 401, `expected 401, received ${error.status ?? "unknown"}`);
    }
  });

  skip("Authenticated owner sign-in", "requires a verified owner browser session; no credentials are embedded");
  skip("Authenticated issue resolution", "requires a verified owner browser session; no credentials are embedded");
  skip("Resolved tracking update", "depends on authenticated issue resolution");

  if (tracking) {
    await check("Public tracking privacy projection", async () => {
      const privateKeys = ["reporterEmail", "reporter_email", "ownerEmail", "owner_id", "tokenHash", "token_hash", "issueId", "internalId"];
      assert(privateKeys.every(key => !(key in tracking)), "tracking response exposed a private field");
    });
  } else {
    skip("Public tracking privacy projection", "tracking lookup did not complete");
  }

  await check("Invalid tracking tokens are rejected", async () => {
    for (const token of ["random-invalid-token-12345", submission?.trackingToken?.slice(0, 10) ?? "truncated"]) {
      try {
        await invokeLocalFunction("access-tracking-page", { token });
        throw new Error("invalid token unexpectedly succeeded");
      } catch (error: any) {
        assert(error.status === 404, `expected 404, received ${error.status ?? "unknown"}`);
      }
    }
  });

  const passed = results.filter(result => result.status === "PASSED").length;
  const failed = results.filter(result => result.status === "FAILED").length;
  const skipped = results.filter(result => result.status === "SKIPPED").length;
  console.log(`\nSummary: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (failed > 0) process.exitCode = 1;
}

void runVerification();
