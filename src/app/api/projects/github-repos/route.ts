import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API = 'https://api.github.com';
const ORG = process.env.GITHUB_ORG || 'surf-no-digital';

export async function GET() {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
    }

    const headers = {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
    };

    const repos: Array<Record<string, unknown>> = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(
        `${API}/orgs/${ORG}/repos?per_page=100&page=${page}&sort=updated`,
        { headers }
      );
      if (!res.ok) {
        const err = await res.text();
        console.error('[projects] GitHub API error:', err);
        return NextResponse.json({ error: 'GitHub API error' }, { status: res.status });
      }
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        hasMore = false;
      } else {
        repos.push(
          ...data.map((r: Record<string, unknown>) => ({
            full_name: r.full_name,
            name: r.name,
            description: r.description,
            language: r.language,
            default_branch: r.default_branch,
            html_url: r.html_url,
            updated_at: r.updated_at,
            pushed_at: r.pushed_at,
            open_issues_count: r.open_issues_count,
            private: r.private,
            archived: r.archived,
          }))
        );
        page++;
        if (data.length < 100) hasMore = false;
      }
    }

    return NextResponse.json({ repos });
  } catch (error) {
    console.error('[projects] Failed to fetch GitHub repos:', error);
    return NextResponse.json({ error: 'Failed to fetch GitHub repos' }, { status: 500 });
  }
}
