import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.AUDIT_BASE_URL ?? 'http://127.0.0.1:5173';
const OUT = '/tmp/verify-this/responsive-audit';
const COPY = '/Users/krishnasathvikmantripragada/base44-build/output/audit';
const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1280, height: 800 },
};
const LONG_TOKEN = 'zBNG_LZwoBBwe6lDf71cgSiOPuo1YP096nXae4oK4I0';

const project = {
  id: 'p1',
  slug: 'trailverse-demo',
  name: 'Groceries — Smart Lists',
  description: 'Demo',
  product_url: 'https://example.com',
  allowAnonymous: true,
  feedbackTypesEnabled: ['bug', 'feature', 'general'],
  collectReporterEmail: true,
  isActive: true,
  created_date: '2026-07-01T00:00:00Z',
};

const issue = {
  id: 'issue-1',
  project_id: 'p1',
  owner_id: 'owner@test.dev',
  public_code: 'FI-V9VXSG',
  title: 'Groceries icons misalignment and category functionality issues',
  description: 'Groceries icons are not perfectly matching and categories are not working as expected.',
  status: 'unreviewed',
  severity: 'medium',
  category: 'ui_ux',
  product_area: 'groceries-smart-lists',
  reproducibility: 'unknown',
  core_workflow_blocked: false,
  report_count: 1,
  affected_user_count: 1,
  priority_score: 20,
  priority_explanation: ['Medium severity (+15)', 'Recent activity (+5)'],
  last_seen_at: '2026-07-27T19:53:00Z',
  created_date: '2026-07-27T19:53:00Z',
};

const resolvedIssue = {
  ...issue,
  id: 'issue-2',
  public_code: 'FI-RESOLVED',
  title: 'Resolved sample issue',
  status: 'resolved',
  resolved_at: '2026-07-26T12:00:00Z',
  public_resolution_note: 'Fixed in the latest build.',
  resolution_confirmation_status: 'pending',
};

const submission = {
  id: 'sub-1',
  project_id: 'p1',
  owner_id: 'owner@test.dev',
  type: 'bug',
  description: 'Groceries icons are not perfectly matching and categories are not working as expected.',
  processing_status: 'completed',
  ai_summary: 'Groceries icons misalignment and category functionality issues',
  ai_severity: 'medium',
  ai_product_area: 'groceries-smart-lists',
  ai_category: 'ui_ux',
  ai_confidence: 0.7,
  ai_keywords: ['icons', 'alignment', 'categories'],
  ai_reproducibility: 'unknown',
  ai_core_workflow_blocked: false,
  ai_analysis_mode: 'ai',
  ai_severity_reasons: ['Inconsistent visual design impacts usability'],
  context_included: true,
  browser_name: 'Chrome',
  browser_version: '149.0',
  device_type: 'Desktop',
  operating_system: 'macOS',
  screen_width: 1512,
  screen_height: 982,
  viewport_width: 1512,
  viewport_height: 744,
  page_url: 'https://app.example.com/lists',
  created_at: '2026-07-27T19:53:00Z',
  created_date: '2026-07-27T19:53:00Z',
};

mkdirSync(join(OUT, 'mobile'), { recursive: true });
mkdirSync(join(OUT, 'desktop'), { recursive: true });
mkdirSync(COPY, { recursive: true });

function entityNameFromUrl(url) {
  const match = url.match(/\/entities\/([^/?]+)/);
  return match?.[1] ?? '';
}

function functionNameFromUrl(url) {
  const match = url.match(/\/functions\/([^/?]+)/);
  return match?.[1] ?? '';
}

async function overflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
    const clientW = doc.clientWidth;
    const offenders = [...document.querySelectorAll('body *')]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.right > clientW + 2 && rect.width > 40;
      })
      .slice(0, 6)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        className: String(el.className).slice(0, 90),
        right: Math.round(el.getBoundingClientRect().right),
      }));
    return { overflow: scrollW > clientW + 1, scrollW, clientW, offenders };
  });
}

