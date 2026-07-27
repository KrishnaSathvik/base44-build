import { assertEquals, assertThrows } from "jsr:@std/assert";
import { buildAppUrl, buildCanonicalUrl, buildOwnerIssueUrl, buildPublicBoardUrl, buildSameOriginReturnUrl, buildTrackingUrl, resolveBackendConfiguration, validateAppBaseUrl } from "./configuration.ts";
Deno.test("production accepts only the approved canonical VensaOS origin",()=>{
  assertEquals(validateAppBaseUrl("https://vensaos.com",true),"https://vensaos.com");
  for(const value of [undefined,"http://vensaos.com","https://www.vensaos.com","https://vensaos.com/","https://vensaos.com/path","https://vensaos.com?query=value","https://vensaos.com#fragment","http://localhost","https://preview.vercel.app","https://feedback-inbox-9330ed4c.base44.app"]){
    assertThrows(()=>validateAppBaseUrl(value,true));
  }
});
Deno.test("notifications remain disabled unless explicitly enabled",()=>{assertEquals(resolveBackendConfiguration({appBaseUrl:"https://vensaos.com",requestUrl:"https://functions.base44.app/x"}).notificationIntegrationEnabled,false);assertEquals(resolveBackendConfiguration({appBaseUrl:"http://localhost:5173",notificationIntegrationEnabled:"true",requestUrl:"http://localhost:4400/x"}).notificationIntegrationEnabled,true);});

Deno.test("canonical URL builders join safe encoded paths without changing origin",()=>{
  assertEquals(buildCanonicalUrl("/"),"https://vensaos.com/");
  assertEquals(buildCanonicalUrl("/demo"),"https://vensaos.com/demo");
  assertEquals(buildPublicBoardUrl("trail verse"),"https://vensaos.com/f/trail%20verse");
  assertEquals(buildTrackingUrl("abc/123"),"https://vensaos.com/track/abc%2F123");
  assertEquals(buildOwnerIssueUrl("issue/id"),"https://vensaos.com/app/issues/issue%2Fid");
  for(const path of ["demo","//evil.example/path","https://evil.example/path","/demo?x=1","/demo#part"]){assertThrows(()=>buildCanonicalUrl(path));}
  assertEquals(buildCanonicalUrl("/demo?mode=guided#step",{allowSearchAndHash:true}),"https://vensaos.com/demo?mode=guided#step");
});

Deno.test("runtime URL builder uses local or preview origin only for runtime navigation",()=>{
  assertEquals(buildAppUrl("/f/demo",{development:true,currentOrigin:"http://localhost:5173"}),"http://localhost:5173/f/demo");
  assertEquals(buildAppUrl("/f/demo",{development:false,currentOrigin:"https://feature.vercel.app"}),"https://vensaos.com/f/demo");
  assertEquals(buildSameOriginReturnUrl("https://feature.vercel.app","/app/issues?next=https://evil.example#private"),"https://feature.vercel.app/app/issues");
  assertThrows(()=>buildSameOriginReturnUrl("https://feature.vercel.app","https://evil.example/app"));
});
