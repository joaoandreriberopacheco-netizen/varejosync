# Migração Base44 → Supabase via GitHub

Este repositório suporta **duas abordagens**. Escolhe **uma** conforme onde queres correr a lógica e que segredos queres guardar.

## Abordagem A — GitHub Actions + script Node (recomendada aqui)

O workflow lê entidades pelo SDK Base44 e grava em **PostgreSQL** (Supabase) com `pg`, usando o mapa `src/integrations/p38/entityTableMap.js`.

- **Workflow:** [.github/workflows/migrate-base44-supabase.yml](../../.github/workflows/migrate-base44-supabase.yml)
- **Script:** `scripts/migrate-base44-to-supabase.mjs`
- **Comando local:** `npm run migrate:base44-to-supabase` (opção `--dry-run`)

### Pré-requisitos

1. **Schema já criado no Supabase** — aplica as migrations do repositório (ex.: `supabase/migrations/`) antes de encher dados.
2. **Connection string Postgres** que o Node consiga usar (em redes só IPv4, costuma ser necessário o **Transaction pooler** do dashboard, não o host `db.*` só IPv6).

### Secrets no GitHub (Settings → Secrets and variables → Actions)

| Secret | Obrigatório | Descrição |
|--------|-------------|-----------|
| `DATABASE_URL` | Sim | URI `postgresql://…` do Supabase (idealmente **pooler**; na password, `#` → `%23`) |
| `VITE_BASE44_APP_ID` | Sim | App ID usado no `createClient` |
| `BASE44_API_KEY` | Pelo menos um * | Header `api_key` (ex.: P38 / documentação REST) |
| `BASE44_ACCESS_TOKEN` | Pelo menos um * | JWT com leitura às entidades (alternativa ou complemento à API key) |
| `VITE_BASE44_BACKEND_URL` | Recomendado P38 | Ex.: `https://p38.base44.app` (sem `/api`) |

\* Um dos dois (ou ambos, se o backend aceitar).

Opcionais (ver comentários no workflow e no cabeçalho do script): `MIGRATE_DNS_SERVERS`, `MIGRATE_PG_HOST`, `MIGRATE_PG_SSL_INSECURE`, `MIGRATE_ONLY_ENTITIES`, `MIGRATE_ROWS_PER_COMMIT`.

### Como executar

1. **Actions** → **Migrate Base44 to Supabase** → **Run workflow**.
2. Primeiro **dry_run: true** (só contagens).
3. Depois **dry_run: false** para `UPSERT` em massa (o script usa `ON CONFLICT (id) DO UPDATE`; podes voltar a correr para sincronizar).

### Notas

- Este fluxo **não** mete `SUPABASE_SERVICE_KEY` no GitHub: a escrita é **direta no Postgres**, não pela API REST do Supabase.
- O SDK em script Node pode usar `headers.api_key`; não é obrigatório usar apenas Backend Functions Base44 para leitura.

---

## Abordagem B — Backend Function Base44 (Deno)

Útil se quiseres **não** armazenar `DATABASE_URL` no GitHub e correr a migração **dentro** da infra Base44.

- Padrão: `createClientFromRequest` + `base44.asServiceRole.entities.*` para leitura; escrita no Supabase via cliente oficial com variáveis do dashboard Base44.
- Configura **SUPABASE_URL** e **SUPABASE_SERVICE_KEY** (ou equivalente) em **Dashboard → Code → Environment Variables** da app Base44, não só nos secrets do GitHub.

Podes combinar com um workflow que **só** chama HTTP a essa função (com auth), mas a lógica de cópia fica na função.

---

## Referências no código

- Mapa entidade → tabela: `src/integrations/p38/entityTableMap.js`
- Normalização de payload para colunas Supabase: `src/integrations/p38/supabaseEntityLayer.js` (`prepareWritePayload`)
