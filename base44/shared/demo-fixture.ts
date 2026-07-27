export const DEMO_SLUG = "trailverse-demo";
export const DEMO_PRODUCT = "TrailVerse Demo";
export const DEMO_ISSUES = [
  { public_code:"FI-DEMO01",title:"Mobile chat composer obscures new messages",description:"The keyboard and fixed composer can hide the newest conversation content.",category:"ui_ux",product_area:"Mobile chat",severity:"high",priority_score:82,priority_explanation:["Core conversation workflow blocked","Three related reports","Repeated recent activity"],status:"testing",report_count:3,affected_user_count:3 },
  { public_code:"FI-DEMO02",title:"Weather timeline is slow on older phones",description:"The forecast timeline takes several seconds to become interactive.",category:"performance",product_area:"Weather",severity:"medium",priority_score:46,priority_explanation:["Performance degradation","One affected workflow"],status:"open",report_count:1,affected_user_count:1 },
] as const;
export const DEMO_SUBMISSIONS = [
  {submission_key:"demo-chat-1",type:"bug",description:"Chat composer covers the newest message on iPhone.",expected_behavior:"Newest message remains visible.",device_type:"iPhone",processing_status:"completed"},
  {submission_key:"demo-chat-2",type:"bug",description:"Keyboard leaves the conversation scrolled above the reply.",expected_behavior:"Conversation follows the latest reply.",device_type:"Android phone",processing_status:"completed"},
  {submission_key:"demo-chat-3",type:"bug",description:"Latest chat bubble is hidden behind the mobile composer.",expected_behavior:"The latest bubble remains above the composer.",device_type:"iPhone",processing_status:"completed"},
  {submission_key:"demo-weather-1",type:"bug",description:"Weather timeline is very slow on my older phone.",expected_behavior:"Forecast becomes interactive quickly.",device_type:"Android phone",processing_status:"completed"},
] as const;
export function missingDemoRows<T>(existing:readonly T[],desired:readonly T[],key:(row:T)=>string){const found=new Set(existing.map(key));return desired.filter(row=>!found.has(key(row)));}
export function demoFixtureValid(){return DEMO_ISSUES.length===2&&DEMO_SUBMISSIONS.length===4&&new Set(DEMO_SUBMISSIONS.map(row=>row.submission_key)).size===4&&DEMO_ISSUES.some(row=>row.report_count===3);}
