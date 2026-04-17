-- Auditoria: lançamentos de conta a pagar com o mesmo grupo (série), mesma data de vencimento
-- e mesma descrição — cenário típico de "siameses" ou obrigações distintas fundidas.
-- Executar no SQL Editor (Supabase/Postgres). Ajuste filtros se necessário.

select
  grupo_lancamento_id,
  data_vencimento::date as vencimento,
  lower(trim(descricao)) as descricao_norm,
  count(*) as qtd,
  array_agg(id order by id) as lancamento_ids,
  array_agg(coalesce(referencia_id, '') order by id) as referencia_ids
from public.lancamento_financeiro
where tipo = 'Despesa'
  and coalesce(grupo_lancamento_id, '') <> ''
  and status <> 'Cancelado'
  and 'conta_pagar' = any (coalesce(tags, array[]::text[]))
group by grupo_lancamento_id, data_vencimento::date, lower(trim(descricao))
having count(*) > 1
order by qtd desc, vencimento desc;

-- Detalhe de um grupo suspeito (substitua os valores):
-- select id, descricao, valor, data_vencimento, referencia_tipo, referencia_id, grupo_lancamento_id, observacoes
-- from public.lancamento_financeiro
-- where grupo_lancamento_id = 'SEU_ID_AQUI'
-- order by data_vencimento, id;

-- Plano de correção manual (resumo):
-- 1) Criar nova public.conta_recorrente para a linha que deve ser série independente.
-- 2) Atualizar public.lancamento_financeiro.grupo_lancamento_id e, se aplicável,
--    public.conta_prevista.conta_recorrente_id para alinhar à nova série.
-- 3) Garantir referencia_id distinto por ContaPrevista quando forem obrigações diferentes.
