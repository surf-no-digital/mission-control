# Phase 2: Kanban (Trello-like) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Trello-like Kanban system with boards, customizable columns, cards with attachments/comments/mentions, drag & drop, and agent wakeup on status change.

**Architecture:** SQLite database (better-sqlite3, already installed) + REST API + React frontend with @dnd-kit for drag & drop. DB stored in persistent `data/kanban.db`. Attachments stored in `data/attachments/`.

**Tech Stack:** Next.js 16, React 19, better-sqlite3, @dnd-kit/core + @dnd-kit/sortable, Tailwind CSS v4

---

## Database Schema

### boards
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| name | TEXT NOT NULL | Board name |
| description | TEXT | Board description |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### columns
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| board_id | TEXT FK | References boards.id |
| name | TEXT NOT NULL | Column name (Backlog, Todo, etc.) |
| position | INTEGER | Order in board |
| color | TEXT | Column accent color |
| wakeup_on_enter | INTEGER | 1 = trigger agent wakeup when card enters |
| created_at | TEXT | ISO timestamp |

### cards
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| column_id | TEXT FK | References columns.id |
| board_id | TEXT FK | References boards.id |
| title | TEXT NOT NULL | Card title |
| description | TEXT | Markdown description |
| position | INTEGER | Order in column |
| priority | TEXT | low/medium/high/urgent |
| assignee_agent_id | TEXT | Agent ID from agents-config |
| labels | TEXT | JSON array of label strings |
| due_date | TEXT | ISO date |
| created_by | TEXT | Who created (diogo/agent-id) |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### card_comments
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| card_id | TEXT FK | References cards.id |
| author_id | TEXT | diogo or agent-id |
| author_name | TEXT | Display name |
| body | TEXT | Markdown comment |
| mentions | TEXT | JSON array of mentioned agent IDs |
| created_at | TEXT | ISO timestamp |

### card_attachments
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| card_id | TEXT FK | References cards.id |
| filename | TEXT | Original filename |
| filepath | TEXT | Path in data/attachments/ |
| mimetype | TEXT | MIME type |
| size | INTEGER | File size in bytes |
| uploaded_by | TEXT | Who uploaded |
| created_at | TEXT | ISO timestamp |

### card_activity
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| card_id | TEXT FK | References cards.id |
| actor_id | TEXT | Who did it |
| action | TEXT | moved/commented/assigned/created/etc |
| details | TEXT | JSON with context |
| created_at | TEXT | ISO timestamp |

---

## File Structure

### New files:
- `src/lib/kanban-db.ts` — DB init, migrations, all queries
- `src/app/api/kanban/boards/route.ts` — GET (list) / POST (create)
- `src/app/api/kanban/boards/[id]/route.ts` — GET / PATCH / DELETE
- `src/app/api/kanban/boards/[id]/columns/route.ts` — GET / POST
- `src/app/api/kanban/boards/[id]/columns/reorder/route.ts` — PATCH
- `src/app/api/kanban/columns/[id]/route.ts` — PATCH / DELETE
- `src/app/api/kanban/cards/route.ts` — POST (create card)
- `src/app/api/kanban/cards/[id]/route.ts` — GET / PATCH / DELETE
- `src/app/api/kanban/cards/[id]/move/route.ts` — PATCH (move card)
- `src/app/api/kanban/cards/[id]/comments/route.ts` — GET / POST
- `src/app/api/kanban/cards/[id]/attachments/route.ts` — GET / POST
- `src/app/api/kanban/cards/[id]/attachments/[attachmentId]/route.ts` — GET (download) / DELETE
- `src/app/(dashboard)/kanban/page.tsx` — Board list page
- `src/app/(dashboard)/kanban/[id]/page.tsx` — Board view with columns + cards
- `src/components/kanban/BoardView.tsx` — Main board with DnD
- `src/components/kanban/KanbanColumn.tsx` — Single column
- `src/components/kanban/KanbanCard.tsx` — Card in column
- `src/components/kanban/CardModal.tsx` — Card detail modal (description, comments, attachments, activity)
- `src/components/kanban/CardComments.tsx` — Comments section
- `src/components/kanban/CardAttachments.tsx` — Attachments section
- `src/components/kanban/NewCardForm.tsx` — Inline card creation
- `src/components/kanban/NewColumnForm.tsx` — Add column
- `src/components/kanban/BoardHeader.tsx` — Board name, description, actions
- `src/lib/kanban-wakeup.ts` — Agent wakeup logic on card move

