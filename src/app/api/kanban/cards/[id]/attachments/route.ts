import { NextRequest, NextResponse } from 'next/server';
import { listAttachments, addAttachment, logCardActivity } from '@/lib/kanban-db';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
    const attachments = listAttachments(cardId);
    return NextResponse.json({ attachments });
  } catch (error) {
    console.error('[kanban] Failed to list attachments:', error);
    return NextResponse.json({ error: 'Failed to list attachments' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cardId } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const uploadedBy = (formData.get('uploaded_by') as string) || 'diogo';

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 });
    }

    // Save file to data/attachments/<cardId>/
    const attachDir = path.join(process.cwd(), 'data', 'attachments', cardId);
    if (!fs.existsSync(attachDir)) {
      fs.mkdirSync(attachDir, { recursive: true });
    }

    const filename = file.name;
    const filepath = path.join(attachDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    const attachment = addAttachment(
      cardId,
      filename,
      filepath,
      file.type || 'application/octet-stream',
      file.size,
      uploadedBy
    );

    logCardActivity(cardId, uploadedBy, 'attachment_added', { filename });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('[kanban] Failed to add attachment:', error);
    return NextResponse.json({ error: 'Failed to add attachment' }, { status: 500 });
  }
}
