-- 018_pg_cron_jobs.sql
-- Port de automações agendadas puras de DB para PL/pgSQL + pg_cron.
-- Substitui os jobs agendados do Base44 por funções SQL agendadas:
--   • job_atualizar_status_lancamentos() — marca lançamentos vencidos
--   • job_liquidar_cartao_credito()       — credita no fluxo as vendas em
--     cartão (débito/crédito) cuja data prevista de liquidação chegou
-- (Agendamentos em UTC; 13:00 UTC = 08:00 America/Rio_Branco / GMT-5.)

create extension if not exists pg_cron;

-- =====================================================================
-- Job 1: marcar lançamentos Em Aberto como Vencido
--   • ignora cartão (débito/crédito) Pendente (aguarda liquidação automática)
-- =====================================================================
create or replace function public.job_atualizar_status_lancamentos()
returns jsonb language plpgsql security definer as $$
declare
  v_hoje text := to_char((now() at time zone 'America/Rio_Branco')::date, 'YYYY-MM-DD');
  v_count int := 0;
begin
  update public.lancamento_financeiro
    set dados = jsonb_set(dados, '{status}', '"Vencido"')
    where (dados->>'status') = 'Em Aberto'
      and (dados->>'data_vencimento') is not null
      and (dados->>'data_vencimento') < v_hoje
      and not (
        (dados->>'forma_pagamento_tipo') in ('Cartão Crédito', 'Cartão Débito')
        and (dados->>'status_conciliacao') = 'Pendente'
      );
  get diagnostics v_count = row_count;
  return jsonb_build_object('success', true, 'atualizados', v_count, 'hoje', v_hoje);
exception when others then
  return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

-- =====================================================================
-- Job 2: liquidar cartão (débito/crédito) — marca Pago com data_pagamento
--   = data de liquidação prevista (ou vencimento).
-- =====================================================================
create or replace function public.job_liquidar_cartao_credito()
returns jsonb language plpgsql security definer as $$
declare
  v_hoje text := to_char((now() at time zone 'America/Rio_Branco')::date, 'YYYY-MM-DD');
  v_count int := 0;
begin
  update public.lancamento_financeiro
    set dados = jsonb_set(
      jsonb_set(dados, '{status}', '"Pago"'),
      '{data_pagamento}',
      to_jsonb(coalesce(dados->>'data_liquidacao_prevista', dados->>'data_vencimento'))
    )
    where (dados->>'status') = 'Em Aberto'
      and (dados->>'tipo') = 'Receita'
      and (dados->>'forma_pagamento_tipo') in ('Cartão Crédito', 'Cartão Débito')
      and (dados->>'status_conciliacao') = 'Pendente'
      and (dados->>'data_pagamento') is null
      and coalesce(dados->>'data_liquidacao_prevista', dados->>'data_vencimento') <= v_hoje;
  get diagnostics v_count = row_count;
  return jsonb_build_object('success', true, 'processados', v_count, 'hoje', v_hoje);
exception when others then
  return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

revoke all on function public.job_atualizar_status_lancamentos() from public;
revoke all on function public.job_liquidar_cartao_credito() from public;
grant execute on function public.job_atualizar_status_lancamentos() to authenticated, anon, service_role;
grant execute on function public.job_liquidar_cartao_credito() to authenticated, anon, service_role;

-- =====================================================================
-- Agendamentos idempotentes (pg_cron)
--   13:05 UTC → status de lançamentos (08:05 America/Rio_Branco)
--   13:10 UTC → liquidação de cartão   (08:10 America/Rio_Branco)
-- =====================================================================
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'job-status-lancamentos') then
    perform cron.schedule(
      'job-status-lancamentos',
      '5 13 * * *',
      $$select public.job_atualizar_status_lancamentos();$$
    );
  end if;
  if not exists (select 1 from cron.job where jobname = 'job-liquidar-cartao') then
    perform cron.schedule(
      'job-liquidar-cartao',
      '10 13 * * *',
      $$select public.job_liquidar_cartao_credito();$$
    );
  end if;
end$$;