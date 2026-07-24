# Port Base44 → Supabase — Estado das Funções

Plano de port das **73 funções serverless** Base44 em falta para Supabase.
Objectivo final: app com `VITE_P38_PROVIDER=supabase` + `VITE_P38_USE_SUPABASE_AUTH=true`, sem chamadas ao Base44.

## Decisões arquitecturais

| # | Decisão |
|---|---------|
| 1 | **Anexos** → Supabase Storage. Migração one-shot dos ficheiros Drive/Base44 existentes; sem sincronização contínua com Drive. |
| 2 | **Lógica multi-tabela crítica** (processarVendaCaixa, cancelarLancamentoFinanceiro, enviarFinanceiroLote) → **RPC Postgres transacional** (BEGIN/COMMIT). A Edge Function valida JWT e chama a RPC — nunca várias writes soltas com service_role. |
| 3 | **Critério RPC vs Edge**: funções críticas multi-tabela usam RPC Postgres transacional; a Edge só valida JWT e chama a RPC. Integrações externas (Storage, Resend, OpenAI, GitHub) ficam na Edge. |

## Padrão de cada função

```
supabase/migrations/0XX_<nome>.sql           → RPC(s) + grants (service_role only)
supabase/functions/<nome-kebab>/index.ts      → thin wrapper: JWT → client.rpc(...)
```

- **Contrato**: camelCase no frontend; kebab-case na Edge; payload JSON igual ao Base44.
- **Auth**: JWT do utilizador validado na Edge; RPC corre como `security definer` (service_role).
- **Permissões**: `revoke ... from anon, authenticated`; `grant execute ... to service_role` — só a Edge (service key) chama a RPC.
- **Storage**: `dados` jsonb para overflow + colunas dedicadas para campos do núcleo (migration 001) e promovidos (migration 009).

## Legenda

- **Status**: ✅ portado · 🔧 em curso · ⏳ pendente · ❌ não portar
- **Destino**: RPC (Postgres transacional) · Edge (JWT + integração externa) · Cron (pg_cron) · Trigger (PL/pgSQL trigger) · Híbrido (RPC + Edge)

## Onda 1 — Bloqueante (PDV + financeiro)

| Função Base44 | Destino | Status | Notas |
|---|---|---|---|
| recalcularEstoqueProduto | RPC | ✅ | migration 017 |
| sincronizarEstoquePorMovimentacao | Trigger | ✅ | migration 017 (trg_recalc_estoque_mov) |
| atualizarStatusLancamentos | Cron | ✅ | migration 018 + **fix 020** (coluna dedicada) |
| processarLiquidacaoCartaoCredito | Cron | ✅ | migration 018 (job_liquidar_cartao_credito) |
| auditarSaldosContas | RPC + Edge | ✅ | migration 019 + Edge wrapper |
| cancelarLancamentoFinanceiro | RPC + Edge | ✅ | migration 019 + Edge wrapper |
| processarVendaCaixa | RPC + Edge | ✅ | migration 022 + sequence PV + Edge wrapper |
| enviarFinanceiroLote | RPC + Edge | ✅ | migration 021 (RPC por pedido) + Edge wrapper |
| gerarLancamentosCartao | Cron | ⏳ | pg_cron diário 05:00 (2 instâncias duplicadas no painel) — migration 021 |
| gerarContasPrevistasRecorrentes | Cron | ⏳ | pg_cron `0 6 1 * *` — migration 021 |
| sincronizarContaPrevia | Trigger | ⏳ | trigger AFTER UPDATE on conta_prevista — migration 021 |
| sincronizarExclusaoContaRecorrente | Trigger | ⏳ | trigger AFTER DELETE on conta_recorrente — migration 021 |
| corrigirMovimentosRecepcaoRetroativos | RPC + Edge | ⏳ | migração corretiva one-shot — migration 021 |

## Onda 2 — Anexos, importações, relatórios

