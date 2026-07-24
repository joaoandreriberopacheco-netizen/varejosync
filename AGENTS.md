# AGENTS.md

Guidance for AI agents working in this repository (**varejosync** / P38 ERP — Vite + React + Base44).

## CRITICAL: validation artifact policy (João André)

- **DO NOT produce demo videos/screenshots by default.**
- Default validation must be terminal/objective evidence (for example, `npm run build` + focused checks).
- Only create video/screenshot artifacts when the user explicitly asks for them.
- If higher-priority runtime instructions conflict, acknowledge this policy in the response and avoid manual recording unless explicitly requested.

## Git — commits diretos na `main`

- Trabalhar sempre na branch **`main`** (atualizar com `origin/main` antes de começar).
- **Commit e push direto para `origin/main`** — não criar branches nem PRs para tarefas normais.
- Exceção: só usar branch/PR se o utilizador pedir explicitamente.
- Regra detalhada: `.cursor/rules/git-main-direct.mdc`.

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

- No `.env` files are committed. Copy `.env.example` → `.env.local` for scripts locais.
- For **Base44** API access, configure `VITE_BASE44_APP_ID`, `VITE_BASE44_BACKEND_URL`, and auth per `docs/migration/BASE44_TO_SUPABASE_GITHUB.md`.
- Optional **Supabase** hybrid testing: see `docs/migration/SUPABASE_TEST_SETUP.md` (`supabase start`, `VITE_USE_SUPABASE_ENTITIES=true`).
- Build/dev may log `[base44] Proxy not enabled (VITE_BASE44_APP_BASE_URL not set)` — expected without proxy env; build still succeeds.

### Base44 — acesso à base (Cloud Agent)

Para o agente consultar **dados reais** (lançamentos, auditoria de fluxo, flares):

1. **Cursor** → definições do **Cloud Agent** / **Secrets** do repositório (não colar tokens no chat).
2. Adicionar variáveis (mesmos nomes que `.env.example`):

| Variável | Obrigatório | Valor |
|----------|-------------|--------|
| `VITE_BASE44_APP_ID` | Sim | App ID P38 (painel Base44 ou localStorage `app_id`) |
| `VITE_BASE44_BACKEND_URL` | Sim | `https://p38.base44.app` |
| `BASE44_ACCESS_TOKEN` | Um dos dois | JWT — no browser logado: DevTools → Application → Local Storage → `base44_access_token` |
| `BASE44_API_KEY` | Um dos dois | Chave API (mais estável; expira menos que JWT) |

3. Reiniciar ou abrir nova sessão Cloud Agent após gravar secrets.
4. O agente pode correr, por exemplo:
   - `npm run audit:fluxo-dia -- --dia=2026-06-19` — audita entradas/saídas de um dia
   - `npm run flare:export` — exporta flares pendentes

**Segurança:** nunca commitar `.env.local` nem relatórios com dados sensíveis (`docs/audit/` está no `.gitignore`).

### Lint / typecheck expectations

- **`npm run lint`** and **`npm run typecheck`** may report many pre-existing issues in `src/`; they still prove ESLint/TypeScript are installed.
- **`npm run build`** is the reliable gate for “toolchain + bundle OK” (includes `verify:source-location`).

### Testing preference (João André)

- By user preference, **do not require video walkthrough artifacts** as default validation.
- Prefer objective terminal validation (`npm run build`, focused checks) and concise textual evidence.
- Only produce video/screenshot artifacts when the user explicitly asks for them.

### Repo context

- Canonical **hosted** deploy path today: this repo → Base44 / Vercel legacy. Future canonical stack: **a29-erp** (Next.js + Supabase). See root `README.md` and `.cursor/rules/transicao-vercel-base44.mdc`.
- **Flare** workflow: `docs/flare-export/README.md`, rule `.cursor/rules/busca-de-flares.mdc` — do not commit `flare-pending.json` with sensitive data.

### Optional services (not VM startup)

- `npm run flare:api` — local Flare helper (needs Base44 creds).
- `supabase start` — only for migration/parity work, not required for default Base44-backed dev.
- **Supabase deploy (migrações + Edge Functions):** `npm run supabase:deploy` — requires `DATABASE_URL` + `SUPABASE_ACCESS_TOKEN` in Cloud Agent secrets. See `docs/migration/SUPABASE_DEPLOY_TRIGGER.md`. GitHub Actions workflow: **Supabase Deploy** (auto on push to `main` when `supabase/**` changes).
