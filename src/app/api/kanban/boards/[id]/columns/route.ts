import { NextRequest, NextResponse } from 'next/server';
import { listColumns, createColumn } from '@/lib/kanban-db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const columns = listColumns(id);
    return NextResponse.json({ columns });
  } catch (error) {
    console.error('[kanban] Failed to list columns:', error);
    return NextResponse.json({ error: 'Failed to list columns' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;
    const body = await request.json();
    const { name, color, wakeup_on_enter } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Auto-calculate position (max + 1)
    const existing = listColumns(boardId);
    const maxPosition = existing.length > 0
      ? Math.max(...existing.map(c => c.position))
      : -1;

    const column = createColumn(boardId, name, maxPosition + 1, color, wakeup_on_enter);
    return NextResponse.json(column, { status: 201 });
  } catch (error) {
    console.error('[kanban] Failed to create column:', error);
    return NextResponse.json({ error: 'Failed to create column' }, { status: 500 });
  }
}
