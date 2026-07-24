-- 017_functions_estoque_sequenciais.sql
-- Port híbrido (PL/pgSQL) das regras de dados prioritárias:
--   • recalcular_estoque_produto(p_produto_id) — RPC que recalcula estoque_atual
--   • trigger trg_movimentacao_estoque_recalc — recalculo automático (substitui
--     a automação "sincronizarEstoquePorMovimentacao" do Base44)
--   • gerar_numero_sequencial(p_tipo) — RPC que gera código aleatório único
--     (port fiel de gerarNumeroSequencial: XXX-XXX alfanumérico, validando
--     unicidade contra a tabela/field mapeada)
-- Opera sobre o esquema JSONB-first (tabela.dados jsonb).

create extension if not exists pgcrypto;

-- =====================================================================
-- Helpers: bloco aleatório alfanumérico (charset igual ao TS original)
-- =====================================================================
create or replace function public._gerar_bloco_aleatorio(p_tam int default 3)
returns text language plpgsql security definer as $$
declare
  charset text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  resultado text := '';
  idx int;
begin
  bytes := gen_random_bytes(p_tam);
  for i in 0..p_tam-1 loop
    idx := get_byte(bytes, i) % char_length(charset);
    resultado := resultado || substr(charset, idx + 1, 1);
  end loop;
  return resultado;
end;
$$;

-- =====================================================================
-- 1) RECALCULAR ESTOQUE DE UM PRODUTO
-- =====================================================================
create or replace function public.recalcular_estoque_produto(p_produto_id text)
returns jsonb language plpgsql security definer as $$
declare
  v_saldo numeric := 0;
  v_avariado numeric := 0;
  v_atual numeric := 0;
  v_novo numeric := 0;
  v_count int := 0;
begin
  select coalesce(sum(
    case
      when (m.dados->>'tipo') = 'Entrada' then
        case when (m.dados->>'quantidade') ~ '^-?[0-9]+(\.[0-9]+)?$'
             then (m.dados->>'quantidade')::numeric else 0 end
      when (m.dados->>'tipo') = 'Saída' then
        case when (m.dados->>'quantidade') ~ '^-?[0-9]+(\.[0-9]+)?$'
             then -(m.dados->>'quantidade')::numeric else 0 end
      else 0
    end
  ), 0), count(*)
  into v_saldo, v_count
  from public.movimentacao_estoque m
  where m.dados->>'produto_id' = p_produto_id;

  select coalesce(
      case when (p.dados->>'estoque_avariado') ~ '^-?[0-9]+(\.[0-9]+)?$'
           then (p.dados->>'estoque_avariado')::numeric else 0 end, 0),
     coalesce(
      case when (p.dados->>'estoque_atual') ~ '^-?[0-9]+(\.[0-9]+)?$'
           then (p.dados->>'estoque_atual')::numeric else 0 end, 0)
  into v_avariado, v_atual
  from public.produto p
  where p.id = p_produto_id;

  v_novo := greatest(0, v_saldo - v_avariado);

  if v_novo is distinct from v_atual then
    update public.produto
      set dados = jsonb_set(dados, '{estoque_atual}', to_jsonb(v_novo))
    where id = p_produto_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'produto_id', p_produto_id,
    'estoque_anterior', v_atual,
    'estoque_atual', v_novo,
    'movimentos', v_count,
    'atualizado', (v_novo is distinct from v_atual)
  );
exception when others then
  return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

-- =====================================================================
-- 2) TRIGGER: recalculo automático de estoque ao gravar movimentação
--    Substitui a automação "sincronizarEstoquePorMovimentacao".
-- =====================================================================
create or replace function public.trg_recalc_estoque_mov()
returns trigger language plpgsql security definer as $$
declare
  v_pid text;
begin
  v_pid := case
    when tg_op = 'DELETE' then old.dados->>'produto_id'
    else new.dados->>'produto_id'
  end;
  if v_pid is null then
    return null;
  end if;
  perform public.recalcular_estoque_produto(v_pid);
  return null;
end;
$$;

drop trigger if exists trg_movimentacao_estoque_recalc on public.movimentacao_estoque;
create trigger trg_movimentacao_estoque_recalc
  after insert or update or delete on public.movimentacao_estoque
  for each row execute function public.trg_recalc_estoque_mov();

-- =====================================================================
-- 3) GERAR NÚMERO SEQUENCIAL (RPC)
--    Port fiel de gerarNumeroSequencial: gera "XXX-XXX" aleatório e valida
--    unicidade contra o field mapeado (numero/codigo) da tabela da entidade.
-- =====================================================================
create or replace function public.gerar_numero_sequencial(p_tipo text)
returns jsonb language plpgsql security definer as $$
declare
  v_table text;
  v_field text;
  v_existing text;
  v_codigo text;
  r record;
begin
  case p_tipo
    when 'PV'  then v_table := 'pedido_venda';      v_field := 'numero';
    when 'DT'  then v_table := 'devolucao_troca';   v_field := 'numero';
    when 'VC'  then v_table := 'vale_compra';       v_field := 'codigo';
    when 'TC'  then v_table := 'turno_caixa';       v_field := 'numero';
    when 'MCX' then v_table := 'movimentos_caixa';  v_field := 'numero';
    when 'PC'  then v_table := 'pedido_compra';     v_field := 'numero';
    when 'CI'  then v_table := 'consumo_interno';   v_field := 'numero';
    else
      return jsonb_build_object('error', 'Tipo "' || p_tipo || '" não suportado.');
  end case;

  for i in 1..50 loop
    v_codigo := public._gerar_bloco_aleatorio(3) || '-' || public._gerar_bloco_aleatorio(3);
    execute format(
      'select 1 from public.%I where (dados->>%L) = %L limit 1',
      v_table, v_field, v_codigo
    ) into v_existing;
    if v_existing is null then
      return jsonb_build_object('numero', v_codigo);
    end if;
  end loop;

  return jsonb_build_object('error', 'Não foi possível gerar um identificador único.');
end;
$$;

-- Permissões: qualquer role autenticada pode chamar os RPCs.
-- (RLS fica desativado no esquema single-tenant, conforme migration 008.)
revoke all on function public.recalcular_estoque_produto(text) from public;
revoke all on function public.gerar_numero_sequencial(text) from public;
grant execute on function public.recalcular_estoque_produto(text) to authenticated, anon, service_role;
grant execute on function public.gerar_numero_sequencial(text) to authenticated, anon, service_role;