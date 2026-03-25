import { NextRequest, NextResponse } from 'next/server';
import { addCardLabel, removeCardLabel, getCardLabels } from '@/lib/kanban-db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const labels = getCardLabels(id);
    return NextResponse.json({ labels });
  } catch (error) {
    console.error('[kanban] Failed to get card labels:', error);
    return NextResponse.json({ error: 'Failed to get card labels' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { label_id } = body;
    if (!label_id) {
      return NextResponse.json({ error: 'label_id is required' }, { status: 400 });
    }
    addCardLabel(id, label_id);
    const labels = getCardLabels(id);
    return NextResponse.json({ labels });
  } catch (error) {
    console.error('[kanban] Failed to add card label:', error);
    return NextResponse.json({ error: 'Failed to add card label' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { label_id } = body;
    if (!label_id) {
      return NextResponse.json({ error: 'label_id is required' }, { status: 400 });
    }
    removeCardLabel(id, label_id);
    const labels = getCardLabels(id);
    return NextResponse.json({ labels });
  } catch (error) {
    console.error('[kanban] Failed to remove card label:', error);
    return NextResponse.json({ error: 'Failed to remove card label' }, { status: 500 });
  }
}
