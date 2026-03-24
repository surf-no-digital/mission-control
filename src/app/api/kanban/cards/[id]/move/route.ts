import { NextRequest, NextResponse } from 'next/server';
import { moveCard, getCard, logCardActivity } from '@/lib/kanban-db';
import { wakeupAgent } from '@/lib/kanban-wakeup';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { column_id, position } = body;

    if (!column_id || position === undefined) {
      return NextResponse.json(
        { error: 'column_id and position are required' },
        { status: 400 }
      );
    }

    // Get current card to know from-column name
    const currentCard = getCard(id);
    if (!currentCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const result = moveCard(id, column_id, position);

    let wakeup_triggered = false;
    if (result.wakeup && result.card.assignee_agent_id) {
      const wakeupResult = wakeupAgent(
        result.card.assignee_agent_id,
        {
          id: result.card.id,
          title: result.card.title,
          description: result.card.description,
          priority: result.card.priority,
          assignee_agent_id: result.card.assignee_agent_id,
        },
        result.previousColumnId,
        result.targetColumnName
      );
      wakeup_triggered = wakeupResult.success;
    }

    logCardActivity(id, 'diogo', 'moved', {
      from: result.previousColumnId,
      to: column_id,
    });

    return NextResponse.json({ card: result.card, wakeup_triggered });
  } catch (error) {
    console.error('[kanban] Failed to move card:', error);
    return NextResponse.json({ error: 'Failed to move card' }, { status: 500 });
  }
}
