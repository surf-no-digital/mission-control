import { NextRequest, NextResponse } from 'next/server';
import { deleteAttachment } from '@/lib/kanban-db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { attachmentId } = await params;

    // Get attachment info from DB to find filepath
    const { getKanbanDb } = await import('@/lib/kanban-db');
    const db = getKanbanDb();
    const attachment = db.prepare('SELECT * FROM card_attachments WHERE id = ?').get(attachmentId) as {
      id: string;
      filename: string;
      filepath: string;
      mimetype: string;
    } | undefined;

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    if (!fs.existsSync(attachment.filepath)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(attachment.filepath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': attachment.mimetype,
        'Content-Disposition': `attachment; filename="${attachment.filename}"`,
      },
    });
  } catch (error) {
    console.error('[kanban] Failed to download attachment:', error);
    return NextResponse.json({ error: 'Failed to download attachment' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { attachmentId } = await params;
    const attachment = deleteAttachment(attachmentId);
    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Delete file from disk
    try {
      if (fs.existsSync(attachment.filepath)) {
        fs.unlinkSync(attachment.filepath);
      }
    } catch (err) {
      console.warn('[kanban] Failed to delete file from disk:', err);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[kanban] Failed to delete attachment:', error);
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
  }
}
