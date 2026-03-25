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
  github_repo: string | null;
  github_issue_number: number | null;
  github_synced: number;
  created_at: string;
  updated_at: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  type: 'area' | 'project' | 'custom';
  board_id: string;
  created_at: string;
}

export interface CardLabel {
  card_id: string;
  label_id: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  github_repo: string;
  github_default_branch: string;
  language: string;
  production_url: string | null;
  vercel_project_id: string | null;
  last_push_at: string | null;
  issue_count_open: number;
  issue_count_closed: number;
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

    -- Labels system
    CREATE TABLE IF NOT EXISTS labels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6b7280',
      type TEXT NOT NULL DEFAULT 'custom' CHECK(type IN ('area', 'project', 'custom')),
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS card_labels (
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
      PRIMARY KEY (card_id, label_id)
    );

    CREATE INDEX IF NOT EXISTS idx_labels_board ON labels(board_id);
    CREATE INDEX IF NOT EXISTS idx_card_labels_card ON card_labels(card_id);
    CREATE INDEX IF NOT EXISTS idx_card_labels_label ON card_labels(label_id);

    -- Projects
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      github_repo TEXT NOT NULL UNIQUE,
      github_default_branch TEXT DEFAULT 'main',
      language TEXT DEFAULT '',
      production_url TEXT,
      vercel_project_id TEXT,
      last_push_at TEXT,
      issue_count_open INTEGER DEFAULT 0,
      issue_count_closed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Add github columns to cards if they don't exist
  try {
    _db.exec(`ALTER TABLE cards ADD COLUMN github_repo TEXT`);
  } catch { /* column already exists */ }
  try {
    _db.exec(`ALTER TABLE cards ADD COLUMN github_issue_number INTEGER`);
  } catch { /* column already exists */ }
  try {
    _db.exec(`ALTER TABLE cards ADD COLUMN github_synced INTEGER DEFAULT 0`);
  } catch { /* column already exists */ }

  // Seed default board if no boards exist
  const boardCount = (_db.prepare('SELECT COUNT(*) as n FROM boards').get() as { n: number }).n;
  if (boardCount === 0) {
    seedDefaultBoard(_db);
  }

  // Seed default labels if none exist
  const labelCount = (_db.prepare('SELECT COUNT(*) as n FROM labels').get() as { n: number }).n;
  if (labelCount === 0) {
    seedDefaultLabels(_db);
  }

  return _db;
}

