import { NextRequest, NextResponse } from 'next/server';
import { getCard, updateCard, deleteCard, logCardActivity } from '@/lib/kanban-db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const card = getCard(id);
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }
    return NextResponse.json({ card });
  } catch (error) {
    console.error('[kanban] Failed to get card:', error);
    return NextResponse.json({ error: 'Failed to get card' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const card = updateCard(id, body);
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }
    logCardActivity(id, 'diogo', 'updated', body);
    return NextResponse.json(card);
  } catch (error) {
    console.error('[kanban] Failed to update card:', error);
    return NextResponse.json({ error: 'Failed to update card' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteCard(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[kanban] Failed to delete card:', error);
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  }
}
