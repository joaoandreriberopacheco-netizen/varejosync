-- Integridade de recorrência mensal para conta_prevista.
-- Objetivo: impedir duplicidade da mesma recorrência na mesma competência.
--
-- Índices em expressões exigem funções IMMUTABLE. `date_trunc` sobre `date` pode
-- escolher overload STABLE (via cast implícito para timestamptz). Forçar
-- `::timestamp` (sem TZ) usa `date_trunc(text, timestamp)` — IMMUTABLE.

drop index if exists public.idx_conta_prevista_recorrente_competencia_lookup;
drop index if exists public.uq_conta_prevista_recorrente_competencia_mes;

create index if not exists idx_conta_prevista_recorrente_competencia_lookup
  on public.conta_prevista (
    conta_recorrente_id,
    (
      date_trunc(
        'month',
        coalesce(periodo_referencia, data_vencimento)::timestamp
      )
    )
  )
  where conta_recorrente_id is not null;

create unique index if not exists uq_conta_prevista_recorrente_competencia_mes
  on public.conta_prevista (
    conta_recorrente_id,
    (
      date_trunc(
        'month',
        coalesce(periodo_referencia, data_vencimento)::timestamp
      )
    )
  )
  where conta_recorrente_id is not null;
