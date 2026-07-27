declare const base44: any;
const slug = "trailverse-demo";
const projects = await base44.entities.Project.filter({ slug });
const project = projects[0] ?? await base44.entities.Project.create({ name: "TrailVerse Demo", slug, description: "A deterministic Feedback Inbox workflow demonstration.", allow_anonymous: true, collect_reporter_email: true, is_active: true, notification_delivery_enabled: false });
const response = await base44.functions.invoke("maintain-demo", { action: "seed", projectId: project.id });
console.log(JSON.stringify(response.data, null, 2));
