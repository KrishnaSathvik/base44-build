import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { projectDeleteConfirmationMatches } from "./project-delete.ts";

Deno.test("project delete confirmation requires an exact name match", () => {
  assertEquals(projectDeleteConfirmationMatches("TrailVerse", "TrailVerse"), true);
  assertEquals(projectDeleteConfirmationMatches("TrailVerse", " TrailVerse "), true);
  assertEquals(projectDeleteConfirmationMatches("TrailVerse", "trailverse"), false);
  assertEquals(projectDeleteConfirmationMatches("TrailVerse", "Trail"), false);
  assertEquals(projectDeleteConfirmationMatches("TrailVerse", ""), false);
});
