import { NextRequest, NextResponse } from 'next/server';
import { listBoards, createBoard } from '@/lib/kanban-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const boards = listBoards();
    return NextResponse.json({ boards });
  } catch (error) {
    console.error('[kanban] Failed to list boards:', error);
    return NextResponse.json({ error: 'Failed to list boards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const board = createBoard(name, description);
    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    console.error('[kanban] Failed to create board:', error);
    return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
  }
}
