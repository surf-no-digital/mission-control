# Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand tenacitOS to Surf Command Center, fix security vulnerabilities, implement agent/squad config, and set up auto-restart.

**Architecture:** Incremental changes on top of tenacitOS. Branding via env vars + hardcoded string replacements. Security via bcrypt + JWT. Agents config via JSON file read by existing API structure.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, bcrypt, jsonwebtoken, pino

---

## File Structure

### New files to create:
- `src/lib/auth.ts` — bcrypt password verification + JWT sign/verify
- `src/lib/csrf.ts` — CSRF token generation and validation
- `src/lib/logger.ts` — pino logger instance
- `src/lib/agents-config.ts` — read/parse agents-config.json with squad structure
- `data/agents-config.json` — squad and agent definitions
- `scripts/healthcheck.sh` — process health monitor + auto-restart
- `scripts/start.sh` — startup script wrapping next start

### Files to modify:
- `src/app/api/auth/login/route.ts` — bcrypt + JWT cookie
- `src/middleware.ts` — JWT verification instead of string compare
- `src/app/api/terminal/route.ts` — add rate limiting
- `src/app/api/files/write/route.ts` — block sensitive paths
- `src/app/api/files/delete/route.ts` — block sensitive paths
- `src/app/api/agents/route.ts` — merge OpenClaw agents with agents-config.json
- `src/app/(dashboard)/agents/page.tsx` — add squad view + planned agents
- `src/components/AgentOrganigrama.tsx` — adapt for squad hierarchy
- `src/app/(dashboard)/page.tsx` — rebrand strings
- `src/app/login/page.tsx` — PT-BR strings
- `src/app/api/office/route.ts` — rebrand defaults
- `src/app/api/health/route.ts` — remove cazaustre URLs
- `src/app/api/actions/route.ts` — remove cazaustre URLs
- `src/app/api/sessions/route.ts` — rebrand emoji
- `src/app/api/files/workspaces/route.ts` — rebrand defaults
- `src/app/api/system/monitor/route.ts` — rebrand strings
- `src/app/(dashboard)/terminal/page.tsx` — rebrand prompt
- `src/app/(dashboard)/workflows/page.tsx` — PT-BR strings
- `src/app/(dashboard)/sessions/page.tsx` — rebrand emoji
- `src/components/CronJobCard.tsx` — rebrand emoji
- `src/components/CronWeeklyTimeline.tsx` — rebrand
- `src/components/Notepad.tsx` — rebrand storage key
- `src/components/Office3D/Office3D.tsx` — rebrand
- `src/components/Office3D/ProceduralAvatars.tsx` — rebrand
- `.env.local` — add JWT_SECRET, HASHED_PASSWORD

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install security + logging packages**

```bash
cd /home/node/.openclaw/workspace/mission-control
NODE_ENV=development npm install bcryptjs jsonwebtoken pino
NODE_ENV=development npm install -D @types/bcryptjs @types/jsonwebtoken
```

- [ ] **Step 2: Verify packages installed**

```bash
node -e "require('bcryptjs'); require('jsonwebtoken'); require('pino'); console.log('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add bcryptjs, jsonwebtoken, pino dependencies"
```

---

## Task 2: Create auth library (bcrypt + JWT)

**Files:**
- Create: `src/lib/auth.ts`

- [ ] **Step 1: Generate hashed password and JWT secret**

```bash
node -e "
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const hash = bcrypt.hashSync('SurfCommand2026!', 12);
const jwtSecret = crypto.randomBytes(32).toString('base64');
console.log('HASHED_PASSWORD=' + hash);
console.log('JWT_SECRET=' + jwtSecret);
"
```

Save the output values.

- [ ] **Step 2: Add to .env.local**

Append to `.env.local`:
```
HASHED_PASSWORD=<bcrypt hash from step 1>
JWT_SECRET=<jwt secret from step 1>
```

- [ ] **Step 3: Create src/lib/auth.ts**

