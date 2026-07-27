import type { NotificationTemplate, Row } from "./notifications.ts";

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]!);
}

export interface RenderContext { templateKey: NotificationTemplate; payload: Row; publicCode?: string; trackingUrl?: string; ownerUrl?: string }
export interface RenderedEmail { subject: string; html: string; text: string }

function title(context: RenderContext): string {
  const code = context.publicCode ? ` — ${context.publicCode}` : "";
  const productName = context.payload.productName ? String(context.payload.productName) : "Your product";
  if (context.templateKey === "owner_critical_issue") return `Critical feedback needs attention${code}`;
  if (context.templateKey === "owner_reporter_reply") return `A reporter replied${code}`;
  if (context.templateKey === "reporter_information_requested") return `${productName} needs more information about your feedback${code}`;
  if (context.templateKey === "reporter_issue_resolved") return `${productName} resolved your reported issue${code}`;
  if (context.templateKey === "owner_daily_digest") return `VensaOS daily digest — ${Number(context.payload.attentionCount ?? 0)} items need attention`;
  return `${productName} updated your feedback${code}`;
}

export function renderNotification(context: RenderContext): RenderedEmail {
  const subject = title(context);
  const p = context.payload;
  const reporterFacing = context.templateKey.startsWith("reporter_");
  const lines: string[] = ["VensaOS", "Feedback intelligence for product teams."];
  if (p.productName) lines.push(String(p.productName));
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
  if (context.ownerUrl) lines.push(`Open VensaOS: ${context.ownerUrl}`);
  const footer = reporterFacing
    ? "This update was sent through VensaOS because you opted in to receive updates about your feedback."
    : "This operational update was sent through VensaOS.";
  const text = [...lines, footer].join("\n\n");
  const paragraphs = lines.map((line) => `<p style="margin:0 0 16px;line-height:1.55">${escapeHtml(line)}</p>`).join("");
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:#171717"><div style="border-bottom:1px solid #e5e5e5;padding:20px 0"><strong>VensaOS</strong><div style="margin-top:4px;color:#737373;font-size:12px">Feedback intelligence for product teams.</div></div><main style="padding:28px 0">${paragraphs}</main><footer style="border-top:1px solid #e5e5e5;padding:16px 0;color:#737373;font-size:12px">${footer}</footer></div>`;
  return { subject, html, text };
}
