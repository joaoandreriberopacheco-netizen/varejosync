-- Fase 1: coluna extras (JSONB) para campos do ENTITIES_MANIFEST ainda não espelhados em colunas dedicadas.
-- Permite importações e inspeção no Studio sem perder shape do Base44.

alter table public.terceiro add column if not exists extras jsonb not null default '{}'::jsonb;
alter table public.produto add column if not exists extras jsonb not null default '{}'::jsonb;
alter table public.formas_de_pagamento add column if not exists extras jsonb not null default '{}'::jsonb;
alter table public.contas_financeiras add column if not exists extras jsonb not null default '{}'::jsonb;
alter table public.turno_caixa add column if not exists extras jsonb not null default '{}'::jsonb;
alter table public.pedido_venda add column if not exists extras jsonb not null default '{}'::jsonb;
alter table public.movimentacao_estoque add column if not exists extras jsonb not null default '{}'::jsonb;
alter table public.lancamento_financeiro add column if not exists extras jsonb not null default '{}'::jsonb;

comment on column public.terceiro.extras is 'Overflow JSON alinhado ao ENTITIES_MANIFEST (campos não colocados em colunas dedicadas).';
comment on column public.produto.extras is 'Overflow JSON alinhado ao ENTITIES_MANIFEST.';
comment on column public.pedido_venda.extras is 'Overflow JSON alinhado ao ENTITIES_MANIFEST.';