```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET || 'fallback-dev-secret';
const JWT_EXPIRY = '7d';

export async function verifyPassword(password: string): Promise<boolean> {
  const hashedPassword = process.env.HASHED_PASSWORD;
  if (hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }
  // Fallback to plaintext comparison for backward compatibility
  return password === process.env.ADMIN_PASSWORD;
}

export function signToken(payload: Record<string, unknown> = {}): string {
  return jwt.sign(
    { ...payload, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    return jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts .env.local
git commit -m "feat: add auth library with bcrypt + JWT"
```

---

## Task 3: Update login route to use bcrypt + JWT

**Files:**
- Modify: `src/app/api/auth/login/route.ts`

- [ ] **Step 1: Replace password check and cookie logic**

In `src/app/api/auth/login/route.ts`, replace:
```typescript
if (password === process.env.ADMIN_PASSWORD) {
```

With:
```typescript
import { verifyPassword, signToken } from '@/lib/auth';
```
(add at top of file)

Replace the entire `if (password === process.env.ADMIN_PASSWORD) { ... }` block with:

```typescript
  const isValid = await verifyPassword(password);

  if (isValid) {
    clearAttempts(ip);

    const token = signToken({ ip });
    const isSecure = process.env.FORCE_INSECURE_COOKIES !== "true" &&
      process.env.NODE_ENV === "production";

    const response = NextResponse.json({ success: true });
    response.cookies.set("mc_auth", token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  }
```

Remove the old `FORCE_INSECURE_COOKIES` block and the old `AUTH_SECRET` cookie set.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/login/route.ts
git commit -m "feat: login uses bcrypt verification + JWT cookie"
```

---

## Task 4: Update middleware to verify JWT

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Replace isAuthenticated function**

Replace:
```typescript
function isAuthenticated(request: NextRequest): boolean {
  const authCookie = request.cookies.get("mc_auth");
  return !!(authCookie && authCookie.value === process.env.AUTH_SECRET);
}
```

With:
```typescript
import jwt from 'jsonwebtoken';

function isAuthenticated(request: NextRequest): boolean {
  const authCookie = request.cookies.get("mc_auth");
  if (!authCookie?.value) return false;

  try {
    const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET || 'fallback-dev-secret';
    jwt.verify(authCookie.value, secret);
    return true;
  } catch {
    return false;
  }
}
```

Note: middleware runs on edge, so we use `jsonwebtoken` directly here. If edge runtime issues occur, consider using `jose` library instead.

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: middleware verifies JWT token instead of static string"
```

---

## Task 5: Add rate limiting to terminal API

**Files:**
- Modify: `src/app/api/terminal/route.ts`

- [ ] **Step 1: Add rate limiter to terminal route**

Add at the top of `src/app/api/terminal/route.ts` (after imports):

```typescript
// Rate limiting: 10 requests per minute per IP
const TERMINAL_MAX_REQUESTS = 10;
const TERMINAL_WINDOW_MS = 60 * 1000;
const terminalRequests = new Map<string, { count: number; windowStart: number }>();

function checkTerminalRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = terminalRequests.get(ip);

  if (!record || now - record.windowStart > TERMINAL_WINDOW_MS) {
    terminalRequests.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (record.count >= TERMINAL_MAX_REQUESTS) return false;

  record.count++;
  return true;
}
```

Add at the start of the POST handler (before command parsing):

```typescript
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkTerminalRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 10 commands per minute.' },
        { status: 429 }
      );
    }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/terminal/route.ts
git commit -m "feat: add rate limiting to terminal API (10 req/min)"
```

---

## Task 6: Block sensitive paths in file write/delete APIs

**Files:**
- Modify: `src/app/api/files/write/route.ts`
- Modify: `src/app/api/files/delete/route.ts`

- [ ] **Step 1: Add blocked paths to write route**

In `src/app/api/files/write/route.ts`, add after the path traversal check (`if (!fullPath.startsWith(base))`):

