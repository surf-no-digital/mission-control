const TOKEN = process.env.CLOUDFLARE_TOKEN;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const API = 'https://api.cloudflare.com/client/v4';
const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

export async function getSummary() {
  try {
    const [zoneRes, dnsRes] = await Promise.all([
      fetch(`${API}/zones/${ZONE_ID}`, { headers }),
      fetch(`${API}/zones/${ZONE_ID}/dns_records?per_page=50`, { headers }),
    ]);
    const zone = await zoneRes.json();
    const dns = await dnsRes.json();
    return {
      id: 'cloudflare',
      name: 'Cloudflare',
      icon: '☁️',
      status: TOKEN && ZONE_ID ? 'connected' : 'disconnected',
      metrics: {
        zone: zone?.result?.name || '',
        status: zone?.result?.status || 'unknown',
        dnsRecords: dns?.result?.length || 0,
        records: (dns?.result || []).slice(0, 10).map((r: any) => ({
          type: r.type, name: r.name, content: r.content?.substring(0, 40), proxied: r.proxied,
        })),
      },
      lastSync: new Date().toISOString(),
    };
  } catch {
    return { id: 'cloudflare', name: 'Cloudflare', icon: '☁️', status: 'disconnected', metrics: {}, lastSync: null };
  }
}
