-- Excluir lançamentos de contas a pagar gerados automaticamente pela janela de recorrência
-- (tag `lf_gerado_auto` em src/lib/agefinLancamentosRecorrencia.js), com vencimento antes de 2026-04-01.
--
-- IMPORTANTE
-- 1) Rode sempre o SELECT de pré-visualização antes do DELETE.
-- 2) Por padrão limitamos a status 'Em Aberto' para não apagar histórico já pago.
--    Se quiser apagar também pagos, remova a linha `and status = 'Em Aberto'`.
-- 3) Se a coluna `tags` não existir na sua base, use só o critério de `observacoes` ou adicione a coluna.
-- 4) `ContaPrevista` criada pelo job mensal (gerarContasPrevistasRecorrentes) não leva a tag `lf_gerado_auto`;
--    há um bloco OPCIONAL no final — use só se fizer sentido para o seu caso.

-- ========= Pré-visualização: o que será removido (LancamentoFinanceiro) =========
select
  id,
  descricao,
  data_vencimento,
  status,
  referencia_tipo,
  left(coalesce(observacoes, ''), 80) as obs_inicio,
  tags
from public.lancamento_financeiro
where tipo = 'Despesa'
  and coalesce(data_vencimento, '1900-01-01'::date) < date '2026-04-01'
  and status = 'Em Aberto'
  and (
    'lf_gerado_auto' = any (coalesce(tags, array[]::text[]))
    or coalesce(observacoes, '') ilike '%gerado automaticamente (janela recorrente)%'
  )
order by data_vencimento, id;

-- ========= Exclusão (transação) =========
begin;

-- delete from public.lancamento_financeiro
-- where tipo = 'Despesa'
--   and coalesce(data_vencimento, '1900-01-01'::date) < date '2026-04-01'
--   and status = 'Em Aberto'
--   and (
--     'lf_gerado_auto' = any (coalesce(tags, array[]::text[]))
--     or coalesce(observacoes, '') ilike '%gerado automaticamente (janela recorrente)%'
--   );

-- Descomente COMMIT após conferir; ou use ROLLBACK para desfazer.
-- commit;
rollback;

-- ========= OPCIONAL: ContaPrevista gerada pelo job (sem tag de automático no código) =========
-- Só use se quiser remover previstas antigas de recorrência SEM boleto anexado.
-- Ajuste filtros conforme a política da empresa.
--
-- select id, descricao, data_vencimento, conta_recorrente_id, boleto_url, status
-- from public.conta_prevista
-- where conta_recorrente_id is not null
--   and coalesce(data_vencimento, '1900-01-01'::date) < date '2026-04-01'
--   and coalesce(boleto_url, '') = ''
--   and status in ('Pendente', 'pendente');
--
-- begin;
-- delete from public.conta_prevista
-- where id in (
--   select id from public.conta_prevista
--   where conta_recorrente_id is not null
--     and coalesce(data_vencimento, '1900-01-01'::date) < date '2026-04-01'
--     and coalesce(boleto_url, '') = ''
--     and status in ('Pendente', 'pendente')
-- );
-- rollback;
