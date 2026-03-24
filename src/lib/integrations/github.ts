const TOKEN = process.env.GITHUB_TOKEN;
const ORG = process.env.GITHUB_ORG || 'surf-no-digital';
const API = 'https://api.github.com';
const headers = { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github+json' };

export async function getSummary() {
  const [reposRes, prsRes] = await Promise.all([
    fetch(`${API}/orgs/${ORG}/repos?per_page=100&sort=updated`, { headers }),
    fetch(`${API}/search/issues?q=org:${ORG}+is:pr+is:open`, { headers }),
  ]);
  const repos = await reposRes.json();
  const prs = await prsRes.json();
  return {
    id: 'github',
    name: 'GitHub',
    icon: '🐙',
    status: TOKEN ? 'connected' : 'disconnected',
    metrics: {
      repos: Array.isArray(repos) ? repos.length : 0,
      openPRs: prs?.total_count || 0,
      recentRepos: Array.isArray(repos) ? repos.slice(0, 5).map((r: any) => ({
        name: r.name, url: r.html_url, updatedAt: r.updated_at, language: r.language
      })) : [],
    },
    lastSync: new Date().toISOString(),
  };
}
