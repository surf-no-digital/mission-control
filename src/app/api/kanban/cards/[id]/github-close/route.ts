import { NextRequest, NextResponse } from 'next/server';
import { getCard, updateCard, logCardActivity } from '@/lib/kanban-db';

export const dynamic = 'force-dynamic';

const API = 'https://api.github.com';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const card = getCard(id);
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    if (!card.github_repo || !card.github_issue_number) {
      return NextResponse.json({ error: 'Card is not linked to a GitHub issue' }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });
    }

    const res = await fetch(
      `${API}/repos/${card.github_repo}/issues/${card.github_issue_number}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state: 'closed' }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('[kanban] Failed to close GitHub issue:', err);
      return NextResponse.json({ error: 'Failed to close GitHub issue' }, { status: res.status });
    }

    updateCard(id, { github_synced: 1 } as Partial<typeof card>);
    logCardActivity(id, 'system', 'github-issue-closed', {
      repo: card.github_repo,
      issue: card.github_issue_number,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[kanban] Failed to close GitHub issue:', error);
    return NextResponse.json({ error: 'Failed to close GitHub issue' }, { status: 500 });
  }
}
