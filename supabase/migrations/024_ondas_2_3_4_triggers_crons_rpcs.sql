-- 024_ondas_2_3_4_triggers_crons_rpcs.sql
-- Triggers, crons e RPCs para ondas 2–4 (complementa Edge Functions portadas).

alter table public.pedido_compra add column if not exists status_aprovacao_financeira text;
alter table public.pedido_compra add column if not exists aprovacao_reabertura_financeiro boolean default false;
alter table public.pedido_compra add column if not exists manifesto_entrada_id text;
alter table public.pedido_compra add column if not exists data_aprovacao_financeira timestamptz;
alter table public.pedido_compra add column if not exists data_rejeicao_financeira timestamptz;
alter table public.pedido_compra add column if not exists dados jsonb not null default '{}'::jsonb;

-- =====================================================================
-- listar_anexos (Onda 2)
-- =====================================================================
create or replace function public.listar_anexos(p_referencia_tipo text, p_referencia_id text)
returns jsonb language plpgsql security definer stable as $$
declare v_rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(a) - 'dados' || coalesce(a.dados, '{}'::jsonb)), '[]'::jsonb)
  into v_rows
  from public.anexo_documento a
  where coalesce(a.referencia_tipo, a.dados->>'referencia_tipo') = p_referencia_tipo
    and coalesce(a.referencia_id, a.dados->>'referencia_id') = p_referencia_id;
  return jsonb_build_object('anexos', v_rows);
end;
$$;

-- =====================================================================
-- list_flare_pending (Onda 4)
-- =====================================================================
create or replace function public.list_flare_pending(p_limit int default 500)
returns jsonb language plpgsql security definer stable as $$
begin
  return (
    select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    from (
      select * from public.target_flare
      where coalesce(status, dados->>'status') = 'pending'
      order by created_at desc
      limit greatest(1, least(coalesce(p_limit, 500), 1000))
    ) t
  );
end;
$$;

-- =====================================================================
-- Trigger: automação aprovação financeira (PedidoCompra update)
-- =====================================================================
create or replace function public.trg_pedido_compra_aprovacao_financeira_fn()
returns trigger language plpgsql security definer as $$
declare
  v_atualizacoes jsonb := '{}'::jsonb;
  v_hist text;
  v_reg text;
begin
  if TG_OP <> 'UPDATE' then return NEW; end if;

  -- REGRA 1: Aprovado → aprovar financeiro
  if NEW.status = 'Aprovado' and coalesce(OLD.status, '') <> 'Aprovado'
     and coalesce(NEW.status_aprovacao_financeira, '') <> 'Aprovado' then
    v_atualizacoes := v_atualizacoes || jsonb_build_object(
      'status_aprovacao_financeira', 'Aprovado',
      'data_aprovacao_financeira', now()
    );
    v_reg := format('[AUTOMÁTICO] Status financeiro aprovado automaticamente em %s devido à aprovação do pedido.',
      to_char(now() at time zone 'America/Rio_Branco', 'DD/MM/YYYY HH24:MI'));
  end if;

  -- REGRA 2: reabertura financeira aprovada
  if coalesce(NEW.status_aprovacao_financeira, '') = 'Solicitação de Edição Pendente'
     and coalesce(NEW.aprovacao_reabertura_financeiro, false) = true
     and coalesce(OLD.aprovacao_reabertura_financeiro, false) = false then
    if coalesce(NEW.manifesto_entrada_id, NEW.dados->>'manifesto_entrada_id', '') <> '' then
      raise exception 'Não é possível reabrir o pedido. Ele está vinculado a um manifesto.';
    end if;
    v_atualizacoes := v_atualizacoes || jsonb_build_object(
      'status', 'Rascunho',
      'status_aprovacao_financeira', 'Aguardando Aprovação',
      'aprovacao_reabertura_financeiro', false
    );
    v_reg := coalesce(v_reg, '') || format(E'\n[AUTOMÁTICO] Pedido reaberto para edição em %s após aprovação do financeiro.',
      to_char(now() at time zone 'America/Rio_Branco', 'DD/MM/YYYY HH24:MI'));
  end if;

  -- REGRA 3: Rejeitado/Cancelado
  if NEW.status in ('Rejeitado', 'Cancelado')
     and coalesce(OLD.status, '') not in ('Rejeitado', 'Cancelado')
     and coalesce(NEW.status_aprovacao_financeira, '') <> 'Rejeitado' then
    v_atualizacoes := v_atualizacoes || jsonb_build_object(
      'status_aprovacao_financeira', 'Rejeitado',
      'data_rejeicao_financeira', now()
    );
    v_reg := coalesce(v_reg, '') || format(E'\n[AUTOMÁTICO] Status financeiro rejeitado automaticamente em %s.',
      to_char(now() at time zone 'America/Rio_Branco', 'DD/MM/YYYY HH24:MI'));
  end if;

  if v_atualizacoes = '{}'::jsonb then return NEW; end if;

  v_hist := coalesce(NEW.historico, '') || coalesce(v_reg, '');
  NEW := NEW;
  NEW.status := coalesce(v_atualizacoes->>'status', NEW.status);
  NEW.status_aprovacao_financeira := coalesce(v_atualizacoes->>'status_aprovacao_financeira', NEW.status_aprovacao_financeira);
  NEW.data_aprovacao_financeira := coalesce((v_atualizacoes->>'data_aprovacao_financeira')::timestamptz, NEW.data_aprovacao_financeira);
  NEW.data_rejeicao_financeira := coalesce((v_atualizacoes->>'data_rejeicao_financeira')::timestamptz, NEW.data_rejeicao_financeira);
  NEW.aprovacao_reabertura_financeiro := coalesce((v_atualizacoes->>'aprovacao_reabertura_financeiro')::boolean, NEW.aprovacao_reabertura_financeiro);
  NEW.historico := v_hist;
  return NEW;
