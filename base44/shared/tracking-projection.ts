import { publicMessagesForSubmission, senderLabel } from "./reporter-workflow.ts";

type Row = Record<string, any>;

function attachmentProjection(attachment: Row) {
  return {
    accessKey: attachment.attachment_key, fileName: attachment.file_name, mimeType: attachment.mime_type,
    sizeBytes: attachment.size_bytes, width: attachment.width ?? null, height: attachment.height ?? null,
  };
}

export async function buildTrackingProjection(sr: any, submission: Row, issue: Row): Promise<Record<string, unknown>> {
  const [allMessages, allAttachments, submissionEvents, issueEvents] = await Promise.all([
    sr.entities.ReporterMessage.filter({ issue_id: issue.id }, "created_at"),
    sr.entities.FeedbackAttachment.filter({ submission_id: submission.id }, "created_at"),
    sr.entities.ActivityEvent.filter({ submission_id: submission.id }, "created_at"),
    sr.entities.ActivityEvent.filter({ issue_id: issue.id }, "created_at"),
  ]);
  const attachments = (allAttachments as Row[]).filter((row) => row.upload_status === "completed");
  const messages = publicMessagesForSubmission(allMessages, submission.id).map((message) => ({
    senderLabel: senderLabel(message.sender_type), messageType: message.message_type, body: message.body,
    createdAt: message.created_at ?? message.created_date ?? null,
    ownAttachments: attachments.filter((item) => item.reporter_message_id === message.id).map(attachmentProjection),
  }));
  const seen = new Set<string>();
  const publicActivityEvents = [...submissionEvents, ...issueEvents]
    .filter((event: Row) => !!event.public_message)
    .filter((event: Row) => { const key = `${event.event_type}:${event.created_at}:${event.public_message}`; if (seen.has(key)) return false; seen.add(key); return true; })
    .map((event: Row) => ({ eventType: event.event_type, message: event.public_message, createdAt: event.created_at ?? event.created_date ?? null }))
    .sort((a, b) => `${a.createdAt ?? ""}`.localeCompare(`${b.createdAt ?? ""}`));

  return {
    publicIssueCode: issue.public_code ?? null,
    issueTitle: issue.title ?? null,
    feedbackType: submission.type,
    originalDescription: submission.description,
    originalContext: submission.context_included === true ? {
      browserName: submission.browser_name ?? null, browserVersion: submission.browser_version ?? null,
      operatingSystem: submission.operating_system ?? null, deviceType: submission.device_type ?? null,
      screenWidth: submission.screen_width ?? null, screenHeight: submission.screen_height ?? null,
      viewportWidth: submission.viewport_width ?? null, viewportHeight: submission.viewport_height ?? null,
      pageUrl: submission.page_url ?? null,
    } : null,
    ownAttachments: attachments.filter((item) => !item.reporter_message_id).map(attachmentProjection),
    status: issue.status,
    publicResolutionNote: issue.public_resolution_note ?? null,
    resolutionConfirmationStatus: issue.resolution_confirmation_status ?? "not_requested",
    publicMessages: messages,
    publicActivityEvents,
    createdAt: submission.created_at ?? submission.created_date ?? null,
    resolvedAt: issue.resolved_at ?? null,
    reopenedAt: issue.reopened_at ?? null,
  };
}
