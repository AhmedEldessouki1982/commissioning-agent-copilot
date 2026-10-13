# commissioning-agent-copilot

Phase 1 of a commissioning multi-agent system: a **sci-fi HUD dashboard** that visualises
the agent architecture, its skills and contracts, and the live pulse traffic between agents.

Phase 1 is **frontend-first** and fully self-contained — it runs on a mock simulator. The
NestJS backend is a scaffold with a single health endpoint; in Phase 2 it replaces the
simulator as the real pulse/state source over WebSocket/SSE.

## Structure

```
.
├── frontend/   React + Vite + TypeScript + Tailwind v4 + shadcn/ui + Framer Motion
└── backend/    NestJS scaffold — GET /health + CORS
```

The domain contract (`Agent`, `Skill`, `Contract`, `PulseEvent`, …) lives in
`frontend/src/types/agents.ts` and is mirrored verbatim in `backend/src/types/agents.ts`.

## Prerequisites

- Node.js >= 20
- [pnpm](https://pnpm.io) (repo is pinned to `pnpm@11.7.0` via `packageManager`)

## Getting started

```bash
pnpm install
pnpm dev            # frontend at http://localhost:5173
pnpm backend:dev    # backend  at http://localhost:3000
```

The backend exposes `GET /health` and allows CORS from `http://localhost:5173`
(override with `FRONTEND_ORIGIN`).

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
| `pnpm theme:sync` | Regenerate the theme from the terminal palette |
| `pnpm backend:dev` | Run the NestJS backend in watch mode |

Frontend-level: `pnpm --filter frontend typecheck`, `pnpm --filter frontend build`.
Backend-level: `pnpm --filter backend lint|test|test:e2e|build`.

## Phase 2 (planned)

- Replace `frontend/src/mock/simulator.ts` with a real WebSocket/SSE transport.
- Backend owns agent state and broadcasts `PulseEvent`s on the shared contract.
- Persist activity log, contracts, and skills.
# commissioning-agent-copilot
