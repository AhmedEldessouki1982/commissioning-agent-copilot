# commissioning-agent-copilot

Phase 1 of a commissioning multi-agent system: a **sci-fi HUD dashboard** that visualises
the agent architecture, its skills and contracts, and the live pulse traffic between agents.

Phase 1 is **frontend-first** and fully self-contained — it runs on a mock simulator. The
NestJS backend provides a health endpoint plus three specialist AI agents (I&C, Mechanical
and Electrical). In Phase 2 it replaces the simulator as the real pulse/state source over
WebSocket/SSE.

## Structure

```
.
├── frontend/           React + Vite + TypeScript + Tailwind v4 + shadcn/ui + Framer Motion
├── backend/            NestJS API — GET /health + POST /{ic,mech,elec}-agent/ask
└── packages/contract/  @orchestra/contract — shared domain types (types only)
```

The domain contract (`Agent`, `Skill`, `Contract`, `PulseEvent`, …) lives in the
`@orchestra/contract` workspace package (`packages/contract`). It is **types only** — no
runtime code and no build step — and the frontend imports it with `import type`, so nothing
is pulled into the bundle. The backend adopts the same package in Phase 2 instead of
maintaining a duplicate copy.

## Prerequisites

- Node.js >= 20.12
- [pnpm](https://pnpm.io) (repo is pinned to `pnpm@11.7.0` via `packageManager`)

## Getting started

```bash
pnpm install
cp backend/.env.example backend/.env   # then fill in your OpenRouter credentials
pnpm dev            # frontend at http://localhost:5173
pnpm backend:dev    # backend  at http://localhost:3000
```

The backend exposes `GET /health` and allows CORS from `http://localhost:5173`
(override with `FRONTEND_ORIGIN`). It binds to `127.0.0.1` by default; set `HOST`
(e.g. `HOST=0.0.0.0`) to change the bind address. Note that `0.0.0.0` exposes the
API to your LAN — and potentially beyond it — so use it only when intended.

## Backend agents

The backend exposes three specialist commissioning agents, all backed by
[OpenRouter](https://openrouter.ai) through the official `openai` SDK and sharing a single
LLM service and request contract:

| Agent | Route | Scope |
| --- | --- | --- |
| I&C | `POST /ic-agent/ask` | Instrumentation & control loops, interlocks, DCS/SCADA signals |
| Mechanical | `POST /mech-agent/ask` | Rotating equipment, alignment and vibration, flushing, hydrotest |
| Electrical | `POST /elec-agent/ask` | Switchgear, transformers, generator, protection relays, earthing |

Each agent always answers under four headings — Findings / Assumptions / Open items /
References — and never invents tag numbers, setpoints or document numbers. A question
outside an agent's discipline is redirected to the correct agent.

Both variables below are required; the app fails at startup if either is missing
(see `backend/.env.example`):

```
OPENROUTER_API_KEY=
OPENROUTER_MODEL=
```

```bash
curl -s localhost:3000/ic-agent/ask \
  -H 'content-type: application/json' \
  -d '{"message":"What do we check in a 4-20 mA transmitter loop check?"}'
# → { "reply": "...", "model": "..." }
```

All three routes share the same request/response shape (the example above works with any
route). `message` must be a non-empty string of at most 4000 characters; invalid input
returns `400`, and any provider error returns a clean `502` (`AI provider error`) with no
API key or raw error leaked to the client.

## Terminal theme sync

The dashboard adopts the colours and font of the developer's live terminal instead of
hard-coded values. `pnpm theme:sync` auto-detects the source in this order:

1. **kitty** → 2. alacritty → 3. ghostty → 4. foot → 5. wezterm → 6. **pywal**, with a
   built-in Dracula fallback.

It writes `frontend/src/styles/theme.generated.css` and prints the extracted palette.
`pnpm dev` and `pnpm build` run it automatically first, so the UI always matches the
current terminal.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Sync theme + run the frontend dev server |
| `pnpm build` | Sync theme + type-check + build the frontend |
| `pnpm lint` | Lint every workspace package (oxlint + ESLint) |
| `pnpm typecheck` | Type-check every workspace package |
| `pnpm test` | Run every workspace test suite (Vitest + Jest) |
| `pnpm theme:sync` | Regenerate the theme from the terminal palette |
| `pnpm backend:dev` | Run the NestJS backend in watch mode |

Frontend-level: `pnpm --filter frontend lint|test|typecheck|build`.
Backend-level: `pnpm --filter backend lint|test|test:e2e|build`.

## Phase 2 (planned)

- Replace `frontend/src/mock/simulator.ts` with a real WebSocket/SSE transport.
- Backend owns agent state and broadcasts `PulseEvent`s on the shared contract. The
  frontend feeds every received event to `pulseBus.ingest(event)`; `ingest` and the
  simulator's `emit` share one delivery path, and `ingest` preserves the event's
  `id`/`at` untouched (repeat ids are dropped).
- Persist activity log, contracts, and skills.
- Add further specialist agents on the shared `AgentService` / `AgentController` bases.
