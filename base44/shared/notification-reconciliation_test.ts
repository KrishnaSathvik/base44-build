import { assertEquals } from "jsr:@std/assert";
import { reconcileRecentNotifications } from "./notification-reconciliation.ts";

Deno.test("reconciliation creates one missing reporter-reply delivery and remains idempotent",async()=>{
  const source={id:"event-1",project_id:"p1",issue_id:"i1",submission_id:"s1",event_type:"reporter_follow_up",actor_type:"reporter",created_at:"2026-07-27T12:00:00.000Z"};
  const deliveries:any[]=[];const activities:any[]=[source];
  const sr={entities:{
    ActivityEvent:{list:()=>Promise.resolve([...activities]),create:(row:any)=>{const value={id:`event-${activities.length+1}`,...row};activities.push(value);return Promise.resolve(value);}},
    Project:{get:()=>Promise.resolve({id:"p1",created_by:"owner@example.com",owner_reply_alerts_enabled:true,name:"Acme"})},
    Issue:{get:()=>Promise.resolve({id:"i1",project_id:"p1",title:"Checkout freeze",status:"open"})},
    ReporterMessage:{filter:()=>Promise.resolve([{id:"message-1",submission_id:"s1",issue_id:"i1",sender_type:"reporter",body:"It still fails",created_at:"2026-07-27T11:59:00.000Z"}])},
    NotificationDelivery:{filter:({dedupe_key}:any)=>Promise.resolve(deliveries.filter(row=>row.dedupe_key===dedupe_key)),create:(row:any)=>{const value={id:`delivery-${deliveries.length+1}`,...row};deliveries.push(value);return Promise.resolve(value);}},
    IssueReport:{filter:()=>Promise.resolve([])},FeedbackSubmission:{get:()=>Promise.resolve(null)},
  }};
  const now=new Date("2026-07-27T12:30:00.000Z");await reconcileRecentNotifications(sr,now);await reconcileRecentNotifications(sr,now);
  assertEquals(deliveries.length,1);assertEquals(deliveries[0].template_key,"owner_reporter_reply");assertEquals(deliveries[0].dedupe_key,"reporter_reply:message-1:owner@example.com");
});
