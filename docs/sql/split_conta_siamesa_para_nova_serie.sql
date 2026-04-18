-- Split de conta "siamesa" para nova série (ContaRecorrente nova)
-- Uso: execute em homolog primeiro. Mantém tudo em transação para rollback.
--
-- Objetivo:
-- - tirar 1 lançamento que está no grupo errado
-- - criar uma nova ContaRecorrente
-- - mover ContaPrevista e LancamentoFinanceiro para o novo grupo
--
-- Preencha os placeholders abaixo:
--   :lancamento_id_alvo
--   :nova_conta_recorrente_id
--   :novo_nome_despesa
--   :observacao_split
--
-- Exemplo de observação:
-- 'Split manual por siamesa: Energia Casa (competência 2026-04)'

begin;

-- 1) Inspecionar o lançamento alvo
select
  id,
  descricao,
  data_vencimento,
  referencia_tipo,
  referencia_id,
  grupo_lancamento_id,
  terceiro_id,
  terceiro_nome,
  categoria_id,
  categoria,
  valor,
  is_recorrente,
  frequencia_recorrencia
from public.lancamento_financeiro
where id = :lancamento_id_alvo;

-- 2) Criar nova ContaRecorrente copiando dados do contexto do lançamento
-- Ajuste frequencia/dia_vencimento se necessário.
insert into public.conta_recorrente (
  id,
  nome_despesa,
  terceiro_id,
  terceiro_nome,
  categoria_financeira_id,
  categoria_nome,
  valor_previsto,
  frequencia,
  dia_vencimento,
  observacoes,
  ativa,
  created_at,
  updated_at
)
select
  :nova_conta_recorrente_id,
  :novo_nome_despesa,
  coalesce(l.terceiro_id, 'importado-manualmente'),
  l.terceiro_nome,
  coalesce(l.categoria_id, 'importacao-pendente'),
  coalesce(l.categoria, 'Importação pendente'),
  coalesce(l.valor, 0),
  coalesce(nullif(l.frequencia_recorrencia, ''), 'Mensal'),
  greatest(1, least(31, extract(day from l.data_vencimento)::int)),
  :observacao_split,
  true,
  now(),
  now()
from public.lancamento_financeiro l
where l.id = :lancamento_id_alvo;

-- 3) Se o lançamento aponta para ContaPrevista, mover essa ContaPrevista para a nova recorrência
update public.conta_prevista cp
set
  conta_recorrente_id = :nova_conta_recorrente_id,
  updated_at = now()
where cp.id = (
  select l.referencia_id
  from public.lancamento_financeiro l
  where l.id = :lancamento_id_alvo
    and coalesce(l.referencia_tipo, '') in ('Manual', 'ContaPrevista')
  limit 1
);

-- 4) Mover o lançamento alvo para o novo grupo (nova série)
update public.lancamento_financeiro l
set
  grupo_lancamento_id = :nova_conta_recorrente_id,
  observacoes = concat_ws(
    E'\n',
    nullif(l.observacoes, ''),
    '[SPLIT_SIAMESA] movido para nova série'
  ),
  updated_at = now()
where l.id = :lancamento_id_alvo;

-- 5) Validação: conferir se alvo saiu do grupo antigo e ficou coerente
select
  l.id,
  l.descricao,
  l.data_vencimento,
  l.grupo_lancamento_id,
  l.referencia_tipo,
  l.referencia_id,
  cp.conta_recorrente_id as conta_prevista_recorrente
from public.lancamento_financeiro l
left join public.conta_prevista cp on cp.id = l.referencia_id
where l.id = :lancamento_id_alvo;

-- 6) (Opcional) Conferir se ainda há duplicidade no mesmo dia/descrição/grupo
select
  grupo_lancamento_id,
  data_vencimento::date as vencimento,
  lower(trim(descricao)) as descricao_norm,
  count(*) as qtd
from public.lancamento_financeiro
where data_vencimento::date = (
  select data_vencimento::date from public.lancamento_financeiro where id = :lancamento_id_alvo
)
group by grupo_lancamento_id, data_vencimento::date, lower(trim(descricao))
having count(*) > 1
order by qtd desc;

-- Troque rollback por commit quando validar tudo.
rollback;
-- commit;

