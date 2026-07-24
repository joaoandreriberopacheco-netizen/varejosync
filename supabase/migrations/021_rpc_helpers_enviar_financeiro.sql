-- 021_rpc_helpers_enviar_financeiro.sql
-- Helpers partilhados + RPC enviar_financeiro_lote_um_pedido (Onda 1).
-- A Edge Function enviar-financeiro-lote itera pedidos e chama esta RPC por pedido.

-- =====================================================================
-- Helpers
-- =====================================================================
create or replace function public._p38_hoje_acre()
returns date language sql stable as $$
  select (now() at time zone 'America/Rio_Branco')::date;
$$;

create or replace function public._p38_add_dias_uteis(p_data date, p_dias int)
returns date language plpgsql immutable as $$
declare
  d date := p_data;
  added int := 0;
  dow int;
begin
  if p_dias <= 0 then return p_data; end if;
  while added < p_dias loop
    d := d + 1;
    dow := extract(dow from d)::int;
    if dow not in (0, 6) then added := added + 1; end if;
  end loop;
  return d;
end;
$$;

create or replace function public._p38_insert_lancamento(p jsonb)
returns text language plpgsql security definer as $$
declare
  v_id text := coalesce(nullif(p->>'id', ''), gen_random_uuid()::text);
begin
  insert into public.lancamento_financeiro (
    id, tipo, descricao, valor, status,
    data_vencimento, data_pagamento,
    conta_financeira_id, referencia_tipo, referencia_id,
    observacoes, dados, extras
  ) values (
    v_id,
    p->>'tipo',
    p->>'descricao',
    coalesce(nullif(p->>'valor', '')::numeric, 0),
    coalesce(p->>'status', 'Em Aberto'),
    nullif(p->>'data_vencimento', '')::date,
    nullif(p->>'data_pagamento', '')::date,
    nullif(p->>'conta_financeira_id', ''),
    p->>'referencia_tipo',
    nullif(p->>'referencia_id', ''),
    p->>'observacoes',
    p,
    coalesce(p->'extras', '{}'::jsonb)
  );
  return v_id;
end;
$$;

-- =====================================================================
-- Enviar um pedido de compra ao financeiro (transação única por pedido)
-- =====================================================================
create or replace function public.enviar_financeiro_lote_um_pedido(p_payload jsonb)
returns jsonb language plpgsql security definer as $$
declare
  v_pedido_id text := p_payload->>'pedido_id';
  v_user_name text := coalesce(p_payload->>'user_name', 'Usuário');
  v_user_id text := p_payload->>'user_id';
  v_forma text := coalesce(p_payload->>'forma_pagamento', 'Parcelado');
  v_data_venc date := coalesce(nullif(p_payload->>'data_primeiro_vencimento', '')::date, public._p38_hoje_acre());
  v_parcelas int := greatest(1, coalesce(nullif(p_payload->>'num_parcelas', '')::int, 1));
  v_intervalo int := greatest(1, coalesce(nullif(p_payload->>'intervalo_parcelas_dias', '')::int, 30));

  v_pedido record;
  v_status text;
  v_numero text;
  v_valor_itens numeric;
  v_valor_total numeric;
  v_item jsonb;
  v_lanc record;
  v_i int;
  v_valor_parcela numeric;
  v_venc date;
  v_base jsonb;
  v_historico text;
