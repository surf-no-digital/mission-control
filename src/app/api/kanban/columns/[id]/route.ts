import { NextRequest, NextResponse } from 'next/server';
import { updateColumn, deleteColumn } from '@/lib/kanban-db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const column = updateColumn(id, body);
    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 });
    }
    return NextResponse.json(column);
  } catch (error) {
    console.error('[kanban] Failed to update column:', error);
    return NextResponse.json({ error: 'Failed to update column' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteColumn(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[kanban] Failed to delete column:', error);
    return NextResponse.json({ error: 'Failed to delete column' }, { status: 500 });
  }
}
