const TOKEN = process.env.VERCEL_TOKEN;
const API = 'https://api.vercel.com';
const headers = { Authorization: `Bearer ${TOKEN}` };

export async function getSummary() {
  const [projectsRes, deploymentsRes] = await Promise.all([
    fetch(`${API}/v9/projects?limit=50`, { headers }),
    fetch(`${API}/v6/deployments?limit=10&state=READY`, { headers }),
  ]);
  const projects = await projectsRes.json();
  const deployments = await deploymentsRes.json();
  return {
    id: 'vercel',
    name: 'Vercel',
    icon: '▲',
    status: TOKEN ? 'connected' : 'disconnected',
    metrics: {
      totalProjects: projects?.projects?.length || 0,
      recentDeployments: (deployments?.deployments || []).slice(0, 5).map((d: any) => ({
        name: d.name, url: `https://${d.url}`, state: d.state, createdAt: d.createdAt,
      })),
      projects: (projects?.projects || []).map((p: any) => ({
        name: p.name, framework: p.framework, updatedAt: p.updatedAt,
      })),
    },
    lastSync: new Date().toISOString(),
  };
}