end;
$$;

drop trigger if exists trg_pedido_compra_aprovacao_financeira on public.pedido_compra;
create trigger trg_pedido_compra_aprovacao_financeira
  before update on public.pedido_compra
  for each row execute function public.trg_pedido_compra_aprovacao_financeira_fn();

-- =====================================================================
-- Trigger: atualizar totais supermanifesto
-- =====================================================================
create or replace function public.atualizar_totais_supermanifesto(p_supermanifesto_id text)
returns void language plpgsql security definer as $$
declare
  v_vol int := 0;
  v_peso numeric := 0;
  v_valor numeric := 0;
begin
  select
    coalesce(sum(coalesce((m.dados->>'volumes')::int, 0)), 0),
    coalesce(sum(coalesce((m.dados->>'peso_kg')::numeric, 0)), 0),
    coalesce(sum(coalesce((m.dados->>'valor_total')::numeric, 0)), 0)
  into v_vol, v_peso, v_valor
  from public.manifesto_entrada m
  where coalesce(m.dados->>'supermanifesto_id', '') = p_supermanifesto_id;

  update public.supermanifesto s
    set dados = coalesce(s.dados, '{}'::jsonb) || jsonb_build_object(
      'total_volumes', v_vol,
      'peso_total_kg', v_peso,
      'valor_total_carga', v_valor,
      'updated_at', now()
    )
  where s.id = p_supermanifesto_id;
end;
$$;

create or replace function public.trg_manifesto_atualiza_supermanifesto_fn()
returns trigger language plpgsql security definer as $$
declare v_sid text;
begin
  v_sid := coalesce(NEW.dados->>'supermanifesto_id', OLD.dados->>'supermanifesto_id');
  if v_sid is not null and v_sid <> '' then
    perform public.atualizar_totais_supermanifesto(v_sid);
  end if;
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists trg_manifesto_atualiza_supermanifesto on public.manifesto_entrada;
create trigger trg_manifesto_atualiza_supermanifesto
  after insert or update or delete on public.manifesto_entrada
  for each row execute function public.trg_manifesto_atualiza_supermanifesto_fn();

-- =====================================================================
-- zerar_entidade (admin)
-- =====================================================================
create or replace function public.zerar_entidade(p_entity text)
returns jsonb language plpgsql security definer as $$
declare
  v_table text;
  v_count int;
  v_allowed text[] := array[
    'produto','terceiro','pedido_compra','pedido_venda','lancamento_financeiro',
    'movimentacao_estoque','anexo_documento','target_flare','embarque'
  ];
begin
  v_table := lower(replace(p_entity, ' ', '_'));
  case p_entity
    when 'Produto' then v_table := 'produto';
    when 'Terceiro' then v_table := 'terceiro';
    when 'PedidoCompra' then v_table := 'pedido_compra';
    when 'PedidoVenda' then v_table := 'pedido_venda';
    when 'LancamentoFinanceiro' then v_table := 'lancamento_financeiro';
    when 'MovimentacaoEstoque' then v_table := 'movimentacao_estoque';
    when 'AnexoDocumento' then v_table := 'anexo_documento';
    when 'TargetFlare' then v_table := 'target_flare';
    when 'Embarque' then v_table := 'embarque';
    else null;
  end case;
  if v_table is null or not (v_table = any(v_allowed)) then
    return jsonb_build_object('error', 'Entidade não permitida para zerar');
  end if;
  execute format('delete from public.%I', v_table);
  get diagnostics v_count = row_count;
  return jsonb_build_object('success', true, 'entity', p_entity, 'deleted', v_count);
end;
$$;

-- =====================================================================
-- export_produtos_compra
-- =====================================================================
create or replace function public.export_produtos_compra()
returns jsonb language plpgsql security definer stable as $$
declare
  v_csv text := 'codigo;nome;unidade;estoque_atual;preco_venda' || E'\n';
  v_row record;
begin
  for v_row in
    select p.id, p.nome, p.sku, p.estoque_atual, p.preco_venda, p.dados
    from public.produto p
    where coalesce(p.ativo, (p.dados->>'ativo')::boolean, true) = true
    limit 10000
  loop
    v_csv := v_csv || format('%s;%s;%s;%s;%s' || E'\n',
      coalesce(v_row.sku, v_row.dados->>'codigo', v_row.id),
      replace(coalesce(v_row.nome, v_row.dados->>'nome', ''), ';', ','),
      coalesce(v_row.dados->>'unidade_sigla', 'UN'),
      coalesce(v_row.estoque_atual, (v_row.dados->>'estoque_atual')::numeric, 0),
      coalesce(v_row.preco_venda, (v_row.dados->>'preco_venda')::numeric, 0)
    );
  end loop;
  return jsonb_build_object(
    'file_content', encode(convert_to(chr(239)||chr(187)||chr(191)||v_csv, 'UTF8'), 'base64'),
    'filename', 'modelo_importacao_compra.csv'
  );
end;
$$;

-- Permissões
revoke all on function public.listar_anexos(text, text) from public, anon, authenticated;
revoke all on function public.list_flare_pending(int) from public, anon, authenticated;
revoke all on function public.zerar_entidade(text) from public, anon, authenticated;
revoke all on function public.export_produtos_compra() from public, anon, authenticated;
grant execute on function public.listar_anexos(text, text) to service_role;
grant execute on function public.list_flare_pending(int) to service_role;
grant execute on function public.zerar_entidade(text) to service_role;
grant execute on function public.export_produtos_compra() to service_role;
