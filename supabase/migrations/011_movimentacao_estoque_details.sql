-- Detalhes operacionais de MovimentacaoEstoque usados por ajustes manuais,
-- compras, vendas e auditorias. Mantem compatibilidade com payloads Base44
-- que ja gravam estes campos no extrato de estoque.

alter table public.movimentacao_estoque
  alter column quantidade type numeric(18,6) using quantidade::numeric(18,6);

alter table public.movimentacao_estoque add column if not exists produto_nome text;
alter table public.movimentacao_estoque add column if not exists motivo text;
alter table public.movimentacao_estoque add column if not exists quantidade_base numeric(18,6);
alter table public.movimentacao_estoque add column if not exists quantidade_comercial numeric(18,6);
alter table public.movimentacao_estoque add column if not exists unidade_medida text;
alter table public.movimentacao_estoque add column if not exists unidade_sigla text;
alter table public.movimentacao_estoque add column if not exists produto_unidade_id text;
alter table public.movimentacao_estoque add column if not exists fator_conversao numeric(18,6);
alter table public.movimentacao_estoque add column if not exists custo_unitario numeric(18,6);
alter table public.movimentacao_estoque add column if not exists documento_referencia text;
alter table public.movimentacao_estoque add column if not exists referencia_tipo text;
alter table public.movimentacao_estoque add column if not exists referencia_id text;
alter table public.movimentacao_estoque add column if not exists referencia_numero text;
alter table public.movimentacao_estoque add column if not exists observacoes text;
alter table public.movimentacao_estoque add column if not exists usuario_responsavel text;

create index if not exists idx_movimentacao_estoque_referencia_tipo
  on public.movimentacao_estoque (referencia_tipo);
