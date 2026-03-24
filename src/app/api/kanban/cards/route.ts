import { NextRequest, NextResponse } from 'next/server';
import { createCard, logCardActivity } from '@/lib/kanban-db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { column_id, board_id, title, description, priority, assignee_agent_id, labels, due_date } = body;

    if (!column_id || !board_id || !title) {
      return NextResponse.json(
        { error: 'column_id, board_id, and title are required' },
        { status: 400 }
      );
    }

    const card = createCard(column_id, board_id, title, {
      description,
      priority,
      assignee_agent_id,
      labels,
      due_date,
    });

    logCardActivity(card.id, card.created_by, 'created');

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error('[kanban] Failed to create card:', error);
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}
