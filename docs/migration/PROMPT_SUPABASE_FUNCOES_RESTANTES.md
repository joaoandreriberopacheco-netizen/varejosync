# Prompt — portar funções Base44 restantes para Supabase

**Objetivo:** pedir a entrega das **73 funções serverless** que ainda não existem no Supabase, para conseguirmos **cortar o Base44** mantendo paridade operacional.

**Contexto verificado no repositório (2026-07-24):**
- Base44: **79** funções em `base44/functions/*/entry.ts`
- Supabase já portado: **6** (1 Edge Function + 5 em SQL/pg_cron)
- **Faltam: 73** funções

**Já portado (não repetir):**

| Base44 | Destino Supabase |
|--------|------------------|
| `gerenciarPin` | Edge Function `gerenciar-pin` |
| `gerarNumeroSequencial` | SQL RPC `gerar_numero_sequencial` |
| `recalcularEstoqueProduto` | SQL RPC `recalcular_estoque_produto` |
| `sincronizarEstoquePorMovimentacao` | trigger `trg_recalc_estoque_mov` |
| `atualizarStatusLancamentos` | pg_cron `job_atualizar_status_lancamentos` |
| `processarLiquidacaoCartaoCredito` | pg_cron `job_liquidar_cartao_credito` |

**Stack alvo:**
- PostgreSQL (schema JSONB-first, tabelas em `supabase/migrations/`)
- Supabase Edge Functions (Deno/TypeScript) para lógica complexa
- PL/pgSQL + pg_cron para automações puramente de BD
- Supabase Storage para anexos (substituir Google Drive onde fizer sentido)
- Supabase Auth (`auth.users` ligado a `public.usuario`)

**Repositório:** `varejosync` (GitHub) — código-fonte Base44 em `base44/functions/`, manifesto em `src/docs/migration/FUNCTIONS_MANIFEST.json`.

---

## Prompt para colar (versão completa)

