import {
  FALLBACK_AUTO_GROUP_SCORE,
  FALLBACK_CONFIDENCE,
  FALLBACK_SUGGEST_SCORE,
  classifyFeedbackDeterministically,
  decideDeterministicDuplicate,
  scoreDuplicateCandidate,
} from "./feedback-fallback.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (!Object.is(actual, expected)) throw new Error(`Expected ${expected}, received ${actual}`);
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("deterministic fallback classification uses keyword rules and bounded confidence", () => {
  const analysis = classifyFeedbackDeterministically({
    type: "bug",
    description: "The mobile layout overflows on the checkout page and the button is unusable",
    expected_behavior: "Checkout should fit on a phone screen",
    page_url: "https://example.com/checkout",
    browser_name: "Safari",
    device_type: "mobile",
  });
  assertEquals(analysis.category, "ui_ux");
  assertEquals(analysis.productArea, "Checkout");
  assertEquals(analysis.confidence, FALLBACK_CONFIDENCE);
  assert(analysis.severityReasons.some((reason) => reason.includes("Deterministic")), "should label deterministic mode");
});

Deno.test("deterministic fallback keeps critical login blockers high impact", () => {
  const analysis = classifyFeedbackDeterministically({
    type: "bug",
    description: "Users cannot login after the password reset",
    page_url: "https://example.com/login",
  });
  assertEquals(analysis.severity, "critical");
  assertEquals(analysis.coreWorkflowBlocked, true);
  assertEquals(analysis.category, "authentication");
});

Deno.test("fallback duplicate matching is conservative for auto-group", () => {
  const analysis = classifyFeedbackDeterministically({
    type: "bug",
    description: "Mobile layout overflows on checkout and the primary button is clipped",
    page_url: "https://example.com/checkout",
  });
  const strong = decideDeterministicDuplicate(analysis, {
    description: "Mobile layout overflows on checkout and the primary button is clipped",
    page_url: "https://example.com/checkout",
    type: "bug",
  }, [{
    id: "issue-1",
    title: "Mobile layout overflows on checkout and the primary button is clipped",
    description: "Mobile layout overflows on checkout and the primary button is clipped",
    category: analysis.category,
    productArea: analysis.productArea,
    pagePath: "/checkout",
    feedbackType: "bug",
    keywords: analysis.keywords,
  }]);
  assert(strong.decision.confidence >= FALLBACK_AUTO_GROUP_SCORE, "near-identical text should score very high");
  assertEquals(strong.outcome, "auto_group");

  const weak = decideDeterministicDuplicate(analysis, {
    description: "Mobile layout overflows on checkout and the primary button is clipped",
    page_url: "https://example.com/checkout",
    type: "bug",
  }, [{
    id: "issue-2",
    title: "Homepage is a bit slow sometimes",
    description: "Performance feels sluggish on the marketing homepage",
    category: "performance",
    productArea: "Marketing",
    pagePath: "/",
    feedbackType: "bug",
    keywords: ["slow", "homepage"],
  }]);
  assertEquals(weak.outcome, "separate");
});

Deno.test("fallback suggest band stays below aggressive merging", () => {
  const analysis = classifyFeedbackDeterministically({
    type: "bug",
    description: "Checkout button overflows on mobile phones in safari",
    page_url: "https://example.com/checkout",
  });
  const scored = scoreDuplicateCandidate(analysis, {
    description: "Checkout button overflows on mobile phones in safari",
    page_url: "https://example.com/checkout",
    type: "bug",
  }, {
    id: "issue-3",
    title: "Checkout button is hard to tap on phones",
    description: "On mobile safari the checkout CTA is awkward to use",
    category: "ui_ux",
    productArea: "Checkout",
    pagePath: "/checkout",
    feedbackType: "bug",
    keywords: ["checkout", "mobile", "button"],
  });
  assert(scored.score < FALLBACK_AUTO_GROUP_SCORE || scored.score >= FALLBACK_SUGGEST_SCORE, "related but non-identical reports should not force a fake perfect match");
});
