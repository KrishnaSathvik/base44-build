declare const base44: any;
const projects = await base44.entities.Project.filter({ slug: "trailverse-demo" });
if (!projects[0]) throw new Error("TrailVerse Demo does not exist.");
const response = await base44.functions.invoke("maintain-demo", { action: "verify", projectId: projects[0].id });
console.log(JSON.stringify(response.data, null, 2));
if (!response.data?.valid) throw new Error("Demo fixture verification failed.");
