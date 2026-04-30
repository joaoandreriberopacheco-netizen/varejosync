-- Partida fria: esvazia todas as tabelas em `public` exceto `produto`.
--
-- O que fica: linhas em `public.produto` (catálogo). O resto fica sem dados.
-- O que não mexe: definição de tabelas, auth (schema `auth`), storage, edge secrets.
--
-- Uso:
--   1) Backup ou projeto de staging antes de correr em produção.
--   2) Supabase Dashboard → SQL Editor → colar e executar este ficheiro,
--      ou: CONFIRM_COLD_START=1 npm run db:cold-start-keep-produto
--
-- Depois: o PDV / financeiro podem precisar de registos mínimos (ex.: formas de
-- pagamento, contas, terceiro demo) — usa `supabase/seed.sql` à parte ou cria na UI.

DO $body$
DECLARE
  stmt text;
  n int;
BEGIN
  SELECT count(*)::int INTO n FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'produto';
  IF n = 0 THEN
    RAISE NOTICE 'Nenhuma outra tabela em public — nada a truncar.';
    RETURN;
  END IF;

  SELECT 'TRUNCATE TABLE ' || string_agg(format('public.%I', tablename), ', ' ORDER BY tablename)
         || ' RESTART IDENTITY CASCADE'
  INTO stmt
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename <> 'produto';

  IF stmt IS NULL OR btrim(stmt) = 'TRUNCATE TABLE RESTART IDENTITY CASCADE' THEN
    RAISE EXCEPTION 'cold_start: agregação de tabelas falhou (stmt inválido)';
  END IF;

  RAISE NOTICE 'cold_start_keep_produto: %', stmt;
  EXECUTE stmt;
END
$body$;
