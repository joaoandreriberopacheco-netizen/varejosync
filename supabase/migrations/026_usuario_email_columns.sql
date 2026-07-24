-- Garante colunas de utilizador operacional (idempotente; corrige BD onde 007 não criou colunas).
alter table public.usuario add column if not exists email text;
alter table public.usuario add column if not exists full_name text;
alter table public.usuario add column if not exists role text;

create unique index if not exists idx_usuario_email_unique on public.usuario (email) where email is not null and email <> '';

update public.usuario set
  email = coalesce(nullif(trim(email), ''), nullif(trim(dados->>'email'), '')),
  full_name = coalesce(nullif(trim(full_name), ''), nullif(trim(dados->>'full_name'), '')),
  role = coalesce(nullif(trim(role), ''), nullif(trim(dados->>'role'), ''), 'user')
where dados is not null and dados <> '{}'::jsonb;
