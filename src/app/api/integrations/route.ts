import { NextResponse } from 'next/server';
import { getAllIntegrations } from '@/lib/integrations';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const integrations = await getAllIntegrations();
    return NextResponse.json({ integrations });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
  }
}
