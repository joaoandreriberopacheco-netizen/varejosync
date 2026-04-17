-- Auditoria operacional (executar manualmente em homolog/prod).

-- 1) Grupos contaminados com múltiplas descrições/terceiros.
select
  grupo_lancamento_id,
  count(*) as qtd_lancamentos,
  count(distinct coalesce(descricao, '')) as descricoes_distintas,
  count(distinct coalesce(terceiro_nome, '')) as terceiros_distintos,
  min(data_vencimento) as min_vencimento,
  max(data_vencimento) as max_vencimento
from public.lancamento_financeiro
where grupo_lancamento_id is not null
group by grupo_lancamento_id
having count(distinct coalesce(descricao, '')) > 1
    or count(distinct coalesce(terceiro_nome, '')) > 1
order by qtd_lancamentos desc;

-- 2) Retroativos suspeitos (criados depois com vencimento antigo).
select
  id,
  descricao,
  terceiro_nome,
  data_vencimento,
  created_at,
  referencia_tipo,
  referencia_id,
  grupo_lancamento_id
from public.lancamento_financeiro
where tipo = 'Despesa'
  and created_at::date > data_vencimento::date
order by created_at desc;

-- 3) Casos por fornecedor para checagem rápida (ajuste os termos).
select
  id,
  descricao,
  terceiro_nome,
  valor,
  data_vencimento,
  created_at,
  grupo_lancamento_id
from public.lancamento_financeiro
where lower(coalesce(descricao, '') || ' ' || coalesce(terceiro_nome, '')) similar to '%(movistar|inss|fje)%'
order by data_vencimento desc, created_at desc;

-- 4) Duplicidade em conta_prevista por recorrência + competência mensal.
select
  conta_recorrente_id,
  date_trunc('month', coalesce(periodo_referencia, data_vencimento))::date as competencia,
  count(*) as qtd
from public.conta_prevista
where conta_recorrente_id is not null
group by conta_recorrente_id, date_trunc('month', coalesce(periodo_referencia, data_vencimento))
having count(*) > 1
order by qtd desc, competencia desc;
