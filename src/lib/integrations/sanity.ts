const PROJECT_ID = process.env.SANITY_PROJECT_ID;
const DATASET = process.env.SANITY_DATASET || 'production';
const TOKEN = process.env.SANITY_TOKEN;
const API = `https://${PROJECT_ID}.api.sanity.io/v2021-06-07`;

export async function getSummary() {
  const headers: Record<string, string> = {};
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  const query = encodeURIComponent('{"total": count(*[_type=="post"]), "published": count(*[_type=="post" && !(_id in path("drafts.**"))]), "drafts": count(*[_type=="post" && _id in path("drafts.**")]), "recent": *[_type=="post"] | order(_createdAt desc)[0..4]{title, _createdAt, "slug": slug.current}}');

  try {
    const res = await fetch(`${API}/data/query/${DATASET}?query=${query}`, { headers });
    const data = await res.json();
    const result = data?.result || {};
    return {
      id: 'sanity',
      name: 'Sanity CMS',
      icon: '📝',
      status: PROJECT_ID ? 'connected' : 'disconnected',
      metrics: {
        totalPosts: result.total || 0,
        published: result.published || 0,
        drafts: result.drafts || 0,
        recentPosts: result.recent || [],
      },
      lastSync: new Date().toISOString(),
    };
  } catch {
    return { id: 'sanity', name: 'Sanity CMS', icon: '📝', status: 'disconnected', metrics: {}, lastSync: null };
  }
}