begin
  if v_pedido_id is null then
    return jsonb_build_object('error', 'Pedido sem id');
  end if;

  select * into v_pedido from public.pedido_compra where id = v_pedido_id for update;
  if not found then
    return jsonb_build_object('error', 'Pedido não encontrado');
  end if;

  v_status := coalesce(v_pedido.status, v_pedido.dados->>'status');
  v_numero := coalesce(v_pedido.numero, v_pedido.dados->>'numero', v_pedido_id);

  if v_status is distinct from 'Rascunho' then
    return jsonb_build_object('error', format('Pedido %s não está em Rascunho', v_numero));
  end if;

  -- Bloqueia se já existir parcela paga
  if exists (
    select 1 from public.lancamento_financeiro l
    where (
      coalesce(l.dados->>'pedido_compra_vinculado_id', '') = v_pedido_id
      or (l.referencia_id = v_pedido_id and coalesce(l.referencia_tipo, l.dados->>'referencia_tipo') = 'PedidoCompra')
    )
    and coalesce(l.status, l.dados->>'status') = 'Pago'
  ) then
    return jsonb_build_object('error', format('Pedido %s tem parcelas pagas', v_numero));
  end if;

  -- Cancela lançamentos em aberto/vencidos
  update public.lancamento_financeiro l
    set status = 'Cancelado',
        dados = jsonb_set(
          coalesce(l.dados, '{}'::jsonb),
          '{status}',
          '"Cancelado"'
        ),
        observacoes = trim(both from coalesce(l.observacoes, l.dados->>'observacoes', '') || E'\n[Cancelado: envio em lote ao financeiro]')
    where (
      coalesce(l.dados->>'pedido_compra_vinculado_id', '') = v_pedido_id
      or (l.referencia_id = v_pedido_id and coalesce(l.referencia_tipo, l.dados->>'referencia_tipo') = 'PedidoCompra')
    )
    and coalesce(l.status, l.dados->>'status') in ('Em Aberto', 'Vencido')
    and coalesce(l.data_pagamento, nullif(l.dados->>'data_pagamento', '')::date) is null;

  -- Valor itens
  v_valor_itens := 0;
  if jsonb_typeof(coalesce(v_pedido.dados->'itens', '[]'::jsonb)) = 'array' then
    for v_item in select * from jsonb_array_elements(coalesce(v_pedido.dados->'itens', '[]'::jsonb))
    loop
      v_valor_itens := v_valor_itens + coalesce(
        nullif(v_item->>'total', '')::numeric,
        nullif(v_item->>'valor_total_item', '')::numeric,
        nullif(v_item->>'subtotal', '')::numeric,
        0
      );
    end loop;
  else
    v_valor_itens := coalesce(
      nullif(v_pedido.dados->>'valor_itens', '')::numeric,
      nullif(v_pedido.dados->>'valor_itens', '')::numeric,
      0
    );
  end if;
  v_valor_itens := round(v_valor_itens, 2);

  v_valor_total := round(
    v_valor_itens
    + coalesce(nullif(v_pedido.dados->>'valor_frete', '')::numeric, 0)
    - coalesce(nullif(v_pedido.dados->>'valor_desconto', '')::numeric, 0),
    2
  );
  if v_valor_total <= 0 then
    v_valor_total := round(coalesce(nullif(v_pedido.dados->>'valor_total', '')::numeric, v_valor_itens), 2);
  end if;

  v_base := jsonb_build_object(
    'tipo', 'Despesa',
    'terceiro_id', coalesce(v_pedido.dados->>'fornecedor_id', v_pedido.dados->>'terceiro_id'),
    'terceiro_nome', coalesce(v_pedido.dados->>'fornecedor_nome', v_pedido.dados->>'terceiro_nome'),
    'status', 'Em Aberto',
    'categoria', 'Compra de Mercadoria',
    'referencia_id', v_pedido_id,
    'referencia_tipo', 'PedidoCompra',
    'referencia_numero', v_numero,
    'is_custo_mercadoria', true,
    'pedido_compra_vinculado_id', v_pedido_id,
    'pedido_compra_vinculado_numero', v_numero
  );

  if v_forma = 'À Vista' then
    perform public._p38_insert_lancamento(v_base || jsonb_build_object(
      'descricao', format('Compra de Mercadoria - %s (À Vista)', v_numero),
      'forma_pagamento_tipo', 'À Vista',
      'forma_pagamento_compra', 'À Vista',
      'valor', v_valor_total,
      'data_vencimento', v_data_venc::text,
      'observacoes', 'Pagamento à vista. Aguardando aprovação do financeiro.'
    ));
    v_parcelas := 1;
  else
    v_valor_parcela := v_valor_total / v_parcelas;
    for v_i in 0..(v_parcelas - 1) loop
      v_venc := public._p38_add_dias_uteis(v_data_venc, v_i * v_intervalo);
      perform public._p38_insert_lancamento(v_base || jsonb_build_object(
        'descricao', format('Compra de Mercadoria - %s (%s/%s)', v_numero, v_i + 1, v_parcelas),
        'forma_pagamento_tipo', 'Parcelado',
        'forma_pagamento_compra', 'Parcelado',
        'valor', v_valor_parcela,
        'data_vencimento', v_venc::text,
        'observacoes', format('Parcela %s de %s. Aguardando aprovação do financeiro.', v_i + 1, v_parcelas)
      ));
    end loop;
  end if;

  v_historico := coalesce(v_pedido.dados->>'historico', '') ||
    format(E'\n[Enviado ao financeiro em lote: %s | %s]', v_user_name, now()::text);

  update public.pedido_compra
    set dados = coalesce(dados, '{}'::jsonb) || jsonb_build_object(
      'status', 'Aguardando Aprovação Financeira',
      'status_aprovacao_financeira', 'Aguardando Aprovação Financeira',
      'forma_pagamento_compra', v_forma,
      'data_primeiro_vencimento', v_data_venc::text,
      'num_parcelas', case when v_forma = 'Parcelado' then v_parcelas else 1 end,
      'intervalo_parcelas_dias', v_intervalo,
      'valor_itens', v_valor_itens,
      'valor_total', v_valor_total,
      'historico', v_historico
    )
  where id = v_pedido_id;

  insert into public.tarefa (id, dados, titulo, tipo, status, prioridade, responsavel_id, responsavel_nome, referencia_tipo, referencia_id, referencia_numero, valor_pendente, descricao, data_vencimento)
  values (
    gen_random_uuid()::text,
    jsonb_build_object(
      'titulo', format('Recebimento de Mercadoria - %s', v_numero),
      'tipo', 'Recebimento de Mercadoria',
      'status', 'Pendente',
      'prioridade', 'Alta',
      'responsavel_id', v_user_id,
      'responsavel_nome', v_user_name,
      'referencia_tipo', 'PedidoCompra',
      'referencia_id', v_pedido_id,
      'referencia_numero', v_numero,
      'valor_pendente', v_valor_total,
      'descricao', format('Aguardando recebimento da mercadoria do fornecedor %s.', coalesce(v_pedido.dados->>'fornecedor_nome', '')),
      'data_vencimento', coalesce(
        left(v_pedido.dados->>'data_prevista_entrega', 10),
        v_data_venc::text
      )
    ),
    format('Recebimento de Mercadoria - %s', v_numero),
    'Recebimento de Mercadoria',
    'Pendente',
    'Alta',
    v_user_id,
    v_user_name,
    'PedidoCompra',
    v_pedido_id,
    v_numero,
    v_valor_total,
    format('Aguardando recebimento da mercadoria do fornecedor %s.', coalesce(v_pedido.dados->>'fornecedor_nome', '')),
    coalesce(left(v_pedido.dados->>'data_prevista_entrega', 10), v_data_venc::text)::date
  );

  return jsonb_build_object('success', true, 'pedido_id', v_pedido_id);
exception when others then
  return jsonb_build_object('error', sqlerrm);
end;
$$;

revoke all on function public._p38_insert_lancamento(jsonb) from public, anon, authenticated;
revoke all on function public.enviar_financeiro_lote_um_pedido(jsonb) from public, anon, authenticated;
grant execute on function public._p38_insert_lancamento(jsonb) to service_role;
grant execute on function public.enviar_financeiro_lote_um_pedido(jsonb) to service_role;
