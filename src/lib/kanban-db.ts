/**
 * Kanban SQLite Database Module
 * Full CRUD for boards, columns, cards, comments, attachments, and activity
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Board {
  id: string;
  name: string;
  description: string;
  column_count?: number;
  card_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  position: number;
  color: string;
  wakeup_on_enter: number;
  created_at: string;
}

export interface Card {
  id: string;
  column_id: string;
  board_id: string;
  title: string;
  description: string;
  position: number;
  priority: string;
  assignee_agent_id: string | null;
  labels: string;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CardDetail extends Card {
  comment_count: number;
  attachment_count: number;
}

export interface Comment {
  id: string;
  card_id: string;
  author_id: string;
  author_name: string;
  body: string;
  mentions: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  card_id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  uploaded_by: string;
  created_at: string;
}

export interface Activity {
  id: string;
  card_id: string;
  actor_id: string;
  action: string;
  details: string;
  created_at: string;
}

// ─── Database Setup ──────────────────────────────────────────────────────────

const DB_PATH = path.join(process.cwd(), 'data', 'kanban.db');

let _db: Database.Database | null = null;

export function getKanbanDb(): Database.Database {
  if (_db) return _db;

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  _db = new Database(DB_PATH);

  _db.pragma('journal_mode = WAL');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('foreign_keys = ON');

  // Create tables
  _db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      color TEXT DEFAULT '#6b7280',
      wakeup_on_enter INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      position INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'medium',
      assignee_agent_id TEXT,
      labels TEXT DEFAULT '[]',
      due_date TEXT,
      created_by TEXT DEFAULT 'diogo',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS card_comments (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      mentions TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS card_attachments (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      mimetype TEXT DEFAULT 'application/octet-stream',
      size INTEGER DEFAULT 0,
      uploaded_by TEXT DEFAULT 'diogo',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS card_activity (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id, position);
    CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id, position);
    CREATE INDEX IF NOT EXISTS idx_cards_board ON cards(board_id);
    CREATE INDEX IF NOT EXISTS idx_comments_card ON card_comments(card_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_attachments_card ON card_attachments(card_id);
    CREATE INDEX IF NOT EXISTS idx_activity_card ON card_activity(card_id, created_at);
  `);

  // Seed default board if no boards exist
  const boardCount = (_db.prepare('SELECT COUNT(*) as n FROM boards').get() as { n: number }).n;
  if (boardCount === 0) {
    seedDefaultBoard(_db);
  }

  return _db;
}

function seedDefaultBoard(db: Database.Database): void {
  const boardId = randomUUID();
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.prepare(
    'INSERT INTO boards (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(boardId, 'Surf No Digital', 'Kanban board principal da empresa', now, now);

  const defaultColumns: Array<{ name: string; position: number; color: string; wakeup: number }> = [
    { name: 'Backlog', position: 0, color: '#6b7280', wakeup: 0 },
    { name: 'Todo', position: 1, color: '#3b82f6', wakeup: 1 },
    { name: 'In Progress', position: 2, color: '#f59e0b', wakeup: 0 },
    { name: 'In Review', position: 3, color: '#8b5cf6', wakeup: 1 },
    { name: 'Done', position: 4, color: '#10b981', wakeup: 0 },
    { name: 'Cancelled', position: 5, color: '#ef4444', wakeup: 0 },
  ];

  const insertCol = db.prepare(
    'INSERT INTO columns (id, board_id, name, position, color, wakeup_on_enter, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  for (const col of defaultColumns) {
    insertCol.run(randomUUID(), boardId, col.name, col.position, col.color, col.wakeup, now);
  }
}

// ─── Boards ──────────────────────────────────────────────────────────────────

export function listBoards(): Board[] {
  const db = getKanbanDb();
  return db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM columns WHERE board_id = b.id) as column_count,
      (SELECT COUNT(*) FROM cards WHERE board_id = b.id) as card_count
    FROM boards b ORDER BY b.created_at DESC
  `).all() as Board[];
}

export function createBoard(name: string, description?: string): Board {
  const db = getKanbanDb();
  const id = randomUUID();
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  db.prepare(
    'INSERT INTO boards (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, description ?? '', now, now);
  return db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as Board;
}

export function getBoard(id: string): Board | null {
  const db = getKanbanDb();
  return (db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM columns WHERE board_id = b.id) as column_count,
      (SELECT COUNT(*) FROM cards WHERE board_id = b.id) as card_count
    FROM boards b WHERE b.id = ?
  `).get(id) as Board | undefined) ?? null;
}

export function updateBoard(id: string, fields: Partial<{ name: string; description: string }>): Board | null {
  const db = getKanbanDb();
  const existing = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
  if (!existing) return null;

  const sets: string[] = [];
  const params: unknown[] = [];

  if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name); }
  if (fields.description !== undefined) { sets.push('description = ?'); params.push(fields.description); }

  if (sets.length === 0) return getBoard(id);

  sets.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE boards SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return getBoard(id);
}

export function deleteBoard(id: string): boolean {
  const db = getKanbanDb();
  const result = db.prepare('DELETE FROM boards WHERE id = ?').run(id);
  return result.changes > 0;
}

// ─── Columns ─────────────────────────────────────────────────────────────────

export function listColumns(boardId: string): Column[] {
  const db = getKanbanDb();
  return db.prepare('SELECT * FROM columns WHERE board_id = ? ORDER BY position ASC').all(boardId) as Column[];
}

export function createColumn(
  boardId: string,
  name: string,
  position: number,
  color?: string,
  wakeupOnEnter?: boolean
): Column {
  const db = getKanbanDb();
  const id = randomUUID();
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  db.prepare(
    'INSERT INTO columns (id, board_id, name, position, color, wakeup_on_enter, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, boardId, name, position, color ?? '#6b7280', wakeupOnEnter ? 1 : 0, now);
  return db.prepare('SELECT * FROM columns WHERE id = ?').get(id) as Column;
}

export function updateColumn(
  id: string,
  fields: Partial<{ name: string; position: number; color: string; wakeup_on_enter: number }>
): Column | null {
  const db = getKanbanDb();
  const existing = db.prepare('SELECT * FROM columns WHERE id = ?').get(id);
  if (!existing) return null;

  const sets: string[] = [];
  const params: unknown[] = [];

  if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name); }
  if (fields.position !== undefined) { sets.push('position = ?'); params.push(fields.position); }
  if (fields.color !== undefined) { sets.push('color = ?'); params.push(fields.color); }
  if (fields.wakeup_on_enter !== undefined) { sets.push('wakeup_on_enter = ?'); params.push(fields.wakeup_on_enter); }

  if (sets.length === 0) return db.prepare('SELECT * FROM columns WHERE id = ?').get(id) as Column;

  params.push(id);
  db.prepare(`UPDATE columns SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return db.prepare('SELECT * FROM columns WHERE id = ?').get(id) as Column;
}

export function deleteColumn(id: string): boolean {
  const db = getKanbanDb();
  const result = db.prepare('DELETE FROM columns WHERE id = ?').run(id);
  return result.changes > 0;
}

export function reorderColumns(boardId: string, columnIds: string[]): void {
  const db = getKanbanDb();
  const stmt = db.prepare('UPDATE columns SET position = ? WHERE id = ? AND board_id = ?');
  const reorder = db.transaction(() => {
    for (let i = 0; i < columnIds.length; i++) {
      stmt.run(i, columnIds[i], boardId);
    }
  });
  reorder();
}

// ─── Cards ───────────────────────────────────────────────────────────────────

export function listCards(
  boardId: string,
  filters?: { columnId?: string; assigneeAgentId?: string; priority?: string }
): Card[] {
  const db = getKanbanDb();
  const conditions: string[] = ['board_id = ?'];
  const params: unknown[] = [boardId];

  if (filters?.columnId) { conditions.push('column_id = ?'); params.push(filters.columnId); }
  if (filters?.assigneeAgentId) { conditions.push('assignee_agent_id = ?'); params.push(filters.assigneeAgentId); }
  if (filters?.priority) { conditions.push('priority = ?'); params.push(filters.priority); }

  return db.prepare(
    `SELECT * FROM cards WHERE ${conditions.join(' AND ')} ORDER BY position ASC`
  ).all(...params) as Card[];
}

export function getCard(id: string): CardDetail | null {
  const db = getKanbanDb();
  return (db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM card_comments WHERE card_id = c.id) as comment_count,
      (SELECT COUNT(*) FROM card_attachments WHERE card_id = c.id) as attachment_count
    FROM cards c WHERE c.id = ?
  `).get(id) as CardDetail | undefined) ?? null;
}

export function createCard(
  columnId: string,
  boardId: string,
  title: string,
  fields?: Partial<Card>
): Card {
  const db = getKanbanDb();
  const id = randomUUID();
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // Get next position in column
  const maxPos = (db.prepare(
    'SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE column_id = ?'
  ).get(columnId) as { max_pos: number }).max_pos;

  db.prepare(`
    INSERT INTO cards (id, column_id, board_id, title, description, position, priority, assignee_agent_id, labels, due_date, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    columnId,
    boardId,
    title,
    fields?.description ?? '',
    fields?.position ?? maxPos + 1,
    fields?.priority ?? 'medium',
    fields?.assignee_agent_id ?? null,
    fields?.labels ?? '[]',
    fields?.due_date ?? null,
    fields?.created_by ?? 'diogo',
    now,
    now
  );

  return db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Card;
}

export function updateCard(id: string, fields: Partial<Card>): Card | null {
  const db = getKanbanDb();
  const existing = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  if (!existing) return null;

  const sets: string[] = [];
  const params: unknown[] = [];

  const allowedFields: Array<keyof Card> = [
    'column_id', 'board_id', 'title', 'description', 'position',
    'priority', 'assignee_agent_id', 'labels', 'due_date', 'created_by',
  ];

  for (const field of allowedFields) {
    if (fields[field] !== undefined) {
      sets.push(`${field} = ?`);
      params.push(fields[field]);
    }
  }

  if (sets.length === 0) return db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Card;

  sets.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE cards SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Card;
}

export function deleteCard(id: string): boolean {
  const db = getKanbanDb();
  const result = db.prepare('DELETE FROM cards WHERE id = ?').run(id);
  return result.changes > 0;
}

export function moveCard(
  id: string,
  targetColumnId: string,
  position: number
): { card: Card; wakeup: boolean; previousColumnId: string; targetColumnName: string } {
  const db = getKanbanDb();

  const current = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Card | undefined;
  if (!current) throw new Error(`Card ${id} not found`);

  const previousColumnId = current.column_id;

  db.prepare(
    "UPDATE cards SET column_id = ?, position = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(targetColumnId, position, id);

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Card;
  const targetColumn = db.prepare('SELECT * FROM columns WHERE id = ?').get(targetColumnId) as Column;

  return {
    card,
    wakeup: targetColumn.wakeup_on_enter === 1 && card.assignee_agent_id !== null,
    previousColumnId,
    targetColumnName: targetColumn.name,
  };
}

// ─── Comments ────────────────────────────────────────────────────────────────

export function listComments(cardId: string): Comment[] {
  const db = getKanbanDb();
  return db.prepare(
    'SELECT * FROM card_comments WHERE card_id = ? ORDER BY created_at ASC'
  ).all(cardId) as Comment[];
}

export function addComment(
  cardId: string,
  authorId: string,
  authorName: string,
  body: string,
  mentions?: string[]
): Comment {
  const db = getKanbanDb();
  const id = randomUUID();
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  db.prepare(
    'INSERT INTO card_comments (id, card_id, author_id, author_name, body, mentions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, cardId, authorId, authorName, body, JSON.stringify(mentions ?? []), now);
  return db.prepare('SELECT * FROM card_comments WHERE id = ?').get(id) as Comment;
}

// ─── Attachments ─────────────────────────────────────────────────────────────

export function listAttachments(cardId: string): Attachment[] {
  const db = getKanbanDb();
  return db.prepare(
    'SELECT * FROM card_attachments WHERE card_id = ? ORDER BY created_at DESC'
  ).all(cardId) as Attachment[];
}

export function addAttachment(
  cardId: string,
  filename: string,
  filepath: string,
  mimetype: string,
  size: number,
  uploadedBy: string
): Attachment {
  const db = getKanbanDb();
  const id = randomUUID();
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  db.prepare(
    'INSERT INTO card_attachments (id, card_id, filename, filepath, mimetype, size, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, cardId, filename, filepath, mimetype, size, uploadedBy, now);
  return db.prepare('SELECT * FROM card_attachments WHERE id = ?').get(id) as Attachment;
}

export function deleteAttachment(id: string): Attachment | null {
  const db = getKanbanDb();
  const attachment = db.prepare('SELECT * FROM card_attachments WHERE id = ?').get(id) as Attachment | undefined;
  if (!attachment) return null;
  db.prepare('DELETE FROM card_attachments WHERE id = ?').run(id);
  return attachment;
}

// ─── Activity ────────────────────────────────────────────────────────────────

export function listActivity(cardId: string, limit?: number): Activity[] {
  const db = getKanbanDb();
  return db.prepare(
    'SELECT * FROM card_activity WHERE card_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(cardId, limit ?? 50) as Activity[];
}

export function logCardActivity(
  cardId: string,
  actorId: string,
  action: string,
  details?: Record<string, unknown>
): void {
  const db = getKanbanDb();
  const id = randomUUID();
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  db.prepare(
    'INSERT INTO card_activity (id, card_id, actor_id, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, cardId, actorId, action, JSON.stringify(details ?? {}), now);
}
