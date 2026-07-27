import type { NotificationTemplate, Row } from "./notifications.ts";

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]!);
}

export interface RenderContext { templateKey: NotificationTemplate; payload: Row; publicCode?: string; trackingUrl?: string; ownerUrl?: string }
export interface RenderedEmail { subject: string; html: string; text: string }

function title(context: RenderContext): string {
  const code = context.publicCode ? ` — ${context.publicCode}` : "";
  if (context.templateKey === "owner_critical_issue") return `Critical feedback needs attention${code}`;
  if (context.templateKey === "owner_reporter_reply") return `A reporter replied${code}`;
  if (context.templateKey === "reporter_information_requested") return `The product team needs more information${code}`;
  if (context.templateKey === "reporter_issue_resolved") return `Your reported issue was resolved${code}`;
  if (context.templateKey === "owner_daily_digest") return `Daily Feedback Inbox digest — ${Number(context.payload.attentionCount ?? 0)} items need attention`;
  return `Your feedback status changed${code}`;
}

export function renderNotification(context: RenderContext): RenderedEmail {
  const subject = title(context);
  const p = context.payload;
  const lines: string[] = [p.productName ? String(p.productName) : "Feedback Inbox"];
  if (context.publicCode) lines.push(String(context.publicCode));
  if (p.issueTitle) lines.push(String(p.issueTitle));
  if (p.alertReason) lines.push(`Why this alert fired: ${p.alertReason}`);
  if (p.severity) lines.push(`Severity: ${p.severity}`);
  if (p.priorityScore != null) lines.push(`Priority: ${p.priorityScore}`);
  if (Array.isArray(p.priorityExplanation)) lines.push(...p.priorityExplanation.map(String));
  if (p.reportCount != null) lines.push(`Reports: ${p.reportCount}`);
  if (p.affectedUserCount != null) lines.push(`Affected users: ${p.affectedUserCount}`);
  if (p.status) lines.push(`Status: ${p.status}`);
  if (p.message) lines.push(String(p.message));
  if (p.summary) lines.push(String(p.summary));
  if (Array.isArray(p.topIssues) && p.topIssues.length) lines.push(`Highest priority:\n${p.topIssues.map(String).join("\n")}`);
  if (context.trackingUrl) lines.push(`View your private update: ${context.trackingUrl}`);
  if (context.ownerUrl) lines.push(`Open Feedback Inbox: ${context.ownerUrl}`);
  const text = lines.join("\n\n");
  const paragraphs = lines.map((line) => `<p style="margin:0 0 16px;line-height:1.55">${escapeHtml(line)}</p>`).join("");
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#171717"><div style="border-bottom:1px solid #e5e5e5;padding:20px 0;font-weight:600">Feedback Inbox</div><main style="padding:28px 0">${paragraphs}</main><footer style="border-top:1px solid #e5e5e5;padding:16px 0;color:#737373;font-size:12px">Operational feedback update.</footer></div>`;
  return { subject, html, text };
}
