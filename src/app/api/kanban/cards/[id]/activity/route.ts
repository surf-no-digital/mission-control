import { NextRequest, NextResponse } from 'next/server';
import { listActivity } from '@/lib/kanban-db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
    const activity = listActivity(cardId, 50);
    return NextResponse.json({ activity });
  } catch (error) {
    console.error('[kanban] Failed to list activity:', error);
    return NextResponse.json({ error: 'Failed to list activity' }, { status: 500 });
  }
}
