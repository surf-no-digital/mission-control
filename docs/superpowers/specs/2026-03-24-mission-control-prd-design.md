# PRD — Surf Command Center (Mission Control)

**Data:** 2026-03-24
**Autor:** Arthur Levi (Orquestrador)
**Aprovado por:** Diogo Felizardo
**Base:** tenacitOS (fork: surf-no-digital/mission-control)
**Abordagem:** Incremental — evoluir o tenacitOS em fases, mantendo upstream sync

---

## 1. Visão Geral

Transformar o tenacitOS em o **hub central da Surf No Digital** — um dashboard que dá visibilidade, controle e gestão sobre todos os agentes IA da empresa, integrações externas e projetos.

**Usuário:** Diogo Felizardo (uso interno/pessoal da empresa)
**Acesso:** Via `cmd.surfnodigital.com.br` (Cloudflare Tunnel)
**Stack:** Next.js 16 + React 19 + Tailwind CSS v4 + SQLite (uso existente) + JSON (kanban/config)

---

## 2. Estrutura de Agentes e Squads

### 2.1 Organograma

```
👤 Diogo Felizardo (CEO)
└── 🏄 Arthur Levi (Orquestrador Principal)
    ├── 🛠️ Squad Tech
    │   ├── Tech Lead — diretrizes técnicas, arquitetura, code review
    │   ├── PM (Product Manager) — roadmap, priorização
    │   ├── PO (Product Owner) — backlog, requisitos, aceite
    │   ├── Dev Full Stack — implementa features (React/Next.js + Node)
    │   ├── UI/UX Designer — desenha telas, protótipos
    │   └── QA — testa tudo, reporta bugs
    └── 📢 Squad Marketing
        ├── Head de Marketing — estratégia + SEO
        ├── Content Creator — blog do Surf Data + copy
        └── Social Media Manager — LinkedIn, posts diários, engajamento
```

### 2.2 Configuração

Arquivo: `data/agents-config.json`

```json
{
  "squads": [
    {
      "id": "tech",
      "name": "Squad Tech",
      "emoji": "🛠️",
      "leadAgentId": "tech-lead"
    },
    {
      "id": "marketing",
      "name": "Squad Marketing",
      "emoji": "📢",
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
      "reportsTo": "diogo",
      "model": "claude-opus-4-6",
      "openclawAgentId": "main",
      "status": "online"
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
      "status": "planned"
    }
  ]
}
```

- `status`: `online` | `offline` | `busy` | `planned` (agente ainda não criado)
- `openclawAgentId`: liga ao agente real no OpenClaw (null = ainda não existe)
- Página **/agents**: visão de organograma + cards individuais com métricas

### 2.3 Página /agents

- **Vista organograma** — árvore visual com squads e hierarquia (já existe `AgentOrganigrama.tsx`, adaptar)
- **Vista cards** — grid de cards com: nome, emoji, squad, status, modelo, custo acumulado (mês), última atividade
- **Filtro por squad** — toggle rápido Tech / Marketing / Todos
- **Status em tempo real** — polling a cada 30s via `/api/agents`

---

## 3. Kanban com Wakeup de Agentes

### 3.1 Conceito

Board estilo Kanban integrado ao OpenClaw. Quando uma issue muda de status, o agente atribuído é notificado automaticamente via wakeup (inspirado no mecanismo do Paperclip).

### 3.2 Colunas

| Coluna | Significado | Ação automática |
|--------|------------|----------------|
| **Backlog** | Ideia registrada | Nenhuma |
| **Todo** | Priorizada pra execução | 🔔 Wakeup do agente atribuído |
| **In Progress** | Agente trabalhando | Agente move automaticamente |
| **In Review** | Aguardando revisão | 🔔 Wakeup do reviewer (Tech Lead ou Diogo) |
| **Done** | Concluído e aceito | Log de conclusão |
| **Cancelled** | Descartada | Nenhuma |

### 3.3 Fluxo de Wakeup

```
[Diogo cria issue] → Backlog
      ↓ (arrasta pra Todo)
[Mission Control detecta status change]
      ↓
[Verifica assigneeAgentId]
      ↓
[Chama API do OpenClaw: sessions_send ao agente]
      ↓ payload:
      {
        "type": "issue_assigned",
        "issueId": "xxx",
        "title": "Implementar página de login",
        "description": "...",
        "priority": "high",
        "project": "segurarn"
      }
      ↓
[Agente recebe, processa, move pra In Progress]
      ↓
[Agente conclui, move pra In Review]
      ↓
[Diogo/Tech Lead revisa → Done ou devolve]
```

