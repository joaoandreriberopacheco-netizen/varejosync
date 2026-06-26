-- 013_folha_previsao.sql
-- Módulo de previsão de folha (não é folha de pagamento executável).

create table if not exists public.folha_previsao_modelo (
  id          text primary key,
  dados       jsonb not null default '{}'::jsonb,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.folha_previsao_competencia (
  id          text primary key,
  dados       jsonb not null default '{}'::jsonb,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_folha_previsao_competencia_dados_competencia
  on public.folha_previsao_competencia ((dados->>'competencia'));

create index if not exists idx_folha_previsao_competencia_dados_colaborador
  on public.folha_previsao_competencia ((dados->>'colaborador_id'));

drop trigger if exists trg_folha_previsao_modelo_set_updated_at on public.folha_previsao_modelo;
create trigger trg_folha_previsao_modelo_set_updated_at
  before update on public.folha_previsao_modelo
  for each row execute function public.set_updated_at();

drop trigger if exists trg_folha_previsao_competencia_set_updated_at on public.folha_previsao_competencia;
create trigger trg_folha_previsao_competencia_set_updated_at
  before update on public.folha_previsao_competencia
  for each row execute function public.set_updated_at();
