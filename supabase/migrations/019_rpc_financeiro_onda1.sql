-- 019_rpc_financeiro_onda1.sql
-- Onda 1 (bloqueante) — RPCs Postgres transacionais para funções críticas.
-- Padrão: a Edge Function valida JWT e chama a RPC (security definer).
-- A RPC corre numa transação (BEGIN/COMMIT implícito do PL/pgSQL) — nunca
-- várias writes soltas com service_role.
--
-- Esta migration entrega as 2 funções de menor risco da Onda 1 para validar
-- o padrão ponta-a-ponta:
--   • public.auditar_saldos_contas()             — leitura agregada (read-only)
--   • public.cancelar_lancamento_financeiro(...)   — cancelamento (grupo ou único)
-- As restantes 5 da Onda 1 (processarVendaCaixa, enviarFinanceiroLote,
-- gerarLancamentosCartao, gerarContasPrevistasRecorrentes, sincronizarContaPrevia,
-- sincronizarExclusaoContaRecorrente, corrigirMovimentosRecepcaoRetroativos)
-- vêm em migrations subsequentes (020+) após validação deste padrão.

-- =====================================================================
-- Guards de schema: garantir colunas/dados usados pelas RPCs.
-- As tabelas do núcleo (migration 001) têm colunas dedicadas; as estendidas
-- (migration 007) têm dados jsonb. Adicionamos o que falta, de forma
-- idempotente, para que as RPCs leiam/escrevam no sítio certo.
-- =====================================================================

-- lancamento_financeiro: colunas de overflow usadas pelo cancelamento.
alter table public.lancamento_financeiro add column if not exists observacoes text;
alter table public.lancamento_financeiro add column if not exists grupo_lancamento_id text;
alter table public.lancamento_financeiro add column if not exists dados jsonb not null default '{}'::jsonb;

-- contas_financeiras: saldo_inicial nem sempre existe no núcleo.
alter table public.contas_financeiras add column if not exists saldo_inicial numeric(14,2) default 0;
alter table public.contas_financeiras add column if not exists dados jsonb not null default '{}'::jsonb;


-- =====================================================================
-- 1) AUDITAR SALDOS DE CONTAS (read-only)
--    Port de auditarSaldosContas: recalcula saldo de cada conta a partir
--    dos lançamentos Pago e compara com saldo_atual registado.
--    Retorna jsonb com o mesmo contrato da função Base44.
-- =====================================================================
create or replace function public.auditar_saldos_contas()
returns jsonb language plpgsql security definer as $$
declare
  v_contas jsonb := '[]'::jsonb;
  v_total_lanc int;
  v_row record;
  v_saldo_inicial numeric;
  v_receitas numeric;
  v_despesas numeric;
  v_calc numeric;
  v_reg numeric;
begin
  for v_row in
    select
      c.id as conta_id,
      c.nome as conta_nome,
      coalesce(c.saldo_inicial, (c.dados->>'saldo_inicial')::numeric, 0) as saldo_inicial,
      coalesce(c.saldo_atual, 0) as saldo_registrado,
      coalesce(sum(case when l.tipo = 'Receita' then l.valor else 0 end), 0) as receitas,
      coalesce(sum(case when l.tipo = 'Despesa' then l.valor else 0 end), 0) as despesas,
      count(l.id) as qtd
    from public.contas_financeiras c
    left join public.lancamento_financeiro l
      on l.conta_financeira_id = c.id
     and l.status = 'Pago'
    group by c.id, c.nome, c.saldo_inicial, c.saldo_atual, c.dados
  loop
    v_saldo_inicial := coalesce(v_row.saldo_inicial, 0);
    v_receitas := coalesce(v_row.receitas, 0);
    v_despesas := coalesce(v_row.despesas, 0);
    v_calc := round(v_saldo_inicial + v_receitas - v_despesas, 2);
    v_reg := coalesce(v_row.saldo_registrado, 0);

    v_contas := v_contas || jsonb_build_object(
      'conta_id', v_row.conta_id,
      'conta_nome', v_row.conta_nome,
      'saldo_inicial', v_saldo_inicial,
      'receitas_validas', round(v_receitas, 2),
      'despesas_validas', round(v_despesas, 2),
      'saldo_calculado', v_calc,
      'saldo_registrado', v_reg,
      'diferenca', round(v_calc - v_reg, 2),
      'quantidade_lancamentos_validos', v_row.qtd
    );
  end loop;

  select count(*) into v_total_lanc
  from public.lancamento_financeiro
  where status = 'Pago' and conta_financeira_id is not null;

  return jsonb_build_object(
    'total_contas', jsonb_array_length(v_contas),
    'total_lancamentos_validos', v_total_lanc,
    'contas', v_contas
  );
exception when others then
  return jsonb_build_object('error', sqlerrm);
end;
$$;


-- =====================================================================
-- 2) CANCELAR LANÇAMENTO FINANCEIRO (transacional)
--    Port de cancelarLancamentoFinanceiro: cancela o lançamento e, se
--    pertencer a um grupo (parcelamento/recorrência), cancela todos do
--    mesmo grupo. Selo frio não é necessário — a transação garante atomicidade.
-- =====================================================================
create or replace function public.cancelar_lancamento_financeiro(
  p_lancamento_id text,
  p_motivo text,
  p_user_name text
) returns jsonb language plpgsql security definer as $$
declare
  v_grupo text;
  v_count int := 0;
  v_obs_novo text;
  v_linha record;
begin
  if p_lancamento_id is null then
    return jsonb_build_object('error', 'lancamentoId obrigatório.');
  end if;

  -- Localiza o lançamento e resolve o grupo (coluna dedicada OU dados).
  select coalesce(grupo_lancamento_id, dados->>'grupo_lancamento_id') as grupo
    into v_grupo
  from public.lancamento_financeiro
  where id = p_lancamento_id;

  if not found then
    return jsonb_build_object('error', 'Lançamento não encontrado');
  end if;

  v_obs_novo := E'\n[CANCELADO por ' || coalesce(p_user_name, '') || ' em ' ||
    to_char(now() at time zone 'America/Rio_Branco', 'DD/MM/YYYY HH24:MI:SS') ||
    '] ' || coalesce(p_motivo, '');

  if v_grupo is not null then
    update public.lancamento_financeiro
      set status = 'Cancelado',
          observacoes = coalesce(observacoes, dados->>'observacoes', '') || v_obs_novo
      where coalesce(grupo_lancamento_id, dados->>'grupo_lancamento_id') = v_grupo;
  else
    update public.lancamento_financeiro
      set status = 'Cancelado',
          observacoes = coalesce(observacoes, dados->>'observacoes', '') || v_obs_novo
      where id = p_lancamento_id;
  end if;

  get diagnostics v_count = row_count;
  return jsonb_build_object('sucesso', true, 'cancelados', v_count);
exception when others then
  return jsonb_build_object('error', sqlerrm);
end;
$$;


-- =====================================================================
-- Permissões: só service_role pode executar (Edge chama com service key).
-- Anon/authenticated NÃO podem chamar directamente — passam pela Edge.
-- =====================================================================
revoke all on function public.auditar_saldos_contas() from public, anon, authenticated;
revoke all on function public.cancelar_lancamento_financeiro(text, text, text) from public, anon, authenticated;
grant execute on function public.auditar_saldos_contas() to service_role;
grant execute on function public.cancelar_lancamento_financeiro(text, text, text) to service_role;