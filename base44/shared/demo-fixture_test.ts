import { assert, assertEquals } from "jsr:@std/assert";
import { DEMO_ISSUES, DEMO_SUBMISSIONS, demoFixtureValid, missingDemoRows } from "./demo-fixture.ts";
Deno.test("demo fixture identifiers are deterministic and internally complete",()=>{assert(demoFixtureValid());assertEquals(DEMO_ISSUES[0].public_code,"FI-DEMO01");assertEquals(DEMO_SUBMISSIONS[2].submission_key,"demo-chat-3");});
Deno.test("demo fixture idempotency helper creates only missing deterministic rows",()=>{const first=missingDemoRows([],DEMO_SUBMISSIONS,row=>row.submission_key);assertEquals(first.length,4);const second=missingDemoRows(first,DEMO_SUBMISSIONS,row=>row.submission_key);assertEquals(second,[]);});
