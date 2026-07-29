import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'jsonc-parser';

const ORIGIN = 'https://vensaos.com';

function read(root, file) { return readFileSync(resolve(root, file), 'utf8'); }

export function validateOfficialDomainConfiguration(root = process.cwd()) {
  const errors = [];
  const configuration = read(root, 'base44/shared/configuration.ts');
  if (!configuration.includes(`CANONICAL_APP_ORIGIN = "${ORIGIN}"`)) errors.push('Canonical origin constant is not the approved apex domain.');
  if (!configuration.includes('SECONDARY_APP_ORIGIN = "https://www.vensaos.com"')) errors.push('Secondary redirect domain is not documented in the origin policy.');
  const env = read(root, '.env.example');
  if (!env.includes(`APP_BASE_URL=${ORIGIN}`)) errors.push('.env.example does not contain the official APP_BASE_URL.');
  if (!env.includes('NOTIFICATION_INTEGRATION_ENABLED=false')) errors.push('Notification integration is not disabled in .env.example.');
  if (/^VITE_APP_BASE_URL=/m.test(env)) errors.push('Unnecessary browser-exposed application origin is configured.');
  const vercel = JSON.parse(read(root, 'vercel.json'));
  if (vercel.$schema !== 'https://openapi.vercel.sh/vercel.json' || JSON.stringify(vercel.rewrites) !== JSON.stringify([{source:'/(.*)',destination:'/index.html'}])) errors.push('Vercel SPA rewrite is invalid.');
  const expectedRedirects=[{source:'/',has:[{type:'host',value:'www.vensaos.com'}],destination:'https://vensaos.com/',permanent:true},{source:'/:path*',has:[{type:'host',value:'www.vensaos.com'}],destination:'https://vensaos.com/:path*',permanent:true}];
  if (JSON.stringify(vercel.redirects) !== JSON.stringify(expectedRedirects)) errors.push('Vercel www→apex permanent redirect is missing.');
  const robots = read(root, 'public/robots.txt');
  for (const required of ['Disallow: /app/','Disallow: /track/','Disallow: /auth/','Disallow: /setup/',`Sitemap: ${ORIGIN}/sitemap.xml`]) if (!robots.includes(required)) errors.push(`robots.txt is missing ${required}`);
  const sitemap = read(root, 'public/sitemap.xml');
  if (!sitemap.includes(`<loc>${ORIGIN}/</loc>`) || !sitemap.includes(`<loc>${ORIGIN}/demo</loc>`) || /\/app\/|\/track\/|\/f\//.test(sitemap)) errors.push('Sitemap contains missing or unsafe routes.');
  const index = read(root, 'index.html');
  for (const required of ['__APP_BASE_URL__/','__APP_BASE_URL__/og-image.png','content="__ROBOTS__"']) if (!index.includes(required)) errors.push(`index.html metadata template is missing ${required}`);
  const base44Config = parse(read(root, 'base44/config.jsonc'));
  if (base44Config?.site?.outputDirectory !== './dist') errors.push('Base44 output directory changed from ./dist.');
  const docs = read(root, 'docs/vercel-domain-setup.md');
  for (const required of ['vensaos.com','www.vensaos.com','www.vensaos.com` → `https://vensaos.com','Base44 backend']) if (!docs.includes(required)) errors.push(`Vercel domain documentation is missing ${required}`);
  return errors;
}

export function validateProductionOutput(root = process.cwd()) {
  const errors = [];
  const indexPath = resolve(root, 'dist/index.html');
  if (!existsSync(indexPath)) return ['dist/index.html is missing.'];
  const index = readFileSync(indexPath,'utf8');
  for (const required of [`rel="canonical" href="${ORIGIN}/"`,`property="og:url" content="${ORIGIN}/"`,`property="og:image" content="${ORIGIN}/og-image.png"`,`name="twitter:image" content="${ORIGIN}/og-image.png"`,'application/ld+json','"@type":"Organization"','"@type":"WebSite"']) if (!index.includes(required)) errors.push(`Production metadata is missing ${required}`);
  if (/localhost|127\.0\.0\.1|\.vercel\.app|feedback-inbox[^"'\s<]*\.base44\.app|www\.vensaos\.com/.test(index)) errors.push('Production HTML contains a forbidden public origin.');
  const routeShells = [
    { file: 'dist/demo/index.html', title: 'Demo — VensaOS', canonical: `${ORIGIN}/demo` },
    { file: 'dist/privacy/index.html', title: 'Privacy Policy — VensaOS', canonical: `${ORIGIN}/privacy` },
    { file: 'dist/terms/index.html', title: 'Terms of Service — VensaOS', canonical: `${ORIGIN}/terms` },
    { file: 'dist/security/index.html', title: 'Security & Data Handling — VensaOS', canonical: `${ORIGIN}/security` },
  ];
  for (const shell of routeShells) {
    const shellPath = resolve(root, shell.file);
    if (!existsSync(shellPath)) {
      errors.push(`${shell.file} is missing.`);
      continue;
    }
    const html = readFileSync(shellPath, 'utf8');
    if (!html.includes(`<title>${shell.title}</title>`)) errors.push(`${shell.file} is missing unique title.`);
    if (!html.includes(`href="${shell.canonical}"`)) errors.push(`${shell.file} is missing canonical ${shell.canonical}.`);
    if (!html.includes('<h1>')) errors.push(`${shell.file} is missing crawler-visible h1.`);
  }
  for (const shell of routeShells) {
    const flat = shell.file.replace('/index.html', '.html');
    if (!existsSync(resolve(root, flat))) errors.push(`${flat} is missing.`);
  }
  const manifest = JSON.parse(read(root,'dist/manifest.webmanifest'));
  if (manifest.start_url !== '/' || manifest.scope !== '/') errors.push('PWA start_url and scope must remain relative.');
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const errors = [...validateOfficialDomainConfiguration(), ...validateProductionOutput()];
  if (errors.length) { for (const error of errors) console.error(`- ${error}`); process.exit(1); }
  console.log('Official VensaOS domain configuration and production output passed.');
}
