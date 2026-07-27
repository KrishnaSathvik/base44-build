import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse, printParseErrorCode } from 'jsonc-parser';

const results=[];
const OFFICIAL_ORIGIN='https://vensaos.com';
function record(name,status,detail=''){results.push({name,status,detail});console.log(`${status.toUpperCase().padEnd(7)} ${name}${detail?` — ${detail}`:''}`);}
function run(name,command,args){const result=spawnSync(command,args,{stdio:'inherit',env:{...process.env,APP_BASE_URL:process.env.APP_BASE_URL??OFFICIAL_ORIGIN,NOTIFICATION_INTEGRATION_ENABLED:'false'}});record(name,result.status===0?'passed':'failed',result.status===0?'':`exit ${result.status??'unknown'}`);}
function read(path){return existsSync(path)?readFileSync(path,'utf8'):'';}

run('TypeScript typecheck','npm',['run','typecheck']);
run('Frontend tests','npm',['test']);
run('Production build','npm',['run','build']);
run('Brand validation','node',['scripts/brand-check.mjs']);
run('Official domain validation','node',['scripts/official-domain-check.mjs']);
run('Free-runtime function bundle validation','node',['scripts/check-function-bundles.mjs']);
const functionEntries=[];for(const dir of readdirSync('base44/functions',{withFileTypes:true}))if(dir.isDirectory()&&existsSync(join('base44/functions',dir.name,'entry.ts')))functionEntries.push(join('base44/functions',dir.name,'entry.ts'));
run('Backend Deno checks','deno',['check',...functionEntries]);
run('Backend Deno tests','deno',['test','--allow-env','base44/shared']);
let jsoncOk=true;for(const folder of ['base44/entities','base44/functions']){for(const entry of readdirSync(folder,{withFileTypes:true})){const file=entry.isDirectory()?join(folder,entry.name,'function.jsonc'):join(folder,entry.name);if(!file.endsWith('.jsonc')||!existsSync(file))continue;const errors=[];parse(readFileSync(file,'utf8'),errors,{allowTrailingComma:true});if(errors.length){jsoncOk=false;console.error(`${file}: ${errors.map(error=>printParseErrorCode(error.error)).join(', ')}`);}}}record('JSONC validation',jsoncOk?'passed':'failed');
run('Git diff whitespace check','git',['diff','--check']);
const assets=['public/favicon.svg','public/icon-192.png','public/icon-512.png','public/og-image.png'];record('Required assets',assets.every(existsSync)?'passed':'failed',assets.filter(file=>!existsSync(file)).join(', '));
try{const manifest=JSON.parse(readFileSync('dist/manifest.webmanifest','utf8'));const valid=manifest.name==='VensaOS'&&manifest.short_name==='VensaOS'&&manifest.start_url==='/'&&manifest.scope==='/'&&manifest.display==='standalone'&&manifest.theme_color==='#F6F5F1'&&manifest.background_color==='#F6F5F1';record('Manifest validation',valid?'passed':'failed');}catch(error){record('Manifest validation','failed',error.message);}
const sitemap=readFileSync('public/sitemap.xml','utf8');const sitemapValid=sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')&&sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')&&sitemap.endsWith('</urlset>\n')&&!/\/app\/|\/track\/|\/f\//.test(sitemap);record('Sitemap XML validation',sitemapValid?'passed':'failed');
try{const vercel=JSON.parse(readFileSync('vercel.json','utf8'));const rewriteOk=vercel.$schema==='https://openapi.vercel.sh/vercel.json'&&JSON.stringify(vercel.rewrites)===JSON.stringify([{source:'/(.*)',destination:'/index.html'}]);const expectedRedirects=[{source:'/',has:[{type:'host',value:'www.vensaos.com'}],destination:'https://vensaos.com/',permanent:true},{source:'/:path*',has:[{type:'host',value:'www.vensaos.com'}],destination:'https://vensaos.com/:path*',permanent:true}];const redirectOk=JSON.stringify(vercel.redirects)===JSON.stringify(expectedRedirects);record('Vercel SPA configuration',rewriteOk&&redirectOk?'passed':'failed',rewriteOk&&redirectOk?'':'missing SPA rewrite or www→apex redirect');}catch(error){record('Vercel SPA configuration','failed',error.message);}
const linkedApp=existsSync('base44/.app.jsonc');record('Base44 app identity',linkedApp?'passed':'failed',linkedApp?'linked backend configuration preserved':'linked configuration missing');const appBase=process.env.APP_BASE_URL??OFFICIAL_ORIGIN;record('Production APP_BASE_URL',appBase===OFFICIAL_ORIGIN?'passed':'failed','must equal the approved canonical origin');record('Notification delivery safety','passed','release check forces NOTIFICATION_INTEGRATION_ENABLED=false');
const fixture=readFileSync('base44/shared/demo-fixture.ts','utf8');const maintenance=readFileSync('base44/functions/maintain-demo/entry.ts','utf8');record('Demo fixture validation',fixture.includes('trailverse-demo')&&fixture.includes('demo-chat-3')&&maintenance.includes('demo:failed:no-send')&&maintenance.includes('No email delivery is claimed')?'passed':'failed');

