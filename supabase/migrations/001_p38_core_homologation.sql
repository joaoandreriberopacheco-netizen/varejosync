-- P38 homologation baseline (core entities for migration pilot).
-- This migration intentionally keeps IDs as text to preserve Base44 compatibility.

create extension if not exists pgcrypto;

create table if not exists public.terceiro (
  id text primary key,
  nome text not null,
  tipo text,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.produto (
  id text primary key,
  nome text not null,
  sku text,
  estoque_atual numeric(14,3) default 0,
  preco_venda numeric(14,2) default 0,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.formas_de_pagamento (
  id text primary key,
  nome text not null,
  tipo text,
  taxa numeric(8,4) default 0,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.contas_financeiras (
  id text primary key,
  nome text not null,
  saldo_atual numeric(14,2) default 0,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.turno_caixa (
  id text primary key,
  status text not null default 'Fechado',
  aberto_em timestamptz,
  fechado_em timestamptz,
  operador_id text,
  operador_nome text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.pedido_venda (
  id text primary key,
  numero text,
  cliente_id text references public.terceiro(id) on delete set null,
  cliente_nome text,
  status text default 'Rascunho',
  total numeric(14,2) default 0,
  itens jsonb default '[]'::jsonb,
  pagamentos jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.movimentacao_estoque (
  id text primary key,
  produto_id text not null references public.produto(id) on delete restrict,
  tipo text not null,
  quantidade numeric(14,3) not null,
  origem_tipo text,
  origem_id text,
  created_at timestamptz default now()
);

create table if not exists public.lancamento_financeiro (
  id text primary key,
  tipo text not null,
  descricao text,
  valor numeric(14,2) not null,
  status text default 'Em Aberto',
  data_vencimento date,
  data_pagamento date,
  conta_financeira_id text references public.contas_financeiras(id) on delete set null,
  referencia_tipo text,
  referencia_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_pedido_venda_created_at on public.pedido_venda(created_at desc);
create index if not exists idx_movimentacao_produto_created_at on public.movimentacao_estoque(produto_id, created_at desc);
create index if not exists idx_lancamento_status_vencimento on public.lancamento_financeiro(status, data_vencimento);

-- Simple updater trigger for updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_produto_set_updated_at on public.produto;
create trigger trg_produto_set_updated_at
before update on public.produto
for each row execute function public.set_updated_at();

drop trigger if exists trg_pedido_venda_set_updated_at on public.pedido_venda;
create trigger trg_pedido_venda_set_updated_at
before update on public.pedido_venda
for each row execute function public.set_updated_at();

drop trigger if exists trg_lancamento_set_updated_at on public.lancamento_financeiro;
create trigger trg_lancamento_set_updated_at
before update on public.lancamento_financeiro
for each row execute function public.set_updated_at();
