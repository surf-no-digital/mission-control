import { NextRequest, NextResponse } from 'next/server';
import { deleteLabel } from '@/lib/kanban-db';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteLabel(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[kanban] Failed to delete label:', error);
    return NextResponse.json({ error: 'Failed to delete label' }, { status: 500 });
  }
}
