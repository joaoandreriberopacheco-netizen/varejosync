# Fase 1 — Homologação Supabase (schema completo no Git, **sem cutover**)

## Objetivo

Ter um **projeto Supabase de homologação** (local e/ou cloud) com:

1. **Todas as entidades** listadas em `src/docs/migration/ENTITIES_MANIFEST.json` representadas em PostgreSQL.
2. **Migrações versionadas** em `supabase/migrations/` como fonte de verdade.
3. **Coluna `extras` (JSONB)** nas tabelas já criadas em `001_*` para armazenar campos do manifesto ainda não promovidos a colunas dedicadas (paridade documental + imports).
4. **Sem virada de produção** — Base44 continua a referência operacional; esta fase valida só BD e processo de deploy de schema.

## O que não é Fase 1

- Ligar o frontend em produção só ao Supabase (isso é Fase 2+ com P38/casca).
- Portar todas as Edge Functions / paridade de negócio (matriz em `CRITICAL_PARITY_VALIDATION.md`).
- RLS de produção por utilizador (em homolog pode usar políticas permissivas ou `service_role` em scripts; fechar RLS é Fase 2).

## Artefactos

| Artefacto | Descrição |
|-----------|-----------|
| `001_p38_core_homologation.sql` | Núcleo inicial (PDV/financeiro mínimo). |
| `002_phase1_manifest_entities.sql` | Entidades do manifesto em falta + `target_flare`. |
| `003_phase1_extras_manifest_overflow.sql` | Coluna `extras jsonb` nas tabelas do `001` para overflow do manifesto. |
| `seed.sql` | Dados de demo (ajustar se novas colunas NOT NULL forem adicionadas). |

## Checklist operacional

1. Instalar [Supabase CLI](https://supabase.com/docs/guides/cli).
2. Na raiz do repo: `supabase start` → `supabase db reset` (aplica migrações + seed).
3. Abrir Studio (porta local típica 54323) e confirmar **presença das tabelas** listadas na secção abaixo.
4. (Opcional cloud) `supabase link` ao projeto de homologação e `supabase db push` a partir da branch acordada.
5. Registar URL/keys do projeto homolog num cofre de equipa (não commitar segredos).

## Cobertura do manifesto (18 entidades)

| Entidade manifest | Tabela PostgreSQL |
|-------------------|-------------------|
| LancamentoFinanceiro | `lancamento_financeiro` |
| Terceiro | `terceiro` |
| Produto | `produto` |
| PedidoVenda | `pedido_venda` |
| PedidoCompra | `pedido_compra` |
| MovimentacaoEstoque | `movimentacao_estoque` |
| ContasFinanceiras | `contas_financeiras` |
| FormasDePagamento | `formas_de_pagamento` |
| TabelaPreco | `tabela_preco` |
| TurnoCaixa | `turno_caixa` |
| Embarque | `embarque` |
| ContaRecorrente | `conta_recorrente` |
| ContaPrevista | `conta_prevista` |
| CategoriaProduto | `categoria_produto` |
| CategoriaFinanceira | `categoria_financeira` |
| AgendaLogistica | `agenda_logistica` |
| MovimentosCaixa | `movimentos_caixa` |
| TargetFlare | `target_flare` |

## Definição de pronto (Fase 1)

- [ ] `supabase db reset` conclui sem erro.
- [ ] Todas as linhas da tabela acima existem no `public`.
- [ ] Equipa sabe onde estão URL/keys de homolog (fora do Git).
- [ ] Próximo passo acordado: Fase 2 = app/casca + RLS + funções (ver `P38_CONSOLIDATION.md` e `MIGRATION_CHECKLIST.md`).

## Datalink no frontend (opcional sobre Fase 1)

Com `.env.local` e `VITE_USE_SUPABASE_ENTITIES=true`, o código usa Postgres para as entidades mapeadas; ver **`SUPABASE_TEST_SETUP.md`** (secção “Datalink híbrido”) e `entityTableMap.js`.
