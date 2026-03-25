import { NextRequest, NextResponse } from 'next/server';
import { createProject, getProjectByRepo, type Project } from '@/lib/kanban-db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repos } = body; // array of repo objects from github-repos API

    if (!Array.isArray(repos) || repos.length === 0) {
      return NextResponse.json({ error: 'repos array is required' }, { status: 400 });
    }

    const imported: Project[] = [];
    const skipped: string[] = [];

    for (const repo of repos) {
      const fullName = repo.full_name as string;
      const existing = getProjectByRepo(fullName);
      if (existing) {
        skipped.push(fullName);
        continue;
      }

      const project = createProject({
        name: repo.name as string,
        description: (repo.description as string) || '',
        github_repo: fullName,
        github_default_branch: (repo.default_branch as string) || 'main',
        language: (repo.language as string) || '',
        last_push_at: (repo.pushed_at as string) || undefined,
        issue_count_open: (repo.open_issues_count as number) || 0,
      });
      imported.push(project);
    }

    return NextResponse.json({ imported, skipped }, { status: 201 });
  } catch (error) {
    console.error('[projects] Failed to import repos:', error);
    return NextResponse.json({ error: 'Failed to import repos' }, { status: 500 });
  }
}
