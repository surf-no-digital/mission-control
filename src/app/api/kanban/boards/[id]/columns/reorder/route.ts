import { NextRequest, NextResponse } from 'next/server';
import { reorderColumns } from '@/lib/kanban-db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;
    const body = await request.json();
    const { columnIds } = body;

    if (!Array.isArray(columnIds) || columnIds.length === 0) {
      return NextResponse.json({ error: 'columnIds array is required' }, { status: 400 });
    }

    reorderColumns(boardId, columnIds);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[kanban] Failed to reorder columns:', error);
    return NextResponse.json({ error: 'Failed to reorder columns' }, { status: 500 });
  }
}
