import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parse } from 'jsonc-parser';

const functionsRoot = resolve('base44/functions');
const errors = [];

for (const entry of readdirSync(functionsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const configPath = join(functionsRoot, entry.name, 'function.jsonc');
  if (!existsSync(configPath)) continue;
  const errorsJsonc = [];
  const config = parse(readFileSync(configPath, 'utf8'), errorsJsonc, { allowTrailingComma: true });
  if (errorsJsonc.length) {
    errors.push(`${relative('.', configPath)} is invalid JSONC`);
    continue;
  }
  if (Array.isArray(config?.automations) && config.automations.length > 0) {
    errors.push(`${relative('.', configPath)} still declares legacy automations/Workflows`);
  }
}

const required = [
  ['base44/functions/submit-feedback/entry.ts', 'processFeedbackSubmission'],
  ['base44/functions/run-free-maintenance/entry.ts', 'runFreeMaintenance'],
  ['base44/shared/feedback-fallback.ts', 'classifyFeedbackDeterministically'],
  ['base44/shared/feedback-processing.ts', 'processFeedbackSubmission'],
  ['base44/shared/free-maintenance.ts', 'acquireMaintenanceLease'],
];
for (const [file, token] of required) {
  if (!existsSync(file) || !readFileSync(file, 'utf8').includes(token)) {
    errors.push(`${file} must include ${token} for free-runtime operation`);
  }
}

const selfContainedNames = ['process-feedback', 'dispatch-notification', 'process-notification-queue', 'send-daily-digests', 'run-free-maintenance'];
for (const name of selfContainedNames) {
  if (existsSync(join(functionsRoot, name, 'function.jsonc'))) {
    errors.push(`${name}/function.jsonc must be absent so Base44 can bundle ../../shared imports on the free runtime`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Free-runtime function bundles have no Workflow automations and include shared processing.');