```typescript
    // Block sensitive paths
    const BLOCKED_WRITE_PATTERNS = ['.secrets', '.env', 'node_modules', '.git/'];
    const relativePath = fullPath.replace(base, '');
    if (BLOCKED_WRITE_PATTERNS.some(p => relativePath.includes(p))) {
      return NextResponse.json({ error: 'Cannot write to protected path' }, { status: 403 });
    }
```

- [ ] **Step 2: Add same protection to delete route**

In `src/app/api/files/delete/route.ts`, add the same block after the path traversal check.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/files/write/route.ts src/app/api/files/delete/route.ts
git commit -m "feat: block sensitive paths (.secrets, .env) from file write/delete APIs"
```

---

## Task 7: Rebrand — replace all tenacitOS/Tenacitas references

**Files:** ~20 files (see file list above)

- [ ] **Step 1: Login page — PT-BR**

In `src/app/login/page.tsx`:
- Replace `🦞` with `🏄`
- Replace `"Contraseña incorrecta"` with `"Senha incorreta"`
- Replace `"Error de conexión"` with `"Erro de conexão"`
- Replace `"Introduce la contraseña para acceder"` with `"Digite a senha para acessar"`
- Replace `"Contraseña"` (placeholder) with `"Senha"`
- Replace `"Tenacitas Agent Dashboard"` with `"Surf Command Center"`

- [ ] **Step 2: Dashboard page**

In `src/app/(dashboard)/page.tsx`:
- Replace `🦞 Mission Control` with `🏄 Surf Command Center`
- Replace `"Overview of Tenacitas agent activity"` with `"Visão geral da atividade dos agentes"`

- [ ] **Step 3: Terminal prompt**

In `src/app/(dashboard)/terminal/page.tsx`:
- Replace `tenacitas@srv` with `surf@cmd`

- [ ] **Step 4: Session and API defaults**

In `src/app/(dashboard)/sessions/page.tsx`:
- Replace `{ id: "main", label: "Main", emoji: "🦞" }` with `{ id: "main", label: "Main", emoji: "🏄" }`

In `src/app/api/sessions/route.ts`:
- Replace `🦞` with `🏄`

In `src/app/api/office/route.ts`:
- Replace `main: { emoji: "🦞", color: "#ff6b35", name: "Tenacitas", role: "Boss" }` with `main: { emoji: "🏄", color: "#0ea5e9", name: "Arthur Levi", role: "Orquestrador" }`

In `src/app/api/files/workspaces/route.ts`:
- Replace `'🦞'` with `'🏄'`
- Replace `'Tenacitas'` with `'Arthur Levi'`

In `src/app/api/system/monitor/route.ts`:
- Replace `"Mission Control – Tenacitas Dashboard"` with `"Surf Command Center"`

In `src/app/api/health/route.ts`:
- Remove or replace `tenacitas.cazaustre.dev` health check with `cmd.surfnodigital.com.br`

In `src/app/api/actions/route.ts`:
- Replace `tenacitas.cazaustre.dev` URL with `cmd.surfnodigital.com.br`

- [ ] **Step 5: Components**

In `src/components/CronJobCard.tsx`:
- Replace `main: "🦞"` with `main: "🏄"`

In `src/components/CronWeeklyTimeline.tsx`:
- Replace `main: "🦞"` with `main: "🏄"`
- Replace `"#FFCC02"` (TenacitOS accent) with `"#0ea5e9"` (Surf blue)

In `src/components/Notepad.tsx`:
- Replace `"tenacitas-notepad"` with `"surf-notepad"`

In `src/components/Office3D/Office3D.tsx`:
- Replace `"Phase 0: TenacitOS Shell"` with `"Surf Command Center"`

In `src/components/Office3D/ProceduralAvatars.tsx`:
- Replace `// Cangrejo 3D (Tenacitas)` with `// Avatar 3D (Arthur Levi)`

