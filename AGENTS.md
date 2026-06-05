# AGENTS.md

Guidance for AI agents working in this repository (**varejosync** / P38 ERP — Vite + React + Base44).

## Cursor Cloud specific instructions

### Stack

- **Package manager:** npm (`package-lock.json`). Use **`npm ci`** at repo root on VM startup (not `npm install`) so lockfile stays authoritative.
- **Node:** CI uses Node 22; local VMs should match (no `engines` field in `package.json`).
- **App:** Single Vite SPA (`npm run dev` → default **http://localhost:5173**). Backend for production-like flows is **hosted Base44** (`p38.base44.app`), not started from this repo.

### Commands (see `package.json`)

| Goal | Command |
|------|---------|
| Dev server | `npm run dev` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Production build | `npm run build` |
| Preview build | `npm run preview` |

There is **no** `test` script; E2E is manual / migration checklists under `docs/migration/`.

### Starting the dev server

Use a **tmux** session so the server survives backgrounding:

```bash
SESSION_NAME="vite-dev-server"
tmux -f /exec-daemon/tmux.portal.conf has-session -t "=$SESSION_NAME" 2>/dev/null \
  || tmux -f /exec-daemon/tmux.portal.conf new-session -d -s "$SESSION_NAME" -c "/workspace" -- "${SHELL:-bash}" -l
tmux -f /exec-daemon/tmux.portal.conf send-keys -t "$SESSION_NAME:0.0" 'cd /workspace && npm run dev' C-m
```

Vite binds to **localhost:5173** by default (no `--host`). For browser testing from the VM desktop, `http://localhost:5173/` is sufficient.

### Environment variables

- No `.env` files are committed. For **Base44** API access, configure `VITE_BASE44_APP_ID`, `VITE_BASE44_BACKEND_URL`, and auth token per `docs/migration/BASE44_TO_SUPABASE_GITHUB.md` and Base44 docs.
- Optional **Supabase** hybrid testing: see `docs/migration/SUPABASE_TEST_SETUP.md` (`supabase start`, `VITE_USE_SUPABASE_ENTITIES=true`).
- Build/dev may log `[base44] Proxy not enabled (VITE_BASE44_APP_BASE_URL not set)` — expected without proxy env; build still succeeds.

### Lint / typecheck expectations

- **`npm run lint`** and **`npm run typecheck`** may report many pre-existing issues in `src/`; they still prove ESLint/TypeScript are installed.
- **`npm run build`** is the reliable gate for “toolchain + bundle OK” (includes `verify:source-location`).

### Repo context

- Canonical **hosted** deploy path today: this repo → Base44 / Vercel legacy. Future canonical stack: **a29-erp** (Next.js + Supabase). See root `README.md` and `.cursor/rules/transicao-vercel-base44.mdc`.
- **Flare** workflow: `docs/flare-export/README.md`, rule `.cursor/rules/busca-de-flares.mdc` — do not commit `flare-pending.json` with sensitive data.

### Optional services (not VM startup)

- `npm run flare:api` — local Flare helper (needs Base44 creds).
- `supabase start` — only for migration/parity work, not required for default Base44-backed dev.