### Files to modify:
- `src/components/Sidebar.tsx` — Add Kanban link
- `package.json` — Add @dnd-kit dependencies

---

## Task 1: Install @dnd-kit dependencies

- [ ] Install packages:
```bash
cd /home/node/.openclaw/workspace/mission-control
NODE_ENV=development npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] Commit:
```bash
git add package.json package-lock.json
git commit -m "chore: add @dnd-kit for kanban drag and drop"
```

---

## Task 2: Create kanban database module

**Files:**
- Create: `src/lib/kanban-db.ts`

Create the SQLite database module with:
- `getKanbanDb()` — opens/creates `data/kanban.db`, runs migrations
- All CRUD functions for boards, columns, cards, comments, attachments, activity
- Default board creation on first run ("Surf No Digital" with columns: Backlog, Todo, In Progress, In Review, Done)

The DB path MUST be: `path.join(process.cwd(), 'data', 'kanban.db')` — this is inside the persistent workspace volume.

Key functions:
```typescript
// Boards
listBoards(): Board[]
createBoard(name, description?): Board
getBoard(id): Board | null
updateBoard(id, fields): Board | null
deleteBoard(id): boolean

// Columns
listColumns(boardId): Column[]
createColumn(boardId, name, position, color?, wakeupOnEnter?): Column
updateColumn(id, fields): Column | null
deleteColumn(id): boolean
reorderColumns(boardId, columnIds: string[]): void

// Cards
listCards(boardId, filters?): Card[]
getCard(id): Card | null (with comments count, attachments count)
createCard(columnId, boardId, title, fields?): Card
updateCard(id, fields): Card | null
deleteCard(id): boolean
moveCard(id, targetColumnId, position): { card: Card, wakeup: boolean, previousColumnId: string }

// Comments
listComments(cardId): Comment[]
addComment(cardId, authorId, authorName, body, mentions?): Comment

// Attachments
listAttachments(cardId): Attachment[]
addAttachment(cardId, filename, filepath, mimetype, size, uploadedBy): Attachment
deleteAttachment(id): Attachment | null

