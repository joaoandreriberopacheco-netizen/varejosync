# Supabase de homologação (P38)

## Objetivo

Subir um ambiente de teste para validar paridade dos fluxos críticos antes do cutover.

## Estrutura criada

- `supabase/config.toml`
- `supabase/migrations/001_p38_core_homologation.sql`
- `supabase/seed.sql`

## Passos locais (CLI)

1. Instalar Supabase CLI.
2. No root do repo:
   - `supabase start`
   - `supabase db reset`
3. Conferir tabelas core no Studio:
   - `terceiro`
   - `produto`
   - `pedido_venda`
   - `movimentacao_estoque`
   - `lancamento_financeiro`
   - `contas_financeiras`
   - `formas_de_pagamento`
   - `turno_caixa`

## Variáveis de ambiente (frontend)

- `VITE_P38_PROVIDER=subpayze` (apenas em homologação)
- `VITE_P38_ENABLE_SUBPAYZE=true`
- `VITE_P38_SUBPAYZE_READY=true`
- `VITE_SUBPAYZE_API_URL`
- `VITE_SUBPAYZE_API_KEY`
- `VITE_SUBPAYZE_WEBHOOK_SECRET`

## Critério mínimo de pronto

- Migração e seed aplicam sem erro.
- Fluxo de leitura/escrita do piloto (PDV ou financeiro) executa no ambiente de homologação.
- Logs com `request-id` disponíveis para rastreabilidade.
