/** Entity tables deleted when an owner removes a project, in dependency-safe order. */
export const PROJECT_CHILD_ENTITIES = [
  "NotificationDelivery",
  "ReporterMessage",
  "DuplicateSuggestion",
  "IssueReport",
  "ActivityEvent",
  "FeedbackAttachment",
  "ReporterAccess",
  "FeedbackSubmission",
  "Issue",
] as const;

export function projectDeleteConfirmationMatches(
  projectName: string | null | undefined,
  confirmationName: string | null | undefined,
): boolean {
  return !!projectName && !!confirmationName && projectName.trim() === confirmationName.trim();
}