// Activity
listActivity(cardId): Activity[]
logActivity(cardId, actorId, action, details?): void
```

On `moveCard`: if the target column has `wakeup_on_enter = 1` and the card has an `assignee_agent_id`, return `wakeup: true` so the API layer can trigger the wakeup.

Commit: `git commit -m "feat: kanban SQLite database module with full CRUD"`

---

## Task 3: Create kanban API routes — Boards + Columns

**Files:**
- Create: `src/app/api/kanban/boards/route.ts`
- Create: `src/app/api/kanban/boards/[id]/route.ts`
- Create: `src/app/api/kanban/boards/[id]/columns/route.ts`
- Create: `src/app/api/kanban/boards/[id]/columns/reorder/route.ts`
- Create: `src/app/api/kanban/columns/[id]/route.ts`

Standard REST endpoints. All return JSON. Use `getKanbanDb()` from kanban-db.ts.

Commit: `git commit -m "feat: kanban API routes for boards and columns"`

---

## Task 4: Create kanban API routes — Cards + Move + Wakeup

**Files:**
- Create: `src/app/api/kanban/cards/route.ts`
- Create: `src/app/api/kanban/cards/[id]/route.ts`
- Create: `src/app/api/kanban/cards/[id]/move/route.ts`
- Create: `src/lib/kanban-wakeup.ts`

The move endpoint (`PATCH /api/kanban/cards/[id]/move`) must:
1. Call `moveCard()` from kanban-db
2. If `wakeup: true`, call the wakeup logic
3. Log the move in card_activity

`kanban-wakeup.ts`:
```typescript
export async function wakeupAgent(agentId: string, card: Card, fromColumn: string, toColumn: string) {
  // Uses OpenClaw CLI or internal API to send message to agent
  // execSync(`openclaw sessions send ...`) or HTTP to gateway
  // Message includes card context: title, description, priority, column
}
```

Commit: `git commit -m "feat: kanban API routes for cards with move + agent wakeup"`

---

## Task 5: Create kanban API routes — Comments + Attachments

**Files:**
- Create: `src/app/api/kanban/cards/[id]/comments/route.ts`
- Create: `src/app/api/kanban/cards/[id]/attachments/route.ts`
- Create: `src/app/api/kanban/cards/[id]/attachments/[attachmentId]/route.ts`

Comments: GET list, POST create (with @mention parsing from body)
Attachments: GET list, POST upload (multipart/form-data, save to `data/attachments/<cardId>/`), GET download, DELETE

Commit: `git commit -m "feat: kanban API routes for comments and attachments"`

---

## Task 6: Create Kanban board list page + sidebar link

**Files:**
- Create: `src/app/(dashboard)/kanban/page.tsx`
- Modify: `src/components/Sidebar.tsx`

Board list page shows all boards with:
- Board name, description, card count, last activity
- "Novo Board" button
- Click to open board

Add "Kanban" link to sidebar with `Kanban` icon between "Activity" and "Memory".

Commit: `git commit -m "feat: kanban board list page + sidebar link"`

---

## Task 7: Create Kanban board view with drag & drop

**Files:**
- Create: `src/app/(dashboard)/kanban/[id]/page.tsx`
- Create: `src/components/kanban/BoardView.tsx`
- Create: `src/components/kanban/BoardHeader.tsx`
- Create: `src/components/kanban/KanbanColumn.tsx`
- Create: `src/components/kanban/KanbanCard.tsx`
- Create: `src/components/kanban/NewCardForm.tsx`
- Create: `src/components/kanban/NewColumnForm.tsx`

Main board view:
- Horizontal scrollable columns
- Cards show: title, priority badge, assignee emoji, labels, attachment/comment count icons
- Drag cards between columns (updates position + triggers move API)
- Drag columns to reorder
- Inline "+" to add card at bottom of column
- "+" button to add new column
- Column header: name, card count, edit/delete menu

Use @dnd-kit/core + @dnd-kit/sortable for DnD.

Commit: `git commit -m "feat: kanban board view with drag and drop columns + cards"`

---

## Task 8: Create Card detail modal

**Files:**
- Create: `src/components/kanban/CardModal.tsx`
- Create: `src/components/kanban/CardComments.tsx`
- Create: `src/components/kanban/CardAttachments.tsx`

Modal opens when clicking a card. Shows:
- Title (editable inline)
- Description (markdown editor, editable)
- Column / Status indicator
- Priority selector (low/medium/high/urgent with colors)
- Assignee selector (dropdown of agents from agents-config)
- Labels (tag input)
- Due date picker
- Attachments section (upload button, file list with download/delete)
- Comments section (text input with @mention autocomplete for agents, comment list)
- Activity log (timeline of all changes)
- Delete card button

All changes save immediately via API (no save button).

Commit: `git commit -m "feat: kanban card detail modal with comments, attachments, activity"`

---

## Task 9: Build, test, push

- [ ] Build:
```bash
rm -rf .next && NODE_ENV=production npm run build
```

- [ ] Test endpoints:
```bash
# Create board, create card, move card, add comment
curl -s -X POST .../api/kanban/boards -d '{"name":"Test"}' 
```

- [ ] Restart server and verify UI

- [ ] Commit any fixes and push:
```bash
git push origin feature/phase1-foundation
```

---

## Summary

| Task | Description | Est. Time |
|------|-------------|-----------|
| 1 | Install @dnd-kit | 2 min |
| 2 | Kanban DB module (SQLite) | 15 min |
| 3 | API: Boards + Columns | 10 min |
| 4 | API: Cards + Move + Wakeup | 10 min |
| 5 | API: Comments + Attachments | 10 min |
| 6 | Board list page + sidebar | 5 min |
| 7 | Board view with DnD | 20 min |
| 8 | Card detail modal | 20 min |
| 9 | Build, test, push | 10 min |
| **Total** | | **~100 min** |
