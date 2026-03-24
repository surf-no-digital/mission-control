import { NextRequest, NextResponse } from 'next/server';
import { getBoard, listColumns, listCards, updateBoard, deleteBoard } from '@/lib/kanban-db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const board = getBoard(id);
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    const columns = listColumns(id);
    const cards = listCards(id);
    return NextResponse.json({ board, columns, cards });
  } catch (error) {
    console.error('[kanban] Failed to get board:', error);
    return NextResponse.json({ error: 'Failed to get board' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const board = updateBoard(id, body);
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    return NextResponse.json(board);
  } catch (error) {
    console.error('[kanban] Failed to update board:', error);
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteBoard(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[kanban] Failed to delete board:', error);
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
  }
}
