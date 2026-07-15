-- 015_agefin_serie.sql
-- AGFIM: programação de contas fixas (espelho folha_previsao).

create table if not exists public.agefin_serie_modelo (
  id          text primary key,
  dados       jsonb not null default '{}'::jsonb,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.agefin_serie_competencia (
  id          text primary key,
  dados       jsonb not null default '{}'::jsonb,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_agefin_serie_competencia_dados_competencia
  on public.agefin_serie_competencia ((dados->>'competencia'));

create index if not exists idx_agefin_serie_competencia_dados_serie
  on public.agefin_serie_competencia ((dados->>'serie_id'));

drop trigger if exists trg_agefin_serie_modelo_set_updated_at on public.agefin_serie_modelo;
create trigger trg_agefin_serie_modelo_set_updated_at
  before update on public.agefin_serie_modelo
  for each row execute function public.set_updated_at();

drop trigger if exists trg_agefin_serie_competencia_set_updated_at on public.agefin_serie_competencia;
create trigger trg_agefin_serie_competencia_set_updated_at
  before update on public.agefin_serie_competencia
  for each row execute function public.set_updated_at();
