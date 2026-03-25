import { NextResponse } from 'next/server';
import { listProjects } from '@/lib/kanban-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const projects = listProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('[projects] Failed to list projects:', error);
    return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 });
  }
}
