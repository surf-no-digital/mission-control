import * as github from './github';
import * as vercel from './vercel';
import * as sanity from './sanity';
import * as cloudflare from './cloudflare';

export const integrations = { github, vercel, sanity, cloudflare };

export async function getAllIntegrations() {
  const results = await Promise.allSettled([
    github.getSummary(),
    vercel.getSummary(),
    sanity.getSummary(),
    cloudflare.getSummary(),
  ]);
  return results.map(r => r.status === 'fulfilled' ? r.value : { id: 'unknown', status: 'error', error: (r as any).reason?.message });
}