async function installPublicMocks(page) {
  await page.route('**/apps/*/functions/**', async (route) => {
    const name = functionNameFromUrl(route.request().url());
    if (name === 'get-public-project') {
      return route.fulfill({
        json: {
          slug: project.slug,
          name: project.name,
          description: project.description,
          productUrl: 'https://example.com',
          allowAnonymous: true,
          feedbackTypesEnabled: ['bug', 'feature', 'general'],
          collectReporterEmail: true,
          isActive: true,
        },
      });
    }
    if (name === 'submit-feedback') {
      return route.fulfill({
        json: {
          success: true,
          duplicate: false,
          submissionRef: 'submission-1',
          trackingToken: LONG_TOKEN,
          trackingUrl: `/track/${LONG_TOKEN}`,
          publicCode: 'FI-V9VXSG',
        },
      });
    }
    if (name === 'access-tracking-page') {
      return route.fulfill({
        json: {
          feedbackType: 'bug',
          originalDescription: submission.description,
          publicIssueCode: 'FI-V9VXSG',
          issueTitle: issue.title,
          status: 'unreviewed',
          publicResolutionNote: null,
          resolutionConfirmationStatus: 'not_requested',
          createdAt: submission.created_at,
          resolvedAt: null,
          reopenedAt: null,
          publicMessages: [],
          publicActivityEvents: [
            { createdAt: submission.created_at, message: 'Your feedback was received.' },
          ],
          originalContext: {
            browserName: 'Chrome',
            browserVersion: '149.0',
            operatingSystem: 'macOS',
            deviceType: 'Desktop',
            screenWidth: 1512,
            screenHeight: 982,
            viewportWidth: 1512,
            viewportHeight: 744,
            pageUrl: 'https://app.example.com/lists',
          },
          ownAttachments: [],
          canManageEmailUpdates: false,
          emailUpdatesEnabled: false,
        },
      });
    }
    return route.fulfill({ json: { success: true } });
  });
}

async function installOwnerMocks(page) {
  await page.route('**/apps/*/entities/**', async (route) => {
    const url = route.request().url();
    const entity = entityNameFromUrl(url);

    if (entity === 'User' && url.includes('/me')) {
      return route.fulfill({
        json: { id: 'u1', email: 'owner@test.dev', full_name: 'Owner' },
      });
    }

    // get by id: /entities/Issue/issue-1
    const idMatch = url.match(/\/entities\/[^/]+\/([^/?]+)/);
    if (idMatch && idMatch[1] !== 'me') {
      const id = idMatch[1];
      if (entity === 'Issue') return route.fulfill({ json: issue.id === id ? issue : resolvedIssue });
      if (entity === 'FeedbackSubmission') return route.fulfill({ json: submission });
      return route.fulfill({ json: {} });
    }

    const lists = {
      Project: [project],
      Issue: [issue, resolvedIssue],
      FeedbackSubmission: [submission],
      IssueReport: [
        {
          id: 'link-1',
          project_id: 'p1',
          owner_id: 'owner@test.dev',
          issue_id: 'issue-1',
          submission_id: 'sub-1',
          review_status: 'accepted',
          grouping_method: 'automatic',
          similarity_score: 0.9,
          matching_reasons: ['Same icons area'],
          conflicting_evidence: [],
          created_date: submission.created_date,
        },
      ],
      DuplicateSuggestion: [],
      FeedbackAttachment: [],
      ReporterMessage: [],
      NotificationDelivery: [],
      ActivityEvent: [
        {
          id: 'a1',
          issue_id: 'issue-1',
          event_type: 'classified',
          public_message: 'Classified as ui_ux, medium severity (ai)',
          created_at: submission.created_at,
          created_date: submission.created_date,
        },
      ],
    };

    if (entity in lists) return route.fulfill({ json: lists[entity] });
    return route.fulfill({ json: [] });
  });

  await page.route('**/apps/*/functions/**', async (route) => {
    const name = functionNameFromUrl(route.request().url());
    if (name === 'run-free-maintenance') {
      return route.fulfill({ json: { status: 'skipped', reason: 'throttled' } });
    }
    return route.fulfill({ json: { success: true } });
  });
}