### 3.4 Armazenamento

Arquivo: `data/kanban.json`

```json
{
  "issues": [
    {
      "id": "issue-001",
      "title": "Implementar página de login do SeguroRN",
      "description": "Criar tela de login com email/senha + OAuth Google",
      "status": "todo",
      "priority": "high",
      "squad": "tech",
      "assigneeAgentId": "dev-fullstack",
      "project": "segurarn",
      "labels": ["feature", "frontend"],
      "comments": [
        {
          "author": "dev-fullstack",
          "text": "Iniciando implementação...",
          "createdAt": "2026-03-24T10:00:00Z"
        }
      ],
      "createdBy": "diogo",
      "createdAt": "2026-03-24T09:00:00Z",
      "startedAt": null,
      "completedAt": null,
      "updatedAt": "2026-03-24T09:00:00Z"
    }
  ],
  "issueCounter": 1
}
```

- Backup automático: antes de cada escrita, copia pra `data/kanban.backup.json`
- Limite prático: ~1000 issues (suficiente pro volume da empresa)

### 3.5 API Endpoints

| Método | Endpoint | Ação |
|--------|----------|------|
| GET | `/api/kanban` | Lista issues (filtro por status, squad, assignee) |
| POST | `/api/kanban` | Cria issue |
| PATCH | `/api/kanban/:id` | Atualiza issue (status, assignee, etc.) |
| DELETE | `/api/kanban/:id` | Remove issue |
| POST | `/api/kanban/:id/comment` | Adiciona comentário |
| POST | `/api/kanban/:id/wakeup` | Força wakeup manual do agente |

### 3.6 Página /kanban

- **Board view** — drag & drop entre colunas (react-beautiful-dnd ou @dnd-kit)
- **List view** — tabela com filtros e ordenação
- **Modal de issue** — detalhes, comentários, histórico de status, botão de wakeup manual
- **Filtros** — por squad, agente, prioridade, projeto, label
- **Quick create** — criar issue inline na coluna Backlog

---

## 4. Integrações

### 4.1 Arquitetura

Cada integração é um módulo em `src/lib/integrations/<nome>.ts` com interface padrão:

```typescript
interface Integration {
  id: string;
  name: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'needs_auth';
  lastSync: string | null;
  getSummary(): Promise<IntegrationSummary>;
  getDetails(): Promise<IntegrationDetails>;
}
```

Config em `data/integrations.json` (estado/cache). Tokens em `.env.local` (nunca no JSON).

### 4.2 Página /integrations

Card por integração mostrando:
- Status (🟢/🔴/🟡)
- Última sincronização
- Métricas resumidas
- Ação rápida (quando aplicável)

### 4.3 Fases de Implementação

**Fase 1 — Já temos tokens:**

| Integração | Métricas | Ações rápidas |
|-----------|---------|--------------|
| **GitHub** | Repos, PRs abertos, issues, último commit | Ver PRs, criar issue |
| **Vercel** | 11 projetos, status deploy, domínios | Trigger redeploy |
| **Sanity CMS** | Posts publicados, rascunhos, agendados | Ver posts, abrir studio |
| **Cloudflare** | DNS records, tunnels, tráfego | Ver analytics |

**Fase 2 — Precisa configurar:**

| Integração | Métricas | Ações rápidas |
|-----------|---------|--------------|
| **Stripe** | MRR, assinaturas ativas, últimos pagamentos | Ver dashboard |
| **Zoho Mail** | Inbox count, não lidos | Abrir inbox |
| **LinkedIn** | Posts recentes, engajamento | Agendar post |
| **Instagram** | Posts, stories, seguidores | Ver insights |
| **X/Twitter** | Posts, engagement, menções | Agendar post |

**Fase 3 — Explorar:**

| Integração | Métricas | Ações rápidas |
|-----------|---------|--------------|
| **Pencil.dev** | Criativos gerados | Gerar novo criativo |
| **Coolify** | Serviços self-hosted, status | Restart serviço |
| **Google Analytics** | Tráfego, pageviews, sessões | Ver relatório |

### 4.4 Dashboard de Integrations

Widget no dashboard principal (`/`) mostrando resumo:
- Total de integrações conectadas
- Alertas (ex: "Vercel deploy failed", "3 PRs aguardando review")
- Métricas de receita (Stripe MRR quando disponível)

