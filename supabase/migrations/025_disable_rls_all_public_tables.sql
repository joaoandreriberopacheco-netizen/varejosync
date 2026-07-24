-- 025_disable_rls_all_public_tables.sql
-- Garante leitura/escrita via anon key (PostgREST) em modo single-tenant.
-- O Table Editor do Supabase usa role elevada — com RLS activo e sem policy, a API devolve [].

do $$
declare
  rec record;
begin
  for rec in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not like 'pg_%'
      and tablename not in ('_p38_schema_migrations', 'schema_migrations')
  loop
    execute format('alter table public.%I disable row level security;', rec.tablename);
  end loop;
end$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