- [ ] **Step 6: Workflows page — PT-BR**

In `src/app/(dashboard)/workflows/page.tsx`:
- Replace Spanish strings with PT-BR equivalents
- Replace `"Tenacitas"` references with `"Arthur Levi"`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: rebrand tenacitOS → Surf Command Center, PT-BR"
```

---

## Task 8: Create agents config with squads

**Files:**
- Create: `data/agents-config.json`
- Create: `src/lib/agents-config.ts`

- [ ] **Step 1: Create data/agents-config.json**

```json
{
  "squads": [
    {
      "id": "tech",
      "name": "Squad Tech",
      "emoji": "🛠️",
      "color": "#3b82f6",
      "leadAgentId": "tech-lead"
    },
    {
      "id": "marketing",
      "name": "Squad Marketing",
      "emoji": "📢",
      "color": "#f59e0b",
      "leadAgentId": "head-marketing"
    }
  ],
  "agents": [
    {
      "id": "arthur-levi",
      "name": "Arthur Levi",
      "emoji": "🏄",
      "role": "Orquestrador Principal",
      "squad": null,
      "reportsTo": null,
      "model": "claude-opus-4-6",
      "openclawAgentId": "main",
      "status": "online",
      "color": "#0ea5e9"
    },
    {
      "id": "tech-lead",
      "name": "Tech Lead",
      "emoji": "🧑‍💻",
      "role": "Diretrizes técnicas, arquitetura, code review",
      "squad": "tech",
      "reportsTo": "arthur-levi",
      "model": "claude-sonnet-4-5",
      "openclawAgentId": null,
      "status": "planned",
      "color": "#6366f1"
    },
    {
      "id": "pm",
      "name": "PM",
      "emoji": "📋",
      "role": "Roadmap, priorização de features",
      "squad": "tech",
      "reportsTo": "arthur-levi",
      "model": "claude-sonnet-4-5",
      "openclawAgentId": null,
      "status": "planned",
      "color": "#8b5cf6"
    },
    {
      "id": "po",
      "name": "PO",
      "emoji": "✅",
      "role": "Backlog, requisitos, critérios de aceite",
      "squad": "tech",
      "reportsTo": "arthur-levi",
      "model": "claude-sonnet-4-5",
      "openclawAgentId": null,
      "status": "planned",
      "color": "#14b8a6"
    },
    {
      "id": "dev-fullstack",
      "name": "Dev Full Stack",
      "emoji": "💻",
      "role": "Implementação de features (React/Next.js + Node)",
      "squad": "tech",
      "reportsTo": "tech-lead",
      "model": "claude-sonnet-4-5",
      "openclawAgentId": null,
      "status": "planned",
      "color": "#22c55e"
    },
    {
      "id": "ui-ux-designer",
      "name": "UI/UX Designer",
      "emoji": "🎨",
      "role": "Design de telas, protótipos, design system",
      "squad": "tech",
      "reportsTo": "tech-lead",
      "model": "claude-sonnet-4-5",
      "openclawAgentId": null,
      "status": "planned",
      "color": "#ec4899"
    },
    {
      "id": "qa",
      "name": "QA",
      "emoji": "🔍",
      "role": "Testes, reporte de bugs, qualidade",
      "squad": "tech",
      "reportsTo": "tech-lead",
      "model": "claude-haiku-3-5",
      "openclawAgentId": null,
      "status": "planned",
      "color": "#f97316"
    },
    {
      "id": "head-marketing",
      "name": "Head de Marketing",
      "emoji": "📈",
      "role": "Estratégia de marketing + SEO",
      "squad": "marketing",
      "reportsTo": "arthur-levi",
      "model": "claude-sonnet-4-5",
      "openclawAgentId": null,
      "status": "planned",
      "color": "#eab308"
    },
    {
      "id": "content-creator",
      "name": "Content Creator",
      "emoji": "✍️",
      "role": "Blog do Surf Data + copywriting",
      "squad": "marketing",
      "reportsTo": "head-marketing",
      "model": "claude-sonnet-4-5",
      "openclawAgentId": null,
      "status": "planned",
      "color": "#a855f7"
    },
    {
      "id": "social-media-manager",
      "name": "Social Media Manager",
      "emoji": "📱",
      "role": "LinkedIn, posts diários, engajamento",
      "squad": "marketing",
      "reportsTo": "head-marketing",
      "model": "claude-haiku-3-5",
      "openclawAgentId": null,
      "status": "planned",
      "color": "#06b6d4"
    }
  ]
}
```

- [ ] **Step 2: Create src/lib/agents-config.ts**

```typescript
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface SquadConfig {
  id: string;
  name: string;
  emoji: string;
  color: string;
  leadAgentId: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  emoji: string;
  role: string;
  squad: string | null;
  reportsTo: string | null;
  model: string;
  openclawAgentId: string | null;
  status: 'online' | 'offline' | 'busy' | 'planned';
  color: string;
}

