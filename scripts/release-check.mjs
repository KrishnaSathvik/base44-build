import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse, printParseErrorCode } from 'jsonc-parser';

const results=[];
const OFFICIAL_ORIGIN='https://vensaos.com';
function record(name,status,detail=''){results.push({name,status,detail});console.log(`${status.toUpperCase().padEnd(7)} ${name}${detail?` — ${detail}`:''}`);}
function run(name,command,args){const result=spawnSync(command,args,{stdio:'inherit',env:{...process.env,APP_BASE_URL:process.env.APP_BASE_URL??OFFICIAL_ORIGIN,NOTIFICATION_INTEGRATION_ENABLED:'false'}});record(name,result.status===0?'passed':'failed',result.status===0?'':`exit ${result.status??'unknown'}`);}
run('TypeScript typecheck','npm',['run','typecheck']);
run('Frontend tests','npm',['test']);
run('Production build','npm',['run','build']);
run('Brand validation','node',['scripts/brand-check.mjs']);
run('Official domain validation','node',['scripts/official-domain-check.mjs']);
run('Automation function bundle validation','node',['scripts/check-function-bundles.mjs']);
const functionEntries=[];for(const dir of readdirSync('base44/functions',{withFileTypes:true}))if(dir.isDirectory()&&existsSync(join('base44/functions',dir.name,'entry.ts')))functionEntries.push(join('base44/functions',dir.name,'entry.ts'));
run('Backend Deno checks','deno',['check',...functionEntries]);
run('Backend Deno tests','deno',['test','--allow-env','base44/shared']);
let jsoncOk=true;for(const folder of ['base44/entities','base44/functions']){for(const entry of readdirSync(folder,{withFileTypes:true})){const file=entry.isDirectory()?join(folder,entry.name,'function.jsonc'):join(folder,entry.name);if(!file.endsWith('.jsonc')||!existsSync(file))continue;const errors=[];parse(readFileSync(file,'utf8'),errors,{allowTrailingComma:true});if(errors.length){jsoncOk=false;console.error(`${file}: ${errors.map(error=>printParseErrorCode(error.error)).join(', ')}`);}}}record('JSONC validation',jsoncOk?'passed':'failed');
run('Git diff whitespace check','git',['diff','--check']);
const assets=['public/favicon.svg','public/icon-192.png','public/icon-512.png','public/og-image.png'];record('Required assets',assets.every(existsSync)?'passed':'failed',assets.filter(file=>!existsSync(file)).join(', '));
try{const manifest=JSON.parse(readFileSync('dist/manifest.webmanifest','utf8'));const valid=manifest.name==='VensaOS'&&manifest.short_name==='VensaOS'&&manifest.start_url==='/'&&manifest.scope==='/'&&manifest.display==='standalone'&&manifest.theme_color==='#F6F5F1'&&manifest.background_color==='#F6F5F1';record('Manifest validation',valid?'passed':'failed');}catch(error){record('Manifest validation','failed',error.message);}
const sitemap=readFileSync('public/sitemap.xml','utf8');const sitemapValid=sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')&&sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')&&sitemap.endsWith('</urlset>\n')&&!/\/app\/|\/track\/|\/f\//.test(sitemap);record('Sitemap XML validation',sitemapValid?'passed':'failed');
try{const vercel=JSON.parse(readFileSync('vercel.json','utf8'));record('Vercel SPA configuration',vercel.$schema==='https://openapi.vercel.sh/vercel.json'&&JSON.stringify(vercel.rewrites)===JSON.stringify([{source:'/(.*)',destination:'/index.html'}])?'passed':'failed');}catch(error){record('Vercel SPA configuration','failed',error.message);}
const linkedApp=existsSync('base44/.app.jsonc');record('Base44 app identity',linkedApp?'passed':'failed',linkedApp?'linked backend configuration preserved':'linked configuration missing');const appBase=process.env.APP_BASE_URL??OFFICIAL_ORIGIN;record('Production APP_BASE_URL',appBase===OFFICIAL_ORIGIN?'passed':'failed','must equal the approved canonical origin');record('Notification delivery safety','passed','release check forces NOTIFICATION_INTEGRATION_ENABLED=false');
const fixture=readFileSync('base44/shared/demo-fixture.ts','utf8');const maintenance=readFileSync('base44/functions/maintain-demo/entry.ts','utf8');record('Demo fixture validation',fixture.includes('trailverse-demo')&&fixture.includes('demo-chat-3')&&maintenance.includes('demo:failed:no-send')&&maintenance.includes('No email delivery is claimed')?'passed':'failed');
record('Hosted automation execution','skipped','requires deployed Base44 automations');record('Authenticated owner integration','skipped','requires explicit local/hosted test credentials');record('Physical private-file deletion','skipped','platform has no documented physical-delete API; logical handling is checked');
record('Vercel domain connection','skipped','domain and DNS changes are intentionally outside this local task');
const totals=results.reduce((value,result)=>({...value,[result.status]:(value[result.status]??0)+1}),{});console.log(`\nTotals: ${totals.passed??0} passed, ${totals.failed??0} failed, ${totals.skipped??0} skipped.`);if((totals.failed??0)>0)process.exit(1);