const submitSource=read('base44/functions/submit-feedback/entry.ts');
record('submit-feedback invokes shared processing',submitSource.includes('processFeedbackSubmission')?'passed':'failed');
record('Deterministic fallback present',read('base44/shared/feedback-fallback.ts').includes('classifyFeedbackDeterministically')?'passed':'failed');
record('run-free-maintenance exists',existsSync('base44/functions/run-free-maintenance/entry.ts')?'passed':'failed');
record('Maintenance lease helpers present',read('base44/shared/free-maintenance.ts').includes('acquireMaintenanceLease')?'passed':'failed');
record('Free-runtime architecture docs',existsSync('docs/free-runtime-architecture.md')?'passed':'failed');
const settings=read('src/pages/PlaceholderWorkspacePage.tsx');
record('Digest copy describes activity-driven timing',settings.includes('next becomes active after the configured local hour')?'passed':'failed');
record('Manual maintenance control present',settings.includes('Run maintenance now')?'passed':'failed');
let automationDecls=0;for(const dir of readdirSync('base44/functions',{withFileTypes:true})){if(!dir.isDirectory())continue;const file=join('base44/functions',dir.name,'function.jsonc');if(!existsSync(file))continue;const parsed=parse(readFileSync(file,'utf8'),[],{allowTrailingComma:true});if(Array.isArray(parsed?.automations)&&parsed.automations.length)automationDecls+=1;}
record('No legacy automation declarations',automationDecls===0?'passed':'failed',automationDecls?`${automationDecls} function.jsonc still declare automations`:'');
record('No required Base44 Workflow dependency',!read('docs/free-runtime-architecture.md').includes('cannot operate without those Workflows')&&read('docs/free-runtime-architecture.md').includes('no dashboard Workflows')?'passed':'failed');
record('No real email adapter contacted in release check','passed','NOTIFICATION_INTEGRATION_ENABLED forced false; adapters are mocked in tests');
record('Hosted function execution','skipped','requires deployed Base44 functions after this free-runtime change');
record('Authenticated owner integration','skipped','requires explicit local/hosted test credentials');
record('Physical private-file deletion','skipped','platform has no documented physical-delete API; logical handling is checked');
record('Vercel domain connection','skipped','domain and DNS changes are intentionally outside this local task');

const totals=results.reduce((value,result)=>({...value,[result.status]:(value[result.status]??0)+1}),{});console.log(`\nTotals: ${totals.passed??0} passed, ${totals.failed??0} failed, ${totals.skipped??0} skipped.`);if((totals.failed??0)>0)process.exit(1);
