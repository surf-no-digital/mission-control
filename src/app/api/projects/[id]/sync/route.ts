import { NextRequest, NextResponse } from 'next/server';
import { getProject, updateProject, listColumns, createCardWithGitHub, findCardByGitHubIssue, listBoards } from '@/lib/kanban-db';

export const dynamic = 'force-dynamic';

const API = 'https://api.github.com';
const DEFAULT_BOARD_ID = 'f011ed3b-19f7-4d05-a1c9-70417520d9cf';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = getProject(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
    }

    const headers = {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
    };

    // Fetch open issues
    const issues: Array<Record<string, unknown>> = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(
        `${API}/repos/${project.github_repo}/issues?state=open&per_page=100&page=${page}&sort=created&direction=desc`,
        { headers }
      );
      if (!res.ok) {
        return NextResponse.json({ error: 'GitHub API error' }, { status: res.status });
      }
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        hasMore = false;
      } else {
        // Filter out pull requests (they also appear in issues endpoint)
        issues.push(...data.filter((i: Record<string, unknown>) => !i.pull_request));
        page++;
        if (data.length < 100) hasMore = false;
      }
    }

    // Find Backlog column for the default board
    const boards = listBoards();
    const boardId = boards.length > 0 ? boards[0].id : DEFAULT_BOARD_ID;
    const columns = listColumns(boardId);
    const backlogColumn = columns.find(c => c.name === 'Backlog');
    if (!backlogColumn) {
      return NextResponse.json({ error: 'Backlog column not found' }, { status: 500 });
    }

    let created = 0;
    let skipped = 0;

    for (const issue of issues) {
      const issueNumber = issue.number as number;
      const existing = findCardByGitHubIssue(project.github_repo, issueNumber);
      if (existing) {
        skipped++;
        continue;
      }

      createCardWithGitHub(
        backlogColumn.id,
        boardId,
        issue.title as string,
        (issue.body as string) || '',
        project.github_repo,
        issueNumber
      );
      created++;
    }

    // Update project issue counts
    updateProject(id, {
      issue_count_open: issues.length,
    } as Partial<typeof project>);

    return NextResponse.json({
      synced: true,
      created,
      skipped,
      total_issues: issues.length,
    });
  } catch (error) {
    console.error('[projects] Failed to sync issues:', error);
    return NextResponse.json({ error: 'Failed to sync issues' }, { status: 500 });
  }
}
