-- 016_budget.sql
-- Módulo de budgets (orçamento variável de despesas).

create table if not exists public.budget_modelo (
  id          text primary key,
  dados       jsonb not null default '{}'::jsonb,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.budget_competencia (
  id          text primary key,
  dados       jsonb not null default '{}'::jsonb,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_budget_competencia_dados_competencia
  on public.budget_competencia ((dados->>'competencia'));

create index if not exists idx_budget_competencia_dados_modelo
  on public.budget_competencia ((dados->>'budget_modelo_id'));

drop trigger if exists trg_budget_modelo_set_updated_at on public.budget_modelo;
create trigger trg_budget_modelo_set_updated_at
  before update on public.budget_modelo
  for each row execute function public.set_updated_at();

drop trigger if exists trg_budget_competencia_set_updated_at on public.budget_competencia;
create trigger trg_budget_competencia_set_updated_at
  before update on public.budget_competencia
  for each row execute function public.set_updated_at();