interface AgentsConfigFile {
  squads: SquadConfig[];
  agents: AgentConfig[];
}

const CONFIG_PATH = join(process.cwd(), 'data', 'agents-config.json');

let cachedConfig: AgentsConfigFile | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000; // 30 seconds

export function getAgentsConfig(): AgentsConfigFile {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL) {
    return cachedConfig;
  }

  if (!existsSync(CONFIG_PATH)) {
    return { squads: [], agents: [] };
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    cachedConfig = JSON.parse(raw) as AgentsConfigFile;
    cacheTimestamp = now;
    return cachedConfig;
  } catch {
    return { squads: [], agents: [] };
  }
}

export function getSquads(): SquadConfig[] {
  return getAgentsConfig().squads;
}

export function getAgentsList(): AgentConfig[] {
  return getAgentsConfig().agents;
}

export function getAgentById(id: string): AgentConfig | undefined {
  return getAgentsConfig().agents.find(a => a.id === id);
}

export function getAgentsBySquad(squadId: string): AgentConfig[] {
  return getAgentsConfig().agents.filter(a => a.squad === squadId);
}

export function getOrgTree(): {
  orchestrator: AgentConfig | undefined;
  squads: Array<SquadConfig & { agents: AgentConfig[] }>;
} {
  const config = getAgentsConfig();
  const orchestrator = config.agents.find(a => a.squad === null && a.reportsTo === null);

  const squads = config.squads.map(squad => ({
    ...squad,
    agents: config.agents.filter(a => a.squad === squad.id),
  }));

  return { orchestrator, squads };
}
```

- [ ] **Step 3: Commit**

```bash
git add data/agents-config.json src/lib/agents-config.ts
git commit -m "feat: add agents config with squads (Tech + Marketing)"
```

---

## Task 9: Update agents API to merge config with OpenClaw

**Files:**
- Modify: `src/app/api/agents/route.ts`

- [ ] **Step 1: Add agents-config merge**

Add import at top:
```typescript
import { getAgentsConfig, getOrgTree } from '@/lib/agents-config';
```

At the end of the GET handler, after building the agents array from `openclaw.json`, merge with `agents-config.json`:

```typescript
    // Merge with agents-config.json (squads + planned agents)
    const agentsConfig = getAgentsConfig();

    // Enrich existing OpenClaw agents with config data
    const enrichedAgents = agents.map((agent: Agent) => {
      const configAgent = agentsConfig.agents.find(
        (a) => a.openclawAgentId === agent.id
      );
      if (configAgent) {
        return {
          ...agent,
          configId: configAgent.id,
          role: configAgent.role,
          squad: configAgent.squad,
          reportsTo: configAgent.reportsTo,
          emoji: configAgent.emoji || agent.emoji,
          color: configAgent.color || agent.color,
          name: configAgent.name || agent.name,
        };
      }
      return agent;
    });

    // Add planned agents not yet in OpenClaw
    const plannedAgents = agentsConfig.agents
      .filter((a) => a.status === 'planned')
      .map((a) => ({
        id: a.id,
        configId: a.id,
        name: a.name,
        emoji: a.emoji,
        color: a.color,
        model: a.model,
        workspace: '',
        role: a.role,
        squad: a.squad,
        reportsTo: a.reportsTo,
        status: 'planned' as const,
        lastActivity: undefined,
        activeSessions: 0,
      }));

    const allAgents = [...enrichedAgents, ...plannedAgents];