```
Precisamos portar as funções serverless do Base44 para Supabase para conseguir operar sem a plataforma Base44.

## Situação actual

- A base de dados já está no Supabase (tabelas + dados migrados).
- O frontend já tem adaptador Supabase (`VITE_P38_PROVIDER=supabase`).
- Das 79 funções Base44 no nosso Git, só 6 têm equivalente no Supabase hoje.
- Faltam **73 funções** para paridade.

### Já portado (NÃO repetir)
- gerenciarPin → supabase/functions/gerenciar-pin
- gerarNumeroSequencial → SQL gerar_numero_sequencial
- recalcularEstoqueProduto → SQL recalcular_estoque_produto
- sincronizarEstoquePorMovimentacao → trigger trg_recalc_estoque_mov
- atualizarStatusLancamentos → pg_cron job_atualizar_status_lancamentos
- processarLiquidacaoCartaoCredito → pg_cron job_liquidar_cartao_credito

## O que pedimos

Para **cada uma das 73 funções em falta** (lista no Anexo A abaixo), entregar:

1. **Código portado** pronto para deploy:
   - Edge Function em `supabase/functions/<nome-kebab>/index.ts`, OU
   - Função SQL + trigger/pg_cron em `supabase/migrations/0XX_<nome>.sql`
   - Indicar qual destino escolheram e porquê.

2. **Contrato de invocação** (paridade com Base44):
   - Nome da função (manter camelCase no frontend; kebab-case na Edge Function).
   - Payload de entrada (JSON, campos obrigatórios/opcionais, tipos).
   - Payload de resposta (formato exacto, incluindo erros).
   - Autenticação: JWT do utilizador vs service_role.
   - Se a função chama outras funções, ordem e dependências.

3. **Entidades tocadas** por operação:
   - Tabelas lidas / escritas / apagadas.
   - Efeitos em cadeia (triggers, outras funções).
   - Garantias de consistência (transacção, rollback, idempotência).

4. **Integrações externas** (quando aplicável):
   - Substituir `integrations.Core.*` por equivalente Supabase/terceiros:
     - UploadFile → Supabase Storage
     - SendEmail → Resend (ou SMTP)
     - InvokeLLM / GenerateImage → OpenAI API directa
     - ExtractDataFromUploadedFile → parser XLS/CSV na Edge Function
     - googledrive connector → Supabase Storage OU Google Drive API com OAuth
     - github connector → GitHub API com PAT em Supabase Vault
   - Secrets necessários e scopes OAuth.

5. **Testes mínimos**:
   - 1 caso de sucesso + 1 caso de erro por função.
   - Comando `curl` ou script para invocar localmente (`supabase functions serve`).

## Prioridade de entrega

### Onda 1 — Bloqueante para PDV e financeiro (entregar primeiro)
- processarVendaCaixa
- cancelarLancamentoFinanceiro
- enviarFinanceiroLote
- auditarSaldosContas
- gerarLancamentosCartao
- gerarContasPrevistasRecorrentes
- sincronizarContaPrevia
- sincronizarExclusaoContaRecorrente
- corrigirMovimentosRecepcaoRetroativos

### Onda 2 — Anexos, importações e relatórios
- uploadAnexoDrive, listarAnexos, deletarAnexo
- importarProdutos, importarPedidosCompra, importarAreas
- gerarExtratoFluxoCaixa
- gerarRelatorioMargem, gerarRelatorioPedidosCompra, gerarRelatorioConferencia
- gerarRelatorioConsolidadoCompra, gerarRelatorioContasAbertas, gerarRelatorioPedido
- gerarRelatorioPedidosComprav2, gerarRelatorioPendencias, gerarRelatorioPrecificacao
- gerarRelatorioSupermanifesto
- imprimirCupomTermico

### Onda 3 — Compras, logística, operacional
- savePedidoVendaItem, savePedidoCompraItem, saveEmbarqueItem, saveConferenciaItem
- integrarPedidosEmbarques, forcarEmbarqueOrfao, normalizarPedidosCompraPendentes
- gerarTemplatePedidoCompra, exportProdutosCompra
- atualizarCodigosViagens, atualizarMetasEstoque, atualizarTotaisSupermanifesto
- atualizarViagensTransportadoras, gerarViagensTransportadora, sincronizarViagensTransportadora
- registrarGatilhoSupermanifesto, vincularItensPedidoAManifesto
- generateConferenceCode, validateConferenceCode
- automacaoAprovacaoFinanceira, sincronizarStatusFinanceiro
- calcularIEP, repararLancamentosPedidosAprovados
- convidarUsuarios (com Supabase Auth + Resend)

### Onda 4 — DevOps, migração one-shot, admin (pode ser última)
- migrarBase44ParaSupabase, migrarConferenciaItensLegacy, migrarEmbarqueItensLegacy
- migrarPedidoCompraItensLegacy, migrarPedidoVendaItensLegacy, migrarProdutoUnidades
- exportFlareToGithub, listFlarePending, syncCodebaseToGithub
- commitBabelPlugin, commitMigrationManifests, debugGithubIdentity
- enhanceLogo, generateProductImages, protegerInteligenciaLayout, readViteConfig
- limparAbcdJobProdutos, listarCatalogoInterface
- excluirLancamentosGeradosAutoAntesData, auditarEspelhosCanonicos
- zerarEntidade (admin only — manter protecção)

### Não portar (confirmar)
- sincronizarDelecaoLancamentos — marcada INATIVA no manifesto

## Formato de entrega (obrigatório)

1. **Pull Request** ou pacote ZIP com:
   - `supabase/functions/**` (Edge Functions novas)
   - `supabase/migrations/0XX_*.sql` (SQL novos)
   - `docs/migration/FUNCTIONS_PORT_STATUS.md` — tabela:

     | Função Base44 | Destino Supabase | Status | Notas |
     |---------------|------------------|--------|-------|

2. **FUNCTIONS_PORT_STATUS.md** deve ter colunas:
   - `testado_local` (sim/não)
   - `depende_de_secrets` (lista)
   - `bloqueante_cutover` (sim/não)

3. Para funções que **não** forem portáveis 1:1, explicar alternativa e impacto no negócio.

## Perguntas que precisamos de resposta explícita

1. Existem funções deployadas no Base44 que **não** estão no nosso Git? (ex.: flareStatusSync, flareMetrics)
2. Há automações no painel Base44 sem função correspondente no repo?
3. Qual o algoritmo exacto do hash de PIN em `gerenciarPin`? (já portámos — confirmar paridade)
4. `processarVendaCaixa`: há transacção atómica ou efeitos parciais em caso de falha?
5. Anexos: migramos tudo para Supabase Storage ou mantemos Google Drive?
6. Crons: lista completa de jobs agendados no Base44 vs o que já temos em pg_cron.

## Anexo A — Lista completa das 73 funções em falta

1. atualizarCodigosViagens
2. atualizarMetasEstoque
3. atualizarTotaisSupermanifesto
4. atualizarViagensTransportadoras
5. auditarEspelhosCanonicos
6. auditarSaldosContas [CRÍTICA]
7. automacaoAprovacaoFinanceira
8. calcularIEP
9. cancelarLancamentoFinanceiro [CRÍTICA]
10. commitBabelPlugin
11. commitMigrationManifests
12. convidarUsuarios (Core.SendEmail)
13. corrigirMovimentosRecepcaoRetroativos [CRÍTICA]
14. debugGithubIdentity
15. deletarAnexo (Google Drive DELETE)
16. enhanceLogo (Core.GenerateImage)
17. enviarFinanceiroLote [CRÍTICA]
18. excluirLancamentosGeradosAutoAntesData
19. exportFlareToGithub (github connector)
20. exportProdutosCompra
21. forcarEmbarqueOrfao
22. generateConferenceCode
23. generateProductImages
24. gerarContasPrevistasRecorrentes [CRÍTICA]
25. gerarExtratoFluxoCaixa
26. gerarLancamentosCartao [CRÍTICA]
27. gerarRelatorioConferencia (Core.UploadFile)
28. gerarRelatorioConsolidadoCompra
29. gerarRelatorioContasAbertas
30. gerarRelatorioMargem
31. gerarRelatorioPedido
32. gerarRelatorioPedidosCompra
33. gerarRelatorioPedidosComprav2
34. gerarRelatorioPendencias
35. gerarRelatorioPrecificacao
36. gerarRelatorioSupermanifesto
37. gerarTemplatePedidoCompra
38. gerarViagensTransportadora
39. importarAreas
40. importarPedidosCompra (Core.ExtractDataFromUploadedFile)
41. importarProdutos (Core.ExtractDataFromUploadedFile)
42. imprimirCupomTermico
43. integrarPedidosEmbarques
44. limparAbcdJobProdutos
45. listFlarePending
46. listarAnexos
47. listarCatalogoInterface
48. migrarBase44ParaSupabase
49. migrarConferenciaItensLegacy
50. migrarEmbarqueItensLegacy
51. migrarPedidoCompraItensLegacy
52. migrarPedidoVendaItensLegacy
53. migrarProdutoUnidades
54. normalizarPedidosCompraPendentes
55. processarVendaCaixa [CRÍTICA]
56. protegerInteligenciaLayout
57. readViteConfig
58. registrarGatilhoSupermanifesto
59. repararLancamentosPedidosAprovados
60. saveConferenciaItem
61. saveEmbarqueItem
62. savePedidoCompraItem
63. savePedidoVendaItem
64. sincronizarContaPrevia [CRÍTICA]
65. sincronizarExclusaoContaRecorrente
66. sincronizarStatusFinanceiro
67. sincronizarViagensTransportadora
68. syncCodebaseToGithub
69. uploadAnexoDrive (googledrive connector)
70. validateConferenceCode
71. vincularItensPedidoAManifesto
72. zerarEntidade (admin only)
73. (reserva: confirmar se há funções só na nuvem Base44 não listadas acima)

Objectivo final: **app a correr com `VITE_P38_PROVIDER=supabase` e `VITE_P38_USE_SUPABASE_AUTH=true`, sem chamadas ao Base44.**
```

---

## Versão curta (limite de caracteres)

```
Migração Base44 → Supabase: BD já está no Supabase, mas faltam 73 de 79 funções serverless.

Já portado (6): gerenciarPin, gerarNumeroSequencial, recalcularEstoqueProduto, sincronizarEstoquePorMovimentacao, atualizarStatusLancamentos, processarLiquidacaoCartaoCredito.

Pedimos entrega das 73 restantes com:
- código (Edge Function ou SQL/pg_cron)
- contrato entrada/saída igual ao Base44
- tabelas lidas/escritas
- substituição de Core.* (Storage, Resend, OpenAI, etc.)
- teste mínimo por função

Prioridade Onda 1 (bloqueante): processarVendaCaixa, cancelarLancamentoFinanceiro, enviarFinanceiroLote, auditarSaldosContas, gerarLancamentosCartao, gerarContasPrevistasRecorrentes, sincronizarContaPrevia, corrigirMovimentosRecepcaoRetroativos.

Entrega: PR com supabase/functions + migrations + FUNCTIONS_PORT_STATUS.md.

Repo: varejosync — base44/functions/ é fonte de verdade. Confirmar se há funções só na nuvem Base44 fora do Git.
```

---

## Como usar

1. Copia o bloco **“Prompt para colar (versão completa)”** e envia ao fornecedor Base44, dev contratado ou assistente técnico.
2. Se o canal tiver limite de tamanho, usa a **versão curta** e anexa o ficheiro `FUNCTIONS_MANIFEST.json` do repo.
3. Quando responderem, grava o status em `docs/migration/FUNCTIONS_PORT_STATUS.md` e faz commit no GitHub.
