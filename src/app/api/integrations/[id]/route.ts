import { NextRequest, NextResponse } from 'next/server';
import { integrations } from '@/lib/integrations';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const integration = integrations[id as keyof typeof integrations];
  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
  }
  try {
    const summary = await integration.getSummary();
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch integration' }, { status: 500 });
  }
}