function seedDefaultLabels(db: Database.Database): void {
  // Find the first board to attach labels to
  const board = db.prepare('SELECT id FROM boards LIMIT 1').get() as { id: string } | undefined;
  if (!board) return;

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const insertLabel = db.prepare(
    'INSERT INTO labels (id, name, color, type, board_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const defaultLabels = [
    // Áreas
    { name: 'dev', color: '#3b82f6', type: 'area' },
    { name: 'marketing', color: '#8b5cf6', type: 'area' },
    { name: 'vendas', color: '#10b981', type: 'area' },
    { name: 'design', color: '#ec4899', type: 'area' },
    { name: 'infra', color: '#6b7280', type: 'area' },
    // Projetos
    { name: '#segurarn', color: '#f97316', type: 'project' },
    { name: '#surfdata', color: '#06b6d4', type: 'project' },
    { name: '#lojaz', color: '#eab308', type: 'project' },
    { name: '#inflx', color: '#ef4444', type: 'project' },
    { name: '#surfnodigital', color: '#1e3a5f', type: 'project' },
  ];

  for (const label of defaultLabels) {
    insertLabel.run(randomUUID(), label.name, label.color, label.type, board.id, now);
  }
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
    INSERT INTO cards (id, column_id, board_id, title, description, position, priority, assignee_agent_id, labels, due_date, created_by, github_repo, github_issue_number, github_synced, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    fields?.github_repo ?? null,
    fields?.github_issue_number ?? null,
    fields?.github_synced ?? 0,
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
    'github_repo', 'github_issue_number', 'github_synced',
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

// ─── Labels ──────────────────────────────────────────────────────────────────

export function listLabels(boardId: string): Label[] {
  const db = getKanbanDb();
  return db.prepare('SELECT * FROM labels WHERE board_id = ? ORDER BY type ASC, name ASC').all(boardId) as Label[];
}

export function createLabel(boardId: string, name: string, color: string, type: string): Label {
  const db = getKanbanDb();
  const id = randomUUID();
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  db.prepare(
    'INSERT INTO labels (id, name, color, type, board_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, name, color, type || 'custom', boardId, now);
  return db.prepare('SELECT * FROM labels WHERE id = ?').get(id) as Label;
}

export function deleteLabel(id: string): boolean {
  const db = getKanbanDb();
  const result = db.prepare('DELETE FROM labels WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getCardLabels(cardId: string): Label[] {
  const db = getKanbanDb();
  return db.prepare(`
    SELECT l.* FROM labels l
    JOIN card_labels cl ON cl.label_id = l.id
    WHERE cl.card_id = ?
    ORDER BY l.type ASC, l.name ASC
  `).all(cardId) as Label[];
}

export function addCardLabel(cardId: string, labelId: string): void {
  const db = getKanbanDb();
  try {
    db.prepare('INSERT INTO card_labels (card_id, label_id) VALUES (?, ?)').run(cardId, labelId);
  } catch {
    // already exists (unique constraint)
  }
}

export function removeCardLabel(cardId: string, labelId: string): void {
  const db = getKanbanDb();
  db.prepare('DELETE FROM card_labels WHERE card_id = ? AND label_id = ?').run(cardId, labelId);
}

export function getCardsWithLabels(boardId: string): Array<{ card_id: string; labels: Label[] }> {
  const db = getKanbanDb();
  const rows = db.prepare(`
    SELECT cl.card_id, l.id, l.name, l.color, l.type, l.board_id, l.created_at
    FROM card_labels cl
    JOIN labels l ON l.id = cl.label_id
    JOIN cards c ON c.id = cl.card_id
    WHERE c.board_id = ?
  `).all(boardId) as Array<Label & { card_id: string }>;

  const map = new Map<string, Label[]>();
  for (const row of rows) {
    const { card_id, ...label } = row;
    if (!map.has(card_id)) map.set(card_id, []);
    map.get(card_id)!.push(label);
  }
  return Array.from(map.entries()).map(([card_id, labels]) => ({ card_id, labels }));
}

// ─── Projects ────────────────────────────────────────────────────────────────

export function listProjects(): Project[] {
  const db = getKanbanDb();
  return db.prepare('SELECT * FROM projects ORDER BY name ASC').all() as Project[];
}

export function getProject(id: string): Project | null {
  const db = getKanbanDb();
  return (db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined) ?? null;
}

export function getProjectByRepo(githubRepo: string): Project | null {
  const db = getKanbanDb();
  return (db.prepare('SELECT * FROM projects WHERE github_repo = ?').get(githubRepo) as Project | undefined) ?? null;
}

export function createProject(fields: {
  name: string;
  description?: string;
  github_repo: string;
  github_default_branch?: string;
  language?: string;
  production_url?: string;
  vercel_project_id?: string;
  last_push_at?: string;
  issue_count_open?: number;
  issue_count_closed?: number;
}): Project {
  const db = getKanbanDb();
  const id = randomUUID();
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  db.prepare(`
    INSERT INTO projects (id, name, description, github_repo, github_default_branch, language, production_url, vercel_project_id, last_push_at, issue_count_open, issue_count_closed, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    fields.name,
    fields.description ?? '',
    fields.github_repo,
    fields.github_default_branch ?? 'main',
    fields.language ?? '',
    fields.production_url ?? null,
    fields.vercel_project_id ?? null,
    fields.last_push_at ?? null,
    fields.issue_count_open ?? 0,
    fields.issue_count_closed ?? 0,
    now,
    now
  );
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project;
}

export function updateProject(id: string, fields: Partial<Project>): Project | null {
  const db = getKanbanDb();
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!existing) return null;

  const sets: string[] = [];
  const params: unknown[] = [];
  const allowed: Array<keyof Project> = [
    'name', 'description', 'github_default_branch', 'language',
    'production_url', 'vercel_project_id', 'last_push_at',
    'issue_count_open', 'issue_count_closed',
  ];
  for (const f of allowed) {
    if (fields[f] !== undefined) {
      sets.push(`${f} = ?`);
      params.push(fields[f]);
    }
  }
  if (sets.length === 0) return getProject(id);
  sets.push("updated_at = datetime('now')");
  params.push(id);
  db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return getProject(id);
}

export function createCardWithGitHub(
  columnId: string,
  boardId: string,
  title: string,
  description: string,
  githubRepo: string,
  githubIssueNumber: number
): Card {
  const db = getKanbanDb();
  const id = randomUUID();
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const maxPos = (db.prepare(
    'SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE column_id = ?'
  ).get(columnId) as { max_pos: number }).max_pos;

  db.prepare(`
    INSERT INTO cards (id, column_id, board_id, title, description, position, priority, labels, created_by, github_repo, github_issue_number, github_synced, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'medium', '[]', 'github-sync', ?, ?, 1, ?, ?)
  `).run(id, columnId, boardId, title, description, maxPos + 1, githubRepo, githubIssueNumber, now, now);

  return db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Card;
}

export function findCardByGitHubIssue(githubRepo: string, issueNumber: number): Card | null {
  const db = getKanbanDb();
  return (db.prepare(
    'SELECT * FROM cards WHERE github_repo = ? AND github_issue_number = ?'
  ).get(githubRepo, issueNumber) as Card | undefined) ?? null;
}