async function shot(page, viewport, name) {
  const path = join(OUT, viewport, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  try {
    copyFileSync(path, join(COPY, `${viewport}-${name}.png`));
  } catch {
    /* ignore */
  }
  const metrics = await overflow(page);
  const title = await page.title();
  const bodyText = await page.locator('body').innerText();
  return {
    name,
    viewport,
    path,
    title,
    authWall: /Welcome back|Sign in to|Create account/i.test(bodyText),
    ...metrics,
  };
}

async function runPublic(browser, viewportName, size) {
  const context = await browser.newContext({ viewport: size });
  const page = await context.newPage();
  await installPublicMocks(page);
  const results = [];

  await page.goto(`${BASE}/f/trailverse-demo`, { waitUntil: 'networkidle' });
  await page.getByLabel(/Feedback type|Describe/i).first().waitFor({ timeout: 20000 });
  results.push(await shot(page, viewportName, '01-portal'));

  await page.getByLabel(/Describe/i).fill(
    'Checkout overflows on mobile screens when the cart is long enough to wrap awkwardly.',
  );
  await page.getByRole('button', { name: /send feedback/i }).click();
  await page.getByRole('heading', { name: 'Your feedback is in' }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  results.push(await shot(page, viewportName, '02-confirmation'));

  await page.goto(`${BASE}/track/${LONG_TOKEN}`, { waitUntil: 'networkidle' });
  await page.getByText(/Check for updates|Your feedback was received/i).first().waitFor({ timeout: 15000 });
  results.push(await shot(page, viewportName, '03-tracking'));
  await page.getByRole('button', { name: /check for updates/i }).click();
  await page.getByText(/Updated|No new updates/i).waitFor({ timeout: 10000 });
  results.push(await shot(page, viewportName, '04-tracking-toast'));

  await context.close();
  return results;
}

async function runOwner(browser, viewportName, size) {
  const context = await browser.newContext({ viewport: size });
  const page = await context.newPage();
  await installOwnerMocks(page);
  const results = [];

  const routes = [
    ['/app/overview', '05-overview', /Friday briefing|need attention|Everything is clear/i],
    ['/app/inbox', '06-inbox', /Inbox|Exceptions/i],
    ['/app/issues', '07-issues', /Issues|Open issues|Needs attention/i],
    ['/app/issues/issue-1', '08-issue-detail', /Update this issue|All issues/i],
    ['/app/resolved', '09-resolved', /Resolved|Recently resolved|No resolved/i],
  ];

  for (const [route, name, waitText] of routes) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    try {
      await page.getByText(waitText).first().waitFor({ timeout: 15000 });
    } catch {
      /* capture auth wall or error */
    }
    results.push(await shot(page, viewportName, name));
  }

  await context.close();
  return results;
}

async function run() {
  const browser = await chromium.launch();
  const results = [];

  for (const [viewportName, size] of Object.entries(VIEWPORTS)) {
    results.push(...(await runPublic(browser, viewportName, size)));
    results.push(...(await runOwner(browser, viewportName, size)));
  }

  await browser.close();

  const failures = results.filter((r) => r.overflow || r.authWall);
  const summary = {
    claim:
      'Key portal/confirmation/tracking/dashboard surfaces have no horizontal overflow at 390x844 and 1280x800 and render authenticated owner content under mocks.',
    base: BASE,
    generatedAt: new Date().toISOString(),
    total: results.length,
    overflowCount: results.filter((r) => r.overflow).length,
    authWallCount: results.filter((r) => r.authWall).length,
    failures,
    results,
  };
  writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  writeFileSync(join(COPY, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (failures.length) process.exitCode = 2;
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
