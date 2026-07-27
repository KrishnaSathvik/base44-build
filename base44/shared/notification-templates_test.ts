import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { escapeHtml, renderNotification } from "./notification-templates.ts";

Deno.test("HTML renderer escapes every supplied value and plain text remains useful", () => {
  assertEquals(escapeHtml(`<script>alert("x")</script>`), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  const result = renderNotification({ templateKey: "reporter_information_requested", publicCode: "FI-7K2M9A", trackingUrl: "https://example.test/track/token", payload: { productName: "A&B", message: `<img src=x onerror=alert(1)>` } });
  assertStringIncludes(result.subject, "FI-7K2M9A"); assertStringIncludes(result.html, "A&amp;B");
  assert(!result.html.includes("<img src=x")); assertStringIncludes(result.text, "<img src=x onerror=alert(1)>");
  assertStringIncludes(result.subject, "A&B needs more information about your feedback");
  assertStringIncludes(result.html, "VensaOS"); assertStringIncludes(result.html, "Feedback intelligence for product teams.");
  assertStringIncludes(result.text, "This update was sent through VensaOS because you opted in");
});

Deno.test("templates contain no tracking pixels or marketing content", () => {
  const rendered = renderNotification({ templateKey: "owner_daily_digest", payload: { attentionCount: 4, summary: "Four items" } });
  assertEquals(rendered.subject, "VensaOS daily digest — 4 items need attention");
  assertStringIncludes(rendered.html, "VensaOS"); assertStringIncludes(rendered.text, "VensaOS");
  assertEquals(/tracking pixel|unsubscribe from marketing/i.test(rendered.html), false);
});
