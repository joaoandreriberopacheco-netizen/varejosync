# Migration Checklist — Base44 → Supabase/PostgreSQL
> Auto-generated: 2026-04-15 | Schema: 1.0.0
> Source: entities/, functions/, automations API, Base44 platform

## Status Legend
- `[ ]` Not started
- `[x]` Done
- `[~]` In progress
- `[!]` Blocked / needs decision

---

## Phase 0 — Data Export (do FIRST)

- [ ] Run `exportAllEntities` function (see below) to dump all production data as JSON
- [ ] Confirm all entities are present in export (check count vs production counts)
- [ ] Export storage files: get URL map from `AnexoDocumento.arquivo_url` fields
- [ ] Backup exported JSON to GitHub at `docs/migration/data-exports/`
- [ ] Document production record counts per entity for post-migration validation

### Export Script (run as admin in Base44 backend function)
```js
// Create function exportAllEntities and call it
// Returns: { entity_name: [...records], ... }
```

---

## Phase 1 — Schema (PostgreSQL DDL)

See `ENTITIES_MANIFEST.json` for full field specs.

### Core Tables (critical path)
- [ ] `lancamento_financeiro`
- [ ] `terceiro`
- [ ] `produto`
- [ ] `pedido_venda`
- [ ] `pedido_compra`
- [ ] `movimentacao_estoque`
- [ ] `contas_financeiras`
- [ ] `formas_de_pagamento`
- [ ] `turno_caixa`

### Reference Tables
- [ ] `categoria_produto`
- [ ] `categoria_financeira`
- [ ] `tabela_preco`
- [ ] `area`

### Operational Tables
- [ ] `embarque`
- [ ] `conta_recorrente`
- [ ] `conta_prevista`
- [ ] `movimentos_caixa`
- [ ] `agenda_logistica`
- [ ] `eventos_logisticos`
- [ ] `supermanifesto`
- [ ] `manifesto_entrada`
- [ ] `transportadora`
- [ ] `conferenciacompra`
- [ ] `anex_odocumento`
- [ ] `pagamento_cartao_detalhe`

### Special
- [ ] `target_flare` (Modo Flare)
- [ ] `rascunho_pedido_venda`

### Schema Notes
- All `id` fields: `TEXT PRIMARY KEY` (Base44 uses string UUIDs — preserve as-is)
- `*_nome` / `*_codigo` cache fields: keep for read performance, add FK to source
- JSONB columns: `itens`, `pagamentos`, `volumes_detalhados`, `unidades_alternativas`, `cancelamentos_rastro`
- Arrays: `TEXT[]` for `tags`, `vendas_ids`, `movimentos_ids`, `despesas_ids`

---

## Phase 2 — Backend Functions → Edge Functions

See `FUNCTIONS_MANIFEST.json` for full list.

### Priority 1 — Critical (migrate before cutover)
- [ ] `gerarNumeroSequencial` — used by everything, migrate first
- [ ] `processarVendaCaixa` — core PDV flow
- [ ] `sincronizarEstoquePorMovimentacao` — keeps stock accurate
- [ ] `cancelarLancamentoFinanceiro`
- [ ] `auditarSaldosContas`
- [ ] `gerenciarPin` — auth dependency, port hashing exactly
- [ ] `atualizarStatusLancamentos`
- [ ] `gerarLancamentosCartao`
- [ ] `recalcularEstoqueProduto`

### Priority 2 — Important
- [ ] `gerarContasPrevistasRecorrentes`
- [ ] `sincronizarContaPrevia`
- [ ] `sincronizarExclusaoContaRecorrente`
- [ ] `enviarFinanceiroLote`

### Priority 3 — Operational (can run on Base44 temporarily)
- [ ] `importarProdutos`
- [ ] `importarPedidosCompra`
- [ ] `gerarExtratoFluxoCaixa`
- [ ] `gerarRelatorioMargem`
- [ ] `imprimirCupomTermico`
- [ ] `listarAnexos` / `deletarAnexo`
- [ ] `uploadAnexoDrive`

### Deno → Supabase Edge Functions — What Changes
| Base44 pattern | Supabase equivalent |
|---|---|
| `createClientFromRequest(req)` | `createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: req.headers.get('Authorization') } } })` |
| `base44.auth.me()` | `supabase.auth.getUser(token)` |
| `base44.entities.X.list()` | `supabase.from('x').select('*')` |
| `base44.entities.X.create(data)` | `supabase.from('x').insert(data).select().single()` |
| `base44.entities.X.update(id, data)` | `supabase.from('x').update(data).eq('id', id)` |
| `base44.entities.X.delete(id)` | `supabase.from('x').delete().eq('id', id)` |
| `base44.asServiceRole.entities.X` | `createClient(URL, SERVICE_ROLE_KEY).from('x')` |
| `base44.integrations.Core.SendEmail(...)` | `resend.emails.send(...)` |
| `base44.integrations.Core.UploadFile(...)` | `supabase.storage.from('bucket').upload(...)` |
| `base44.integrations.Core.InvokeLLM(...)` | `openai.chat.completions.create(...)` |
| `base44.integrations.Core.ExtractDataFromUploadedFile(...)` | Parse XLSX/CSV directly in Edge Fn |

