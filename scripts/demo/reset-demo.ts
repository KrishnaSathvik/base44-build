declare const base44: any;
const projects = await base44.entities.Project.filter({ slug: "trailverse-demo" });
if (!projects[0]) throw new Error("TrailVerse Demo does not exist. Run demo:seed first.");
const response = await base44.functions.invoke("maintain-demo", { action: "reset", projectId: projects[0].id });
console.log(JSON.stringify(response.data, null, 2));
