import { createClientFromRequest } from "npm:@base44/sdk";
import { prepareDueDigests } from "../../shared/free-maintenance.ts";
import { error, errorMessage, json } from "../../shared/response.ts";

Deno.serve(async (req) => {
  try {
    const sr = createClientFromRequest(req).asServiceRole;
    const result = await prepareDueDigests(sr, new Date());
    return json({
      success: true,
      projectsChecked: result.projectsChecked,
      queued: result.queued,
      skippedEmpty: result.skippedEmpty,
      duplicate: result.duplicate,
    });
  } catch (err) {
    return error(errorMessage(err), 500);
  }
});