---

## Phase 3 — Automations → Triggers + pg_cron

See `AUTOMATIONS_MANIFEST.json` for full specs.

### Entity Triggers (PostgreSQL triggers → Edge Functions)
- [ ] `sincronizarEstoquePorMovimentacao` → trigger on `movimentacao_estoque`
- [ ] `sincronizarContaPrevia` → trigger on `conta_prevista` WHERE status changes to 'Pago'
- [ ] `sincronizarExclusaoContaRecorrente` → trigger on `conta_recorrente` AFTER DELETE
- [ ] `exportFlareToGithub` → trigger on `target_flare` WHERE briefing IS NOT NULL

### Scheduled (pg_cron)
- [ ] `gerarLancamentosCartao` → `0 5 * * *`
- [ ] `gerarContasPrevistasRecorrentes` → `0 6 1 * *`
- [ ] `atualizarViagensTransportadoras` → `10 0 1 * *`

### Enable pg_cron in Supabase
```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;
```

---

## Phase 4 — Auth

- [ ] Map Base44 users to Supabase Auth (email as identifier)
- [ ] Migrate `User.role` (admin/user) to Supabase custom claims or a `profiles` table
- [ ] Migrate `User.perfil_acesso_id` permissions model → Supabase RLS policies
- [ ] Port PIN auth (`gerenciarPin`) — verify hash algorithm used (check function source)
- [ ] Implement `created_by` equivalent via RLS policy or trigger (set to `auth.email()`)

### RLS Template
```sql
-- Example: users can only see their own financial records
CREATE POLICY "user_own_lancamentos" ON lancamento_financeiro
  FOR ALL USING (created_by = auth.email());

-- Admins see everything
CREATE POLICY "admin_all_lancamentos" ON lancamento_financeiro
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

---

## Phase 5 — Storage (Files)

- [ ] Create Supabase Storage bucket: `anexos`
- [ ] Create bucket: `produtos-imagens`
- [ ] Create bucket: `comprovantes`
- [ ] Migrate existing files: download from Base44 URLs, upload to Supabase Storage
- [ ] Update `AnexoDocumento.arquivo_url` and `Produto.imagem_url` with new Supabase URLs
- [ ] Set bucket RLS: authenticated users can read, write own files

---

## Phase 6 — Frontend

- [ ] Replace `import { base44 } from '@/api/base44Client'` → `import { supabase } from '@/lib/supabase'`
- [ ] Replace `base44.entities.X.list()` calls → `supabase.from('x').select()`
- [ ] Replace `base44.functions.invoke()` → `supabase.functions.invoke()`
- [ ] Replace `base44.auth.me()` → `supabase.auth.getUser()`
- [ ] Port real-time subscriptions: `base44.entities.X.subscribe()` → `supabase.channel().on('postgres_changes', ...)`
- [ ] Remove `import { fn } from '@/functions/fn'` → use `supabase.functions.invoke()`

---

## Phase 7 — CI/CD

- [ ] Add GitHub Actions workflow: `migrate.yml`
  - Runs `supabase db push` on merge to main
  - Runs `supabase functions deploy` for all edge functions
- [ ] Add env vars to GitHub Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`
- [ ] Add post-deploy validation: record counts match pre-migration snapshot

---

## Post-Migration Validation

```sql
-- Run after data import to validate counts
SELECT 
  'lancamento_financeiro' as entity, COUNT(*) FROM lancamento_financeiro
UNION ALL SELECT 'terceiro', COUNT(*) FROM terceiro
UNION ALL SELECT 'produto', COUNT(*) FROM produto
UNION ALL SELECT 'pedido_venda', COUNT(*) FROM pedido_venda
UNION ALL SELECT 'pedido_compra', COUNT(*) FROM pedido_compra
UNION ALL SELECT 'movimentacao_estoque', COUNT(*) FROM movimentacao_estoque;
-- Compare counts with pre-migration snapshot
```

---

## Known Risks

| Risk | Impact | Mitigation |
|---|---|---|
| JSONB `itens` field in PedidoVenda/PedidoCompra is denormalized | High — harder to query | Migrate as JSONB first, normalize in Phase 2 |
| `estoque_atual` is computed, not sourced | High — if wrong, financials break | Always recalculate from MovimentacaoEstoque after migration |
| Cache fields (`*_nome`, `*_codigo`) can drift | Low | Keep cache, add FK constraints, refresh via triggers |
| PIN hash algorithm unknown without reading source | High — breaks auth | Read `functions/gerenciarPin` source before migration |
| `saldo_atual` in ContasFinanceiras is computed | High | Run `auditarSaldosContas` after data import |
| Duplicate automation `gerarLancamentosCartao` | Medium | Review before porting — only create one pg_cron job |