```

Replace the final `res.json({ agents })` with:
```typescript
    return NextResponse.json({
      agents: allAgents,
      squads: agentsConfig.squads,
      orgTree: getOrgTree(),
    });
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/agents/route.ts
git commit -m "feat: agents API merges OpenClaw agents with squad config"
```

---

## Task 10: Update agents page with squad view

**Files:**
- Modify: `src/app/(dashboard)/agents/page.tsx`

- [ ] **Step 1: Add squad filter and planned agent support**

Update the Agent interface to include new fields:
```typescript
interface Agent {
  id: string;
  configId?: string;
  name: string;
  emoji: string;
  color: string;
  model: string;
  workspace: string;
  role?: string;
  squad?: string | null;
  reportsTo?: string | null;
  status: "online" | "offline" | "planned";
  lastActivity?: string;
  activeSessions: number;
}

interface Squad {
  id: string;
  name: string;
  emoji: string;
  color: string;
}
```

Add squad state and filter:
```typescript
const [squads, setSquads] = useState<Squad[]>([]);
const [squadFilter, setSquadFilter] = useState<string | null>(null);
```

Update fetchAgents to read squads:
```typescript
const data = await res.json();
setAgents(data.agents || []);
setSquads(data.squads || []);
```

Add squad filter tabs above the cards:
```tsx
<div className="flex gap-2 mb-4">
  <button
    onClick={() => setSquadFilter(null)}
    className={`px-3 py-1 rounded-lg text-sm ${!squadFilter ? 'bg-blue-600 text-white' : ''}`}
    style={!squadFilter ? {} : { background: 'var(--card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
  >
    Todos
  </button>
  {squads.map(s => (
    <button
      key={s.id}
      onClick={() => setSquadFilter(s.id)}
      className={`px-3 py-1 rounded-lg text-sm`}
      style={squadFilter === s.id
        ? { background: s.color, color: 'white' }
        : { background: 'var(--card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
      }
    >
      {s.emoji} {s.name}
    </button>
  ))}
</div>
```

Filter agents in render:
```typescript
const filteredAgents = squadFilter
  ? agents.filter(a => a.squad === squadFilter)
  : agents;
```

Add "Planejado" badge for planned agents in the card:
```tsx
{agent.status === 'planned' && (
  <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--warning)', color: '#000' }}>
    Planejado
  </span>
)}
```

Add role display in each card:
```tsx
{agent.role && (
  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{agent.role}</p>
)}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(dashboard)/agents/page.tsx"
git commit -m "feat: agents page with squad filter + planned agents"
```

---

## Task 11: Create healthcheck and auto-restart scripts

**Files:**
- Create: `scripts/healthcheck.sh`
- Create: `scripts/start.sh`

- [ ] **Step 1: Create scripts/start.sh**

```bash
#!/bin/bash
# Surf Command Center — start script
# Usage: ./scripts/start.sh

cd "$(dirname "$0")/.."
PORT=${PORT:-3366}

echo "🏄 Starting Surf Command Center on port $PORT..."
NODE_ENV=production exec npx next start -H 0.0.0.0 -p "$PORT"
```

- [ ] **Step 2: Create scripts/healthcheck.sh**

```bash
#!/bin/bash
# Surf Command Center — healthcheck + auto-restart
# Usage: run via cron every minute
# */1 * * * * /home/node/.openclaw/workspace/mission-control/scripts/healthcheck.sh

PORT=${PORT:-3366}
LOG="/tmp/mission-control-health.log"
MC_DIR="/home/node/.openclaw/workspace/mission-control"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:$PORT/api/health" 2>/dev/null)

if [ "$HTTP_CODE" != "200" ]; then
  echo "[$(date -u)] UNHEALTHY (HTTP $HTTP_CODE) — restarting..." >> "$LOG"

  # Kill any existing process
  pkill -f "next start.*$PORT" 2>/dev/null
  sleep 2

  # Restart
  cd "$MC_DIR"
  NODE_ENV=production PORT=$PORT nohup npx next start -H 0.0.0.0 -p "$PORT" >> /tmp/mission-control.log 2>&1 &

  echo "[$(date -u)] Restarted (PID $!)" >> "$LOG"
else
  # Log healthy check every 10 minutes (not every minute)
  MINUTE=$(date +%M)
  if [ $((MINUTE % 10)) -eq 0 ]; then
    echo "[$(date -u)] HEALTHY" >> "$LOG"
  fi
fi
```

- [ ] **Step 3: Make scripts executable**

```bash
chmod +x scripts/start.sh scripts/healthcheck.sh
```

- [ ] **Step 4: Commit**

```bash
git add scripts/
git commit -m "feat: add healthcheck + auto-restart scripts"
```

---

## Task 12: Build, test, and push

- [ ] **Step 1: Rebuild**

```bash
cd /home/node/.openclaw/workspace/mission-control
NODE_ENV=development npm run build
```

Verify: build succeeds with no errors.

- [ ] **Step 2: Restart and test login**

```bash
pkill -f "next start" 2>/dev/null
sleep 2
PORT=3366 NODE_ENV=production nohup npx next start -H 0.0.0.0 -p 3366 > /tmp/mission-control.log 2>&1 &
sleep 3
# Test login
curl -s -X POST http://localhost:3366/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"SurfCommand2026!"}' | head -c 200
```

Verify: response contains `{"success":true}` and a `Set-Cookie` header with a JWT.

- [ ] **Step 3: Test agents API**

```bash
# Get auth cookie first, then test agents
TOKEN=$(curl -s -X POST http://localhost:3366/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"SurfCommand2026!"}' -c - | grep mc_auth | awk '{print $NF}')

curl -s -b "mc_auth=$TOKEN" http://localhost:3366/api/agents | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'Agents: {len(d.get(\"agents\",[]))}')
print(f'Squads: {len(d.get(\"squads\",[]))}')
for a in d.get('agents',[]):
    print(f'  {a[\"emoji\"]} {a[\"name\"]} ({a.get(\"squad\",\"—\")}) [{a[\"status\"]}]')
"
```

Verify: shows 10 agents (1 online + 9 planned) in 2 squads.

- [ ] **Step 4: Create feature branch and push**

```bash
git checkout -b feature/phase1-foundation
git push origin feature/phase1-foundation
```

Then create PR to `preview` branch.

- [ ] **Step 5: Final commit tag**

```bash
git tag v0.2.0-phase1
git push origin v0.2.0-phase1
```

---

## Summary

| Task | Description | Estimated Time |
|------|-------------|---------------|
| 1 | Install dependencies | 2 min |
| 2 | Auth library (bcrypt + JWT) | 5 min |
| 3 | Update login route | 5 min |
| 4 | Update middleware (JWT verify) | 3 min |
| 5 | Terminal rate limiting | 3 min |
| 6 | Block sensitive file paths | 3 min |
| 7 | Rebrand → Surf Command Center PT-BR | 15 min |
| 8 | Agents config with squads | 5 min |
| 9 | Agents API merge | 5 min |
| 10 | Agents page squad view | 10 min |
| 11 | Healthcheck + auto-restart | 5 min |
| 12 | Build, test, push | 10 min |
| **Total** | | **~70 min** |
