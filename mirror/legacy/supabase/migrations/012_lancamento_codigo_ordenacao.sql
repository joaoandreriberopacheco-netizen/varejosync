-- Código AAAAMMDDHHMMSS para ordenação de lançamentos no fluxo de caixa.
alter table public.lancamento_financeiro
  add column if not exists data_lancamento timestamptz,
  add column if not exists codigo_lancamento text;

create index if not exists idx_lancamento_financeiro_codigo
  on public.lancamento_financeiro (codigo_lancamento);
