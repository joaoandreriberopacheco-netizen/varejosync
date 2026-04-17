-- Integridade de recorrência mensal para conta_prevista.
-- Objetivo: impedir duplicidade da mesma recorrência na mesma competência.

create index if not exists idx_conta_prevista_recorrente_competencia_lookup
  on public.conta_prevista (
    conta_recorrente_id,
    (date_trunc('month', coalesce(periodo_referencia, data_vencimento)))
  )
  where conta_recorrente_id is not null;

create unique index if not exists uq_conta_prevista_recorrente_competencia_mes
  on public.conta_prevista (
    conta_recorrente_id,
    (date_trunc('month', coalesce(periodo_referencia, data_vencimento)))
  )
  where conta_recorrente_id is not null;
