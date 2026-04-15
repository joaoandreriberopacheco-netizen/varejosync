# Migration Checklist — Base44 → Supabase/PostgreSQL
> Auto-generated: 2026-04-15 | Schema: 1.0.0

## Status Legend
- `[ ]` Not started
- `[x]` Done
- `[~]` In progress
- `[!]` Blocked / needs decision

---

## Phase 0 — Data Export (do FIRST)
- [ ] Run `exportAllEntities` function to dump all production data as JSON
- [ ] Confirm all entities are present in export
- [ ] Export storage files from `AnexoDocumento.arquivo_url`
- [ ] Backup exported JSON to GitHub at `docs/migration/data-exports/`
- [ ] Document production record counts per entity

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
- [ ] `target_flare`

### Schema Notes
- All `id` fields: `TEXT PRIMARY KEY` (Base44 uses string UUIDs)
- JSONB columns: `itens`, `pagamentos`, `volumes_detalhados`, `unidades_alternativas`
- Arrays: `TEXT[]` for `tags`, `vendas_ids`, etc.

---

## Phase 2 — Backend Functions → Edge Functions
See `FUNCTIONS_MANIFEST.json` for full list.

### Priority 1 — Critical
- [ ] `gerarNumeroSequencial` — migrate first, used everywhere
- [ ] `processarVendaCaixa`
- [ ] `sincronizarEstoquePorMovimentacao`
- [ ] `cancelarLancamentoFinanceiro`
- [ ] `auditarSaldosContas`
- [ ] `gerenciarPin`
- [ ] `atualizarStatusLancamentos`
- [ ] `gerarLancamentosCartao`
- [ ] `recalcularEstoqueProduto`

### Priority 2 — Important
- [ ] `gerarContasPrevistasRecorrentes`
- [ ] `sincronizarContaPrevia`
- [ ] `sincronizarExclusaoContaRecorrente`
- [ ] `enviarFinanceiroLote`

### Priority 3 — Operational
- [ ] `importarProdutos`
- [ ] `gerarExtratoFluxoCaixa`
- [ ] `imprimirCupomTermico`
- [ ] `listarAnexos` / `deletarAnexo`

### Base44 → Supabase Pattern Map
| Base44 | Supabase |
|---|---|
| `createClientFromRequest(req)` | `createClient(URL, ANON_KEY, { headers: { Authorization } })` |
| `base44.auth.me()` | `supabase.auth.getUser(token)` |
| `base44.entities.X.list()` | `supabase.from('x').select('*')` |
| `base44.entities.X.create(data)` | `supabase.from('x').insert(data).select().single()` |
| `base44.entities.X.update(id, data)` | `supabase.from('x').update(data).eq('id', id)` |
| `base44.entities.X.delete(id)` | `supabase.from('x').delete().eq('id', id)` |
| `base44.asServiceRole.entities.X` | `createClient(URL, SERVICE_ROLE_KEY).from('x')` |
| `base44.integrations.Core.SendEmail` | `resend.emails.send(...)` |
| `base44.integrations.Core.UploadFile` | `supabase.storage.from('bucket').upload(...)` |
| `base44.integrations.Core.InvokeLLM` | `openai.chat.completions.create(...)` |

---

## Phase 3 — Automations → Triggers + pg_cron
See `AUTOMATIONS_MANIFEST.json`.

### Entity Triggers
- [ ] `sincronizarEstoquePorMovimentacao` → trigger on `movimentacao_estoque`
- [ ] `sincronizarContaPrevia` → trigger on `conta_prevista` WHERE status = 'Pago'
- [ ] `sincronizarExclusaoContaRecorrente` → trigger on `conta_recorrente` AFTER DELETE
- [ ] `exportFlareToGithub` → trigger on `target_flare` WHERE briefing IS NOT NULL

### Scheduled (pg_cron)
- [ ] `gerarLancamentosCartao` → `0 5 * * *`
- [ ] `gerarContasPrevistasRecorrentes` → `0 6 1 * *`
- [ ] `atualizarViagensTransportadoras` → `10 0 1 * *`

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;
```

---

## Phase 4 — Auth
- [ ] Map Base44 users to Supabase Auth (email as identifier)
- [ ] Migrate `User.role` to custom claims or `profiles` table
- [ ] Port PIN auth (`gerenciarPin`) — verify hash algorithm
- [ ] Implement `created_by` via RLS trigger (`auth.email()`)

---

## Phase 5 — Storage
- [ ] Create bucket: `anexos`
- [ ] Create bucket: `produtos-imagens`
- [ ] Create bucket: `comprovantes`
- [ ] Migrate files from Base44 URLs to Supabase Storage

---

## Phase 6 — Frontend
- [ ] Replace `base44` client → `supabase` client
- [ ] Replace `base44.entities.X` calls → `supabase.from('x')`
- [ ] Replace `base44.functions.invoke()` → `supabase.functions.invoke()`
- [ ] Port real-time: `base44.entities.X.subscribe()` → `supabase.channel().on('postgres_changes',...)`

---

## Phase 7 — CI/CD
- [ ] GitHub Actions: `supabase db push` + `supabase functions deploy` on merge to main
- [ ] Add Supabase secrets to GitHub Secrets

---

## Post-Migration Validation
```sql
SELECT 'lancamento_financeiro', COUNT(*) FROM lancamento_financeiro
UNION ALL SELECT 'terceiro', COUNT(*) FROM terceiro
UNION ALL SELECT 'produto', COUNT(*) FROM produto
UNION ALL SELECT 'pedido_venda', COUNT(*) FROM pedido_venda
UNION ALL SELECT 'pedido_compra', COUNT(*) FROM pedido_compra;
```

## Known Risks
| Risk | Impact | Mitigation |
|---|---|---|
| JSONB `itens` denormalized | High | Migrate as JSONB first, normalize later |
| `estoque_atual` is computed | High | Recalculate from MovimentacaoEstoque after import |
| PIN hash unknown | High | Read `functions/gerenciarPin` source before migration |
| `saldo_atual` is computed | High | Run `auditarSaldosContas` after data import |
| Duplicate automation `gerarLancamentosCartao` | Medium | Create only one pg_cron job |