---

## 5. Segurança e Melhorias Técnicas

### 5.1 Correções de Segurança (Fase 1 — obrigatórias)

| Problema | Correção |
|----------|---------|
| Senha comparada em plaintext | Usar bcrypt hash para `ADMIN_PASSWORD` |
| Cookie `mc_auth` = `AUTH_SECRET` literal | Trocar pra JWT assinado com expiração (7 dias) |
| Terminal `/api/terminal` sem rate limit | Adicionar rate limit (10 req/min) |
| File write aceita qualquer path | Bloquear `.secrets/`, `.env*`, paths fora do workspace |
| Sem proteção CSRF | Adicionar token CSRF nas mutations (POST/PATCH/DELETE) |

### 5.2 Melhorias Técnicas (Fase 2)

| Melhoria | Detalhes |
|----------|---------|
| Auto-restart | Script de healthcheck que monitora porta 3366, reinicia se cair |
| Logs estruturados | Substituir `console.error` por logger com timestamp + nível (pino) |
| Cache de API | Cache de 30s para `/api/agents`, `/api/system` (evitar leitura de disco a cada request) |
| i18n PT-BR | Padronizar todos os textos da UI em português brasileiro |
| Branding Surf | Substituir referências ao "Tenacitas" / "🦞" por "Surf No Digital" / "🏄" |

### 5.3 Fora de Escopo (YAGNI)

- Multi-usuário / RBAC
- 2FA / TOTP
- Rate limit global
- SSO / OAuth login
- Banco de dados externo (PostgreSQL, etc.)

---

## 6. Roadmap de Fases

### Fase 1 — Fundação (Semana 1-2)
- [ ] Branding: Surf No Digital em toda a UI, PT-BR
- [ ] Segurança: bcrypt, JWT, CSRF, rate limit no terminal, path validation
- [ ] Agents: config JSON, página /agents com organograma e cards por squad
- [ ] Auto-restart: healthcheck script

### Fase 2 — Kanban (Semana 3-4)
- [ ] API do Kanban (CRUD + comments + wakeup)
- [ ] Página /kanban com board drag & drop + list view
- [ ] Wakeup de agentes via OpenClaw ao mover pra Todo
- [ ] Agente pode atualizar status e comentar via API

### Fase 3 — Integrações Core (Semana 5-6)
- [ ] Módulo base de integrações (interface padrão)
- [ ] GitHub: repos, PRs, issues
- [ ] Vercel: projetos, deploys, status
- [ ] Sanity CMS: posts, rascunhos
- [ ] Cloudflare: DNS, tunnels
- [ ] Página /integrations + widget no dashboard

### Fase 4 — Integrações Expandidas (Semana 7-8)
- [ ] Stripe: MRR, assinaturas, pagamentos
- [ ] Zoho Mail: inbox, contagem
- [ ] LinkedIn, Instagram, X: posts, métricas
- [ ] Pencil.dev, Coolify, Google Analytics

### Fase 5 — Polish (Semana 9-10)
- [ ] Cache de API + performance
- [ ] Logs estruturados (pino)
- [ ] Testes automatizados (endpoints críticos)
- [ ] Documentação de uso

---

## 7. Decisões Técnicas

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Storage do Kanban | JSON file | Volume baixo (<1000 issues), zero dependência externa |
| Storage de integrações | JSON file (cache) + .env.local (tokens) | Separa estado de segredos |
| Drag & drop | @dnd-kit | Mais moderno que react-beautiful-dnd, suporte a React 19 |
| Wakeup de agentes | OpenClaw `sessions_send` | Mecanismo nativo, não precisa de infra extra |
| Autenticação | JWT cookie (httpOnly, sameSite) | Melhor que cookie estático, com expiração |
| Logs | pino | Leve, JSON nativo, bom pra Next.js |
| i18n | Hardcoded PT-BR | Só 1 idioma, não justifica lib de i18n |

---

## 8. Métricas de Sucesso

- **Dashboard carrega em < 2s** com dados reais
- **Wakeup de agente funciona em < 5s** ao mover issue pra Todo
- **Todas as integrações Fase 1 conectadas** e mostrando dados
- **Zero segredos expostos** em código ou logs
- **Diogo consegue gerenciar os agentes** sem abrir terminal

---

*Documento gerado por Arthur Levi. Upstream: carlosazaustre/tenacitOS. Fork: surf-no-digital/mission-control.*
