import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { configuredHostedUrlReason } from './brand-policy.mjs';

const roots = /^(src|public|base44|scripts\/demo|docs)\//;
const rootFiles = new Set(['index.html', 'README.md', 'CLAUDE.md', 'RELEASE_NOTES.md', 'package.json', 'package-lock.json', '.env.example', 'vite.config.ts', 'tailwind.config.js']);
const excluded = new Set(['scripts/brand-check.mjs']);
const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).trim().split('\n').filter(file => file && existsSync(file));
const sourceFiles = tracked.filter(file => !excluded.has(file) && (roots.test(file) || rootFiles.has(file)));
const distFiles = existsSync('dist') ? execFileSync('rg', ['--files', 'dist'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean) : [];
const files = [...sourceFiles, ...distFiles];

const forbidden = /Feedback Inbox|FeedbackInbox|feedback-inbox|IssueFold|\bMeld\b/g;
const capitalization = /\bVensa\s*OS\b/gi;
const preserved = [];
const violations = [];

for (const file of sourceFiles) {
  const oldPath = file.match(/Feedback Inbox|FeedbackInbox|feedback-inbox|IssueFold|Meld/);
  const capitalizedPath = file.match(/Vensa\s*OS/i);
  if (oldPath) violations.push({ file, value: oldPath[0], surrounding: 'legacy or experimental brand in a production filename' });
  if (capitalizedPath && capitalizedPath[0] !== 'VensaOS') violations.push({ file, value: capitalizedPath[0], surrounding: 'incorrect VensaOS capitalization in a production filename' });
}

function isText(buffer) { return !buffer.subarray(0, Math.min(buffer.length, 2048)).includes(0); }
function context(text, index, length) { return text.slice(Math.max(0, index - 48), Math.min(text.length, index + length + 48)).replace(/\s+/g, ' '); }
function allowed(file, match, surrounding) {
  if (file === 'base44/config.jsonc' && match === 'feedback-inbox') return 'Base44 hosted application identity';
  if (file === 'src/lib/indexedDb.ts' && surrounding.includes('feedback-inbox-local')) return 'stable IndexedDB database name';
  if ((file === 'src/pages/PublicPortalPage.tsx' || file === 'src/app/PwaUpdatePrompt.tsx') && surrounding.includes('feedback-inbox:before-update')) return 'stable draft-preservation browser event';
  if (file === 'README.md' && (match === 'Feedback Inbox' || match === 'feedback-inbox')) return 'explicit historical branding decision';
  if ((file === 'package.json' || file === 'package-lock.json') && match.toLowerCase() === 'vensaos') return 'private package identifier';
  if (file.startsWith('docs/') && match === 'vensaos' && (/npm create|cd vensaos|"name": "vensaos"|vensaos\//.test(surrounding))) return 'documentation of the lowercase package/directory identifier';
  if (file.startsWith('dist/') && (surrounding.includes('feedback-inbox-local') || surrounding.includes('feedback-inbox:before-update'))) return 'built stable client-side technical identifier';
  const hostedUrlReason = configuredHostedUrlReason({ file, match, surrounding, appBaseUrl: process.env.APP_BASE_URL });
  if (hostedUrlReason) return hostedUrlReason;
  return '';
}

for (const file of files) {
  const buffer = readFileSync(file);
  if (!isText(buffer)) continue;
  const text = buffer.toString('utf8');
  for (const regex of [forbidden, capitalization]) {
    regex.lastIndex = 0;
    for (const match of text.matchAll(regex)) {
      if (regex === capitalization && match[0] === 'VensaOS') continue;
      const surrounding = context(text, match.index, match[0].length);
      const reason = allowed(file, match[0], surrounding);
      if (reason) preserved.push({ file, value: match[0], reason });
      else violations.push({ file, value: match[0], surrounding });
    }
  }
}

const og = readFileSync('public/og-image.png');
const width = og.readUInt32BE(16); const height = og.readUInt32BE(20);
if (width !== 1200 || height !== 630) violations.push({ file: 'public/og-image.png', value: `${width}×${height}`, surrounding: 'Open Graph image must be exactly 1200×630.' });

console.log('Intentionally preserved occurrences:');
for (const item of [...new Map(preserved.map(item => [`${item.file}:${item.value}:${item.reason}`, item])).values()]) {
  console.log(`- ${item.file}: ${JSON.stringify(item.value)} — ${item.reason}`);
}
if (violations.length) {
  console.error('\nBrand violations:');
  for (const item of violations) console.error(`- ${item.file}: ${JSON.stringify(item.value)} — ${item.surrounding}`);
  process.exit(1);
}
console.log('\nBrand check passed. Public product references use exact VensaOS capitalization.');