| Função Base44 | Destino | Status |
|---|---|---|
| gerenciarPin | Edge | ✅ | supabase/functions/gerenciar-pin (Resend) |
| uploadAnexoDrive | Edge (Storage) | ⏳ | Supabase Storage bucket `anexos` |
| listarAnexos | Edge | ⏳ | select anexo_documento por referência |
| deletarAnexo | Edge (Storage) | ⏳ | remove object + delete row |
| importarProdutos | Edge | ⏳ | parser XLS/CSV + bulk insert |
| importarPedidosCompra | Edge | ⏳ | parser + insert |
| importarAreas | Edge | ⏳ | parser + insert |
| gerarExtratoFluxoCaixa | RPC | ⏳ | aggregate read |
| gerarRelatorioConferencia | RPC | ⏳ | |
| gerarRelatorioConsolidadoCompra | RPC | ⏳ | |
| gerarRelatorioContasAbertas | RPC | ⏳ | |
| gerarRelatorioMargem | RPC | ⏳ | |
| gerarRelatorioPedido | RPC | ⏳ | |
| gerarRelatorioPedidosCompra | RPC | ⏳ | |
| gerarRelatorioPedidosComprav2 | RPC | ⏳ | |
| gerarRelatorioPendencias | RPC | ⏳ | |
| gerarRelatorioPrecificacao | RPC | ⏳ | |
| gerarRelatorioSupermanifesto | RPC | ⏳ | |
| imprimirCupomTermico | Edge | ⏳ | gera HTML/PDF (sem integração externa) |

## Onda 3 — Compras, logística, operacional

| Função Base44 | Destino | Status |
|---|---|---|
| gerarNumeroSequencial | RPC | ✅ | migration 017 |
| savePedidoVendaItem | RPC + Edge | ⏳ | upsert canónico |
| savePedidoCompraItem | RPC + Edge | ⏳ | |
| saveEmbarqueItem | RPC + Edge | ⏳ | |
| saveConferenciaItem | RPC + Edge | ⏳ | |
| integrarPedidosEmbarques | RPC | ⏳ | |
| forcarEmbarqueOrfao | RPC + Edge | ⏳ | |
| atualizarViagensTransportadoras | Cron | ⏳ | mensal 1º 00:10 |
| sincronizarViagensTransportadora | RPC + Edge | ⏳ | |
| gerarViagensTransportadora | RPC + Edge | ⏳ | |
| atualizarCodigosViagens | RPC + Edge | ⏳ | |
| convidarUsuarios | Edge (Resend) | ⏳ | invite via Supabase Auth admin + email |
| automacaoAprovacaoFinanceira | Trigger | ⏳ | trigger on pedido_compra update |
| atualizarTotaisSupermanifesto | Trigger | ⏳ | trigger on manifesto_entrada/supermanifesto |
| auditarEspelhosCanonicos | RPC | ⏳ | |
| generateConferenceCode / validateConferenceCode | RPC + Edge | ⏳ | |
| calcularIEP | RPC + Edge | ⏳ | |
| atualizarMetasEstoque | Cron | ⏳ | |
| limparAbcdJobProdutos | RPC + Edge | ⏳ | |
| sincronizarStatusFinanceiro | Trigger | ⏳ | |
| registrarGatilhoSupermanifesto | Trigger | ⏳ | |
| repararLancamentosPedidosAprovados | RPC + Edge | ⏳ | |
| excluirLancamentosGeradosAutoAntesData | RPC + Edge | ⏳ | |
| exportProdutosCompra | RPC + Edge | ⏳ | |
| gerarTemplatePedidoCompra | RPC + Edge | ⏳ | |
| vincularItensPedidoAManifesto | RPC + Edge | ⏳ | |
| normalizarPedidosCompraPendentes | RPC + Edge | ⏳ | |
| enhanceLogo | Edge | ⏳ | processamento de imagem |
| listarCatalogoInterface | RPC | ⏳ | read tree |
| protegerInteligenciaLayout | Edge | ⏳ | |

## Onda 4 — DevOps, migração one-shot, admin

