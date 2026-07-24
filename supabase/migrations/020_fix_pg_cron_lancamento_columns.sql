-- 020_fix_pg_cron_lancamento_columns.sql
-- Corrige jobs da migration 018: escrevem status/data_pagamento só em dados jsonb,
-- mas o supabaseEntityLayer lê primeiro das colunas dedicadas (migration 001).
-- Passa a actualizar coluna + dados (compatibilidade híbrida).

create or replace function public.job_atualizar_status_lancamentos()
returns jsonb language plpgsql security definer as $$
declare
  v_hoje date := (now() at time zone 'America/Rio_Branco')::date;
  v_count int := 0;
begin
  update public.lancamento_financeiro l
    set status = 'Vencido',
        dados = jsonb_set(coalesce(l.dados, '{}'::jsonb), '{status}', '"Vencido"')
    where coalesce(l.status, l.dados->>'status') = 'Em Aberto'
      and coalesce(l.data_vencimento, nullif(l.dados->>'data_vencimento', '')::date) is not null
      and coalesce(l.data_vencimento, nullif(l.dados->>'data_vencimento', '')::date) < v_hoje
      and not (
        coalesce(l.dados->>'forma_pagamento_tipo', '') in ('Cartão Crédito', 'Cartão Débito')
        and coalesce(l.dados->>'status_conciliacao', '') = 'Pendente'
      );
  get diagnostics v_count = row_count;
  return jsonb_build_object('success', true, 'atualizados', v_count, 'hoje', v_hoje::text);
exception when others then
  return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

create or replace function public.job_liquidar_cartao_credito()
returns jsonb language plpgsql security definer as $$
declare
  v_hoje date := (now() at time zone 'America/Rio_Branco')::date;
  v_count int := 0;
begin
  update public.lancamento_financeiro l
    set status = 'Pago',
        data_pagamento = coalesce(
          l.data_pagamento,
          nullif(l.dados->>'data_liquidacao_prevista', '')::date,
          nullif(l.dados->>'data_vencimento', '')::date,
          v_hoje
        ),
        dados = jsonb_set(
          jsonb_set(
            coalesce(l.dados, '{}'::jsonb),
            '{status}',
            '"Pago"'
          ),
          '{data_pagamento}',
          to_jsonb(coalesce(l.dados->>'data_liquidacao_prevista', l.dados->>'data_vencimento', v_hoje::text))
        )
    where coalesce(l.status, l.dados->>'status') = 'Em Aberto'
      and coalesce(l.tipo, l.dados->>'tipo') = 'Receita'
      and coalesce(l.dados->>'forma_pagamento_tipo', '') in ('Cartão Crédito', 'Cartão Débito')
      and coalesce(l.dados->>'status_conciliacao', '') = 'Pendente'
      and coalesce(l.data_pagamento, nullif(l.dados->>'data_pagamento', '')::date) is null
      and coalesce(
        nullif(l.dados->>'data_liquidacao_prevista', '')::date,
        nullif(l.dados->>'data_vencimento', '')::date,
        l.data_vencimento
      ) <= v_hoje;
  get diagnostics v_count = row_count;
  return jsonb_build_object('success', true, 'processados', v_count, 'hoje', v_hoje::text);
exception when others then
  return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;
