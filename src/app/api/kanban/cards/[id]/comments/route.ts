import { NextRequest, NextResponse } from 'next/server';
import { listComments, addComment, logCardActivity } from '@/lib/kanban-db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
    const comments = listComments(cardId);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('[kanban] Failed to list comments:', error);
    return NextResponse.json({ error: 'Failed to list comments' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
    const body = await request.json();
    const { author_id, author_name, body: commentBody } = body;

    if (!author_id || !author_name || !commentBody) {
      return NextResponse.json(
        { error: 'author_id, author_name, and body are required' },
        { status: 400 }
      );
    }

    // Parse @mentions from body
    const mentionRegex = /@(\w[\w-]*)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(commentBody)) !== null) {
      mentions.push(match[1]);
    }

    const comment = addComment(cardId, author_id, author_name, commentBody, mentions);
    logCardActivity(cardId, author_id, 'commented');

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('[kanban] Failed to add comment:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
