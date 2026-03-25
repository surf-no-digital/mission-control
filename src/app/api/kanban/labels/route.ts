import { NextRequest, NextResponse } from 'next/server';
import { listLabels, createLabel } from '@/lib/kanban-db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const boardId = request.nextUrl.searchParams.get('board_id');
    if (!boardId) {
      return NextResponse.json({ error: 'board_id is required' }, { status: 400 });
    }
    const labels = listLabels(boardId);
    return NextResponse.json({ labels });
  } catch (error) {
    console.error('[kanban] Failed to list labels:', error);
    return NextResponse.json({ error: 'Failed to list labels' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { board_id, name, color, type } = body;
    if (!board_id || !name || !color) {
      return NextResponse.json({ error: 'board_id, name, and color are required' }, { status: 400 });
    }
    const label = createLabel(board_id, name, color, type || 'custom');
    return NextResponse.json({ label }, { status: 201 });
  } catch (error) {
    console.error('[kanban] Failed to create label:', error);
    return NextResponse.json({ error: 'Failed to create label' }, { status: 500 });
  }
}