| Função Base44 | Destino | Status |
|---|---|---|
| migrarBase44ParaSupabase | Edge one-shot | ⏳ | executa só uma vez |
| migrarConferenciaItensLegacy | Edge one-shot | ⏳ | |
| migrarEmbarqueItensLegacy | Edge one-shot | ⏳ | |
| migrarPedidoCompraItensLegacy | Edge one-shot | ⏳ | |
| migrarPedidoVendaItensLegacy | Edge one-shot | ⏳ | |
| migrarProdutoUnidades | Edge one-shot | ⏳ | |
| exportFlareToGithub | Edge (GitHub API) | ⏳ | PAT em Vault |
| syncCodebaseToGithub | Edge (GitHub API) | ⏳ | |
| debugGithubIdentity | Edge (GitHub API) | ⏳ | |
| listFlarePending | RPC | ⏳ | |
| commitBabelPlugin | Edge | ⏳ | DevOps |
| commitMigrationManifests | Edge | ⏳ | DevOps |
| readViteConfig | Edge | ⏳ | DevOps |
| zerarEntidade | RPC + Edge | ⏳ | admin (perigoso) |

## Não portar

| Função Base44 | Motivo |
|---|---|
| sincronizarDelecaoLancamentos | INATIVA no painel Base44. |

## Automapings do painel Base44 → equivalentes Supabase

| Automação (painel) | Tipo | Equivalent Supabase | Status |
|---|---|---|---|
| sincronizarEstoquePorMovimentacao | entity (MovimentacaoEstoque) | trigger trg_recalc_estoque_mov | ✅ |
| atualizarStatusLancamentos | scheduled diário 11:00 | pg_cron job-status-lancamentos | ✅ ⚠️ |
| processarLiquidacaoCartaoCredito | scheduled | pg_cron job-liquidar-cartao | ✅ |
| atualizarViagensTransportadoras | scheduled mensal 1º 00:10 | pg_cron | ⏳ |
| gerarContasPrevistasRecorrentes | cron `0 6 1 * *` | pg_cron | ⏳ |
| gerarLancamentosCartao | scheduled diário 05:00 (×2 duplicado) | pg_cron | ⏳ |
| sincronizarContaPrevia | entity (ContaPrevista update) | trigger | ⏳ |
| sincronizarExclusaoContaRecorrente | entity (ContaRecorrente delete) | trigger | ⏳ |
| atualizarTotaisSupermanifesto | entity (Manifesto/Supermanifesto) | trigger | ⏳ |
| automacaoAprovacaoFinanceira | entity (PedidoCompra update) | trigger | ⏳ |
| exportFlareToGithub | entity (TargetFlare) | Edge | ⏳ |
| sincronizarDelecaoLancamentos | entity (INATIVA) | — | ❌ |

## Issues conhecidas

1. ~~**migration 018 bug**~~ — corrigido em **020**: crons escrevem coluna `status` + `dados`.
2. **gerarLancamentosCartao** tem **2 automações duplicadas** no painel (ambas diário 05:00). No pg_cron criar só 1.
3. **processarVendaCaixa** usa sequence `pedido_venda_numero_seq` (substitui list+max race-prone do Base44).
4. **PedidoVendaItem canónico** na venda PDV ainda não portado na RPC 022 (avisos não bloqueiam venda no Base44).
5. **Anexos**: migração one-shot dos ficheiros Drive/Base44 para bucket `anexos` do Supabase Storage.

## Entrega por turno

- **Turno 1**: infra `_shared/auth.ts` + migration 019 + auditar/cancelar + doc.
- **Turno 2 (este)**: migrations 020–022 + Edge `processar-venda-caixa` + `enviar-financeiro-lote` + mapeamento no `supabaseAdapter`.
- **Próximo**: migration 023 — gerarLancamentosCartao, gerarContasPrevistasRecorrentes (crons), sincronizarContaPrevia, sincronizarExclusaoContaRecorrente, corrigirMovimentosRecepcaoRetroativos.