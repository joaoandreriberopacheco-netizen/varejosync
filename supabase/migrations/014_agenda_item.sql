-- 014_agenda_item.sql
-- Agenda pessoal: compromissos, eventos e tarefas com prazo/recorrência.

create table if not exists public.agenda_item (
  id          text primary key,
  dados       jsonb not null default '{}'::jsonb,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_agenda_item_dados_usuario
  on public.agenda_item ((dados->>'usuario_id'));

create index if not exists idx_agenda_item_dados_data
  on public.agenda_item ((dados->>'data'));

create index if not exists idx_agenda_item_dados_status
  on public.agenda_item ((dados->>'status'));

drop trigger if exists trg_agenda_item_set_updated_at on public.agenda_item;
create trigger trg_agenda_item_set_updated_at
  before update on public.agenda_item
  for each row execute function public.set_updated_at();
