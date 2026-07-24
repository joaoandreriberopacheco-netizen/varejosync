-- 023_onda1_crons_triggers.sql
-- Onda 1 (restante): crons, triggers e tabela pagamento_cartao_detalhe.

alter table public.pedido_compra add column if not exists dados jsonb not null default '{}'::jsonb;
alter table public.embarque add column if not exists dados jsonb not null default '{}'::jsonb;
alter table public.movimentacao_estoque add column if not exists dados jsonb not null default '{}'::jsonb;

-- Tabelas criadas em 000_bootstrap_jsonb_all podem existir só com (id, dados).
-- Promove colunas usadas por jobs/triggers abaixo (IF NOT EXISTS — seguro em re-run).
alter table public.conta_recorrente add column if not exists nome_despesa text;
alter table public.conta_recorrente add column if not exists terceiro_id text;
alter table public.conta_recorrente add column if not exists terceiro_nome text;
alter table public.conta_recorrente add column if not exists categoria_financeira_id text;
alter table public.conta_recorrente add column if not exists categoria_nome text;
alter table public.conta_recorrente add column if not exists valor_previsto numeric(15, 2);
alter table public.conta_recorrente add column if not exists frequencia text;
alter table public.conta_recorrente add column if not exists dia_vencimento int;
alter table public.conta_recorrente add column if not exists ativa boolean default true;

alter table public.conta_prevista add column if not exists descricao text;
alter table public.conta_prevista add column if not exists terceiro_id text;
alter table public.conta_prevista add column if not exists terceiro_nome text;
alter table public.conta_prevista add column if not exists categoria_financeira_id text;
alter table public.conta_prevista add column if not exists categoria_nome text;
alter table public.conta_prevista add column if not exists valor numeric(15, 2);
alter table public.conta_prevista add column if not exists data_vencimento date;
alter table public.conta_prevista add column if not exists natureza text;
alter table public.conta_prevista add column if not exists conta_recorrente_id text;
alter table public.conta_prevista add column if not exists periodo_referencia date;
alter table public.conta_prevista add column if not exists tem_anexo boolean default false;
alter table public.conta_prevista add column if not exists tem_boleto boolean default false;
alter table public.conta_prevista add column if not exists tem_comprovante boolean default false;
alter table public.conta_prevista add column if not exists status_visual text default 'pendente';
alter table public.conta_prevista add column if not exists status text default 'Pendente';

alter table public.lancamento_financeiro add column if not exists referencia_tipo text;
alter table public.lancamento_financeiro add column if not exists referencia_id text;
alter table public.lancamento_financeiro add column if not exists status text;

alter table public.contas_financeiras add column if not exists nome text;
alter table public.categoria_financeira add column if not exists nome text;

alter table public.pedido_compra add column if not exists numero text;
alter table public.pedido_compra add column if not exists itens jsonb default '[]'::jsonb;
alter table public.pedido_compra add column if not exists historico text;

alter table public.embarque add column if not exists pedido_compra_id text;
alter table public.embarque add column if not exists status_recebimento text;
alter table public.embarque add column if not exists itens jsonb default '[]'::jsonb;

alter table public.movimentacao_estoque add column if not exists unidade_medida text;
alter table public.movimentacao_estoque add column if not exists unidade_sigla text;
alter table public.movimentacao_estoque add column if not exists fator_conversao numeric;
alter table public.movimentacao_estoque add column if not exists quantidade_base numeric;

drop index if exists public.idx_conta_prevista_recorrente_competencia_lookup;
drop index if exists public.uq_conta_prevista_recorrente_competencia_mes;

create index if not exists idx_conta_prevista_recorrente_competencia_lookup
  on public.conta_prevista (
    conta_recorrente_id,
    (date_trunc('month', coalesce(periodo_referencia, data_vencimento)::timestamp))
  )
  where conta_recorrente_id is not null;

create unique index if not exists uq_conta_prevista_recorrente_competencia_mes
  on public.conta_prevista (
    conta_recorrente_id,
    (date_trunc('month', coalesce(periodo_referencia, data_vencimento)::timestamp))
  )
  where conta_recorrente_id is not null;

-- Port de:
--   • gerarLancamentosCartao          → job_gerar_lancamentos_cartao + pg_cron
--   • gerarContasPrevistasRecorrentes → job_gerar_contas_previstas_recorrentes + pg_cron
--   • sincronizarContaPrevia            → trigger trg_conta_prevista_pago
--   • sincronizarExclusaoContaRecorrente → trigger trg_conta_recorrente_delete_cascade

-- =====================================================================
-- Tabela legada PagamentoCartaoDetalhe (pipeline paralelo ao PDV)
-- =====================================================================
create table if not exists public.pagamento_cartao_detalhe (
  id          text primary key,
  dados       jsonb not null default '{}'::jsonb,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_pagamento_cartao_detalhe_data_venda
  on public.pagamento_cartao_detalhe ((dados->>'data_venda'));

create index if not exists idx_pagamento_cartao_detalhe_status
  on public.pagamento_cartao_detalhe ((dados->>'status_conciliacao'));

drop trigger if exists trg_pagamento_cartao_detalhe_set_updated_at on public.pagamento_cartao_detalhe;
create trigger trg_pagamento_cartao_detalhe_set_updated_at
  before update on public.pagamento_cartao_detalhe
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Job: gerar lançamentos de cartão a partir de PagamentoCartaoDetalhe
-- (paridade com base44/functions/gerarLancamentosCartao)
-- =====================================================================
create or replace function public.job_gerar_lancamentos_cartao()
returns jsonb language plpgsql security definer as $$
declare
  v_ontem date := (public._p38_hoje_acre() - interval '1 day')::date;
  v_pgto record;
  v_maq record;
  v_cat record;
  v_liquidacao date;
  v_lanc_receita_id text;
  v_lancamentos int := 0;
  v_erros jsonb := '[]'::jsonb;
  v_valor_liquido numeric;
  v_valor_taxa numeric;
  v_conta_destino_id text;
begin
  for v_pgto in
    select p.id, p.dados
    from public.pagamento_cartao_detalhe p
    where coalesce(p.dados->>'data_venda', '') = v_ontem::text
      and coalesce(p.dados->>'status_conciliacao', 'Pendente') = 'Pendente'
  loop
    begin
      select * into v_maq
      from public.maquininha m
      where m.id = v_pgto.dados->>'maquininha_id';

      if not found then
        continue;
      end if;

      v_liquidacao := public._p38_add_dias_uteis(v_ontem, 1);
      v_valor_liquido := coalesce(
        nullif(v_pgto.dados->>'valor_liquido', '')::numeric,
        nullif(v_pgto.dados->>'valor_liquido_recebido', '')::numeric,
        nullif(v_pgto.dados->>'valor_bruto', '')::numeric,
        0
      );
      v_valor_taxa := coalesce(nullif(v_pgto.dados->>'valor_taxa_total', '')::numeric, 0);
      v_conta_destino_id := coalesce(
        nullif(v_pgto.dados->>'conta_destino_id', ''),
        nullif(v_maq.dados->>'conta_destino_id', '')
      );

      if v_conta_destino_id is null then
        raise exception 'Maquininha sem conta destino';
      end if;

      v_lanc_receita_id := public._p38_insert_lancamento(jsonb_build_object(
        'tipo', 'Receita',
        'descricao', format(
          'Venda Cartão %s %s %s — %s — Pedido %s',
          coalesce(v_pgto.dados->>'modalidade', ''),
          coalesce(v_pgto.dados->>'bandeira', ''),
          case when coalesce(nullif(v_pgto.dados->>'parcelas', '')::int, 1) > 1
            then (v_pgto.dados->>'parcelas') || 'x' else '' end,
          coalesce(v_pgto.dados->>'maquininha_nome', v_maq.dados->>'nome', ''),
          coalesce(v_pgto.dados->>'pedido_numero', v_pgto.dados->>'pedido_venda_id', '')
        ),
        'valor', coalesce(nullif(v_pgto.dados->>'valor_bruto', '')::numeric, 0),
        'valor_liquido', v_valor_liquido,
        'conta_financeira_id', v_conta_destino_id,
        'conta_financeira_nome', coalesce(v_pgto.dados->>'maquininha_nome', v_maq.dados->>'nome', ''),
        'forma_pagamento', format('%s %s',
          coalesce(v_pgto.dados->>'modalidade', ''),
          coalesce(v_pgto.dados->>'bandeira', '')
        ),
        'forma_pagamento_tipo', case
          when v_pgto.dados->>'modalidade' = 'Débito' then 'Cartão Débito'
          else 'Cartão Crédito'
        end,
        'data_vencimento', v_liquidacao::text,
        'data_liquidacao_prevista', v_liquidacao::text,
        'referencia_id', v_pgto.dados->>'pedido_venda_id',
        'referencia_tipo', 'PedidoVenda',
        'referencia_numero', v_pgto.dados->>'pedido_numero',
        'status', 'Em Aberto',
        'status_conciliacao', 'Pendente',
        'tags', jsonb_build_array(
          'cartao',
          lower(coalesce(v_pgto.dados->>'adquirente', '')),
          lower(coalesce(v_pgto.dados->>'bandeira', ''))
        )
      ));

      if v_valor_taxa > 0 then
        select * into v_cat
        from public.categoria_financeira c
        where lower(coalesce(c.nome, c.dados->>'nome', '')) like '%maquininha%'
           or lower(coalesce(c.nome, c.dados->>'nome', '')) like '%adquirente%'
        limit 1;

        perform public._p38_insert_lancamento(jsonb_build_object(
          'tipo', 'Despesa',
          'descricao', format(
            'Taxa Maquininha %s — %s%% — %s %s',
            coalesce(v_pgto.dados->>'maquininha_nome', v_maq.dados->>'nome', ''),
            coalesce(nullif(v_pgto.dados->>'taxa_total_percentual', '')::numeric, 0)::text,
            coalesce(v_pgto.dados->>'bandeira', ''),
            coalesce(v_pgto.dados->>'modalidade', '')
          ),
          'valor', v_valor_taxa,
          'valor_liquido', v_valor_taxa,
          'conta_financeira_id', v_conta_destino_id,
          'conta_financeira_nome', coalesce(v_pgto.dados->>'maquininha_nome', v_maq.dados->>'nome', ''),
          'categoria', coalesce(v_cat.nome, 'Custos de Maquininha'),
          'categoria_id', v_cat.id,
          'data_vencimento', v_liquidacao::text,
          'referencia_id', v_pgto.dados->>'pedido_venda_id',
          'referencia_tipo', 'PedidoVenda',
          'referencia_numero', v_pgto.dados->>'pedido_numero',
          'status', 'Em Aberto',
          'tags', jsonb_build_array('taxa-maquininha', lower(coalesce(v_pgto.dados->>'adquirente', '')))
        ));
      end if;

      update public.pagamento_cartao_detalhe
        set dados = coalesce(dados, '{}'::jsonb) || jsonb_build_object(
          'lancamento_financeiro_id', v_lanc_receita_id,
          'status_conciliacao', 'Lançamento Gerado'
        )
      where id = v_pgto.id;

      v_lancamentos := v_lancamentos + 1;
    exception when others then
      v_erros := v_erros || jsonb_build_object('id', v_pgto.id, 'erro', sqlerrm);
    end;
  end loop;

  return jsonb_build_object(
    'success', true,
    'data_referencia', v_ontem::text,
    'lancamentos_gerados', v_lancamentos,
    'erros', v_erros
  );
exception when others then
  return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

-- =====================================================================
-- Job: gerar contas previstas a partir de contas recorrentes (3 meses)
-- (paridade com base44/functions/gerarContasPrevistasRecorrentes)
-- =====================================================================
create or replace function public.job_gerar_contas_previstas_recorrentes()
returns jsonb language plpgsql security definer as $$
declare
  v_rec record;
  v_i int;
  v_ref date;
  v_vencimento date;
  v_periodo date;
  v_geradas int := 0;
  v_existe int;
  v_id text;
begin
  for v_rec in
    select * from public.conta_recorrente
    where coalesce(ativa, true) = true
  loop
    for v_i in 0..2 loop
      v_ref := (date_trunc('month', public._p38_hoje_acre()) + (v_i || ' months')::interval)::date;
      v_vencimento := make_date(
        extract(year from v_ref)::int,
        extract(month from v_ref)::int,
        least(
          v_rec.dia_vencimento,
          extract(day from (date_trunc('month', v_ref) + interval '1 month - 1 day'))::int
        )
      );
      v_periodo := date_trunc('month', v_ref)::date;

      select count(*) into v_existe
      from public.conta_prevista cp
      where cp.conta_recorrente_id = v_rec.id
        and date_trunc('month', coalesce(cp.periodo_referencia, cp.data_vencimento)::timestamp)
          = date_trunc('month', v_periodo::timestamp);

      if v_existe > 0 then
        continue;
      end if;

      v_id := gen_random_uuid()::text;
      insert into public.conta_prevista (
        id, descricao, terceiro_id, terceiro_nome,
        categoria_financeira_id, categoria_nome,
        valor, data_vencimento, natureza,
        conta_recorrente_id, periodo_referencia,
        tem_anexo, tem_boleto, tem_comprovante,
        status_visual, status
      ) values (
        v_id,
        v_rec.nome_despesa,
        v_rec.terceiro_id,
        v_rec.terceiro_nome,
        v_rec.categoria_financeira_id,
        v_rec.categoria_nome,
        v_rec.valor_previsto,
        v_vencimento,
        'Recorrente',
        v_rec.id,
        v_periodo,
        false, false, false,
        'pendente',
        'Pendente'
      );

      v_geradas := v_geradas + 1;
    end loop;
  end loop;

  return jsonb_build_object('success', true, 'geradas', v_geradas);
exception when others then
  return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

-- =====================================================================
-- Trigger: ContaPrevista → LancamentoFinanceiro quando status = Pago
-- (paridade com base44/functions/sincronizarContaPrevia)
-- =====================================================================
create or replace function public.trg_conta_prevista_pago_fn()
returns trigger language plpgsql security definer as $$
declare
  v_existe int;
  v_conta_id text;
begin
  if coalesce(NEW.status, '') <> 'Pago' then
    return NEW;
  end if;
  if coalesce(OLD.status, '') = 'Pago' then
    return NEW;
  end if;

  select count(*) into v_existe
  from public.lancamento_financeiro l
  where l.referencia_tipo = 'ContaPrevista'
    and l.referencia_id = NEW.id;

  if v_existe > 0 then
    return NEW;
  end if;

  select c.id into v_conta_id
  from public.contas_financeiras c
  where c.id = 'caixa_geral' or lower(coalesce(c.nome, c.dados->>'nome', '')) like '%caixa%geral%'
  order by case when c.id = 'caixa_geral' then 0 else 1 end
  limit 1;

  perform public._p38_insert_lancamento(jsonb_build_object(
    'tipo', 'Despesa',
    'descricao', NEW.descricao,
    'terceiro_id', NEW.terceiro_id,
    'terceiro_nome', NEW.terceiro_nome,
    'valor', NEW.valor,
    'valor_liquido', NEW.valor,
    'data_vencimento', NEW.data_vencimento::text,
    'data_pagamento', public._p38_hoje_acre()::text,
    'status', 'Pago',
    'categoria_id', NEW.categoria_financeira_id,
    'categoria', NEW.categoria_nome,
    'referencia_tipo', 'ContaPrevista',
    'referencia_id', NEW.id,
    'conta_financeira_id', coalesce(v_conta_id, 'caixa_geral')
  ));

  return NEW;
end;
$$;

drop trigger if exists trg_conta_prevista_pago on public.conta_prevista;
create trigger trg_conta_prevista_pago
  after update of status on public.conta_prevista
  for each row
  execute function public.trg_conta_prevista_pago_fn();

-- =====================================================================
-- Trigger: exclusão ContaRecorrente → remove previstas + lançamentos
-- (paridade com base44/functions/sincronizarExclusaoContaRecorrente)
-- =====================================================================
create or replace function public.trg_conta_recorrente_delete_cascade_fn()
returns trigger language plpgsql security definer as $$
declare
  v_prevista_ids text[];
begin
  select array_agg(cp.id) into v_prevista_ids
  from public.conta_prevista cp
  where cp.conta_recorrente_id = OLD.id;

  if v_prevista_ids is null or array_length(v_prevista_ids, 1) is null then
    return OLD;
  end if;

  delete from public.lancamento_financeiro l
  where l.referencia_tipo = 'ContaPrevista'
    and l.referencia_id = any(v_prevista_ids);

  delete from public.conta_prevista cp
  where cp.id = any(v_prevista_ids);

  return OLD;
end;
$$;

drop trigger if exists trg_conta_recorrente_delete_cascade on public.conta_recorrente;
create trigger trg_conta_recorrente_delete_cascade
  before delete on public.conta_recorrente
  for each row
  execute function public.trg_conta_recorrente_delete_cascade_fn();

-- =====================================================================
-- RPC corretiva: corrigir movimentos de recepção retroativos (um pedido)
-- A Edge Function orquestra o lote; cada pedido corre numa transação.
-- =====================================================================
create or replace function public._p38_round_qty(p numeric)
returns numeric language sql immutable as $$
  select round(coalesce(p, 0)::numeric, 6);
$$;

create or replace function public.corrigir_movimentos_recepcao_um_pedido(p_payload jsonb)
returns jsonb language plpgsql security definer as $$
declare
  v_pedido_id text := p_payload->>'pedido_id';
  v_dry_run boolean := coalesce((p_payload->>'dry_run')::boolean, true);
  v_user_email text := coalesce(p_payload->>'user_email', '');
  v_pedido record;
  v_embarques jsonb := '[]'::jsonb;
  v_emb_row record;
  v_emb_json record;
  v_itens_emb jsonb;
  v_item jsonb;
  v_itens_ped jsonb;
  v_recebido jsonb := '{}'::jsonb;
  v_movimentado jsonb := '{}'::jsonb;
  v_mov record;
  v_pid text;
  v_q numeric;
  v_fator numeric;
  v_r numeric;
  v_m numeric;
  v_faltante numeric;
  v_deltas jsonb := '[]'::jsonb;
  v_linha jsonb;
  v_tem_recepcao boolean := false;
  v_st text;
  v_linhas int := 0;
  v_produtos text[] := '{}';
  v_nome_prod text;
  v_unidade text;
  v_historico_tag text;
begin
  select * into v_pedido from public.pedido_compra where id = v_pedido_id;
  if not found then
    return jsonb_build_object('pedido_id', v_pedido_id, 'skipped', true, 'motivo', 'pedido_nao_encontrado');
  end if;

  v_itens_ped := coalesce(v_pedido.itens, v_pedido.dados->'itens', '[]'::jsonb);

  if jsonb_typeof(v_pedido.dados->'embarques_registrados') = 'array'
     and jsonb_array_length(v_pedido.dados->'embarques_registrados') > 0 then
    v_embarques := v_pedido.dados->'embarques_registrados';
  else
    for v_emb_row in select * from public.embarque e where e.pedido_compra_id = v_pedido_id
    loop
      v_embarques := v_embarques || jsonb_build_array(jsonb_build_object(
        'status_recebimento', coalesce(v_emb_row.status_recebimento, v_emb_row.dados->>'status_recebimento'),
        'status_recebimento_embarque', coalesce(v_emb_row.status_recebimento, v_emb_row.dados->>'status_recebimento_embarque'),
        'itens_embarcados', coalesce(v_emb_row.itens, v_emb_row.dados->'itens_embarcados', v_emb_row.dados->'itens', '[]'::jsonb)
      ));
    end loop;
  end if;

  for v_emb_json in select value as emb from jsonb_array_elements(v_embarques)
  loop
    v_st := trim(coalesce(v_emb_json.emb->>'status_recebimento', v_emb_json.emb->>'status_recebimento_embarque', ''));
    if v_st <> '' and v_st <> 'Pendente' then
      v_tem_recepcao := true;
    end if;

    v_itens_emb := case
      when jsonb_typeof(v_emb_json.emb->'itens_embarcados') = 'array' and jsonb_array_length(v_emb_json.emb->'itens_embarcados') > 0
        then v_emb_json.emb->'itens_embarcados'
      when jsonb_typeof(v_emb_json.emb->'itens') = 'array'
        then v_emb_json.emb->'itens'
      else '[]'::jsonb
    end;

    for v_item in select value as it from jsonb_array_elements(v_itens_emb) as t(value)
    loop
      v_q := coalesce(nullif(v_item.it->>'quantidade_recebida', '')::numeric, 0);
      if v_q <= 0 then continue; end if;
      v_pid := coalesce(
        nullif(v_item.it->>'produto_id_recebido_diferente', ''),
        nullif(v_item.it->>'produto_id', '')
      );
      if v_pid is null then continue; end if;

      select coalesce(
        nullif(elem->>'fator_conversao', '')::numeric,
        nullif(elem->>'fator_aplicado', '')::numeric,
        1
      ) into v_fator
      from jsonb_array_elements(v_itens_ped) elem
      where elem->>'produto_id' = v_pid
      limit 1;
      if v_fator is null or v_fator <= 0 then v_fator := 1; end if;

      v_recebido := jsonb_set(
        v_recebido,
        array[v_pid],
        to_jsonb(public._p38_round_qty(
          coalesce(nullif(v_recebido->>v_pid, '')::numeric, 0) + v_q * v_fator
        )),
        true
      );
    end loop;
  end loop;

  for v_mov in
    select m.*
    from public.movimentacao_estoque m
    where m.referencia_tipo = 'PedidoCompra'
      and m.referencia_id in (v_pedido_id, v_pedido_id::text)
      and coalesce(m.motivo, m.dados->>'motivo') = 'Compra'
      and coalesce(m.tipo, m.dados->>'tipo') = 'Entrada'
  loop
    v_pid := coalesce(v_mov.produto_id, v_mov.dados->>'produto_id');
    if v_pid is null then continue; end if;
    v_q := coalesce(v_mov.quantidade, nullif(v_mov.dados->>'quantidade', '')::numeric, 0);
    v_movimentado := jsonb_set(
      v_movimentado,
      array[v_pid],
      to_jsonb(public._p38_round_qty(coalesce(nullif(v_movimentado->>v_pid, '')::numeric, 0) + v_q)),
      true
    );
  end loop;

  for v_pid in select jsonb_object_keys(v_recebido)
  loop
    v_r := coalesce(nullif(v_recebido->>v_pid, '')::numeric, 0);
    v_m := coalesce(nullif(v_movimentado->>v_pid, '')::numeric, 0);
    v_faltante := public._p38_round_qty(greatest(0, v_r - v_m));
    if v_faltante > 0 then
      v_deltas := v_deltas || jsonb_build_object(
        'produto_id', v_pid,
        'recebido_documental', v_r,
        'ja_movimentado', v_m,
        'faltante', v_faltante
      );
    end if;
  end loop;

  if jsonb_array_length(v_deltas) = 0 then
    return jsonb_build_object(
      'pedido_id', v_pedido_id,
      'numero', v_pedido.numero,
      'skipped', true,
      'motivo', 'sem_delta'
    );
  end if;

  if v_dry_run then
    return jsonb_build_object(
      'pedido_id', v_pedido_id,
      'numero', v_pedido.numero,
      'dryRun', true,
      'deltas', v_deltas
    );
  end if;

  for v_linha in select value as d from jsonb_array_elements(v_deltas) as t(value)
  loop
    v_pid := v_linha.d->>'produto_id';
    v_faltante := (v_linha.d->>'faltante')::numeric;

    select elem->>'produto_nome' into v_nome_prod
    from jsonb_array_elements(v_itens_ped) elem
    where elem->>'produto_id' = v_pid
    limit 1;

    select coalesce(
      nullif(elem->>'fator_conversao', '')::numeric,
      nullif(elem->>'fator_aplicado', '')::numeric,
      1
    ) into v_fator
    from jsonb_array_elements(v_itens_ped) elem
    where elem->>'produto_id' = v_pid
    limit 1;
    if v_fator is null or v_fator <= 0 then v_fator := 1; end if;

    select coalesce(nullif(elem->>'unidade_medida', ''), nullif(elem->>'unidade_sigla', ''))
    into v_unidade
    from jsonb_array_elements(v_itens_ped) elem
    where elem->>'produto_id' = v_pid
    limit 1;

    insert into public.movimentacao_estoque (
      id, produto_id, tipo, quantidade, quantidade_base, motivo,
      referencia_tipo, referencia_id, referencia_numero,
      unidade_medida, unidade_sigla, fator_conversao, observacoes, dados
    ) values (
      gen_random_uuid()::text,
      v_pid,
      'Entrada',
      v_faltante,
      v_faltante,
      'Compra',
      'PedidoCompra',
      v_pedido_id,
      v_pedido.numero,
      v_unidade,
      v_unidade,
      case when v_fator > 1 then v_fator else null end,
      format('Correção retroativa recepção→estoque (admin %s); reconcilia embarques vs MovimentacaoEstoque Compra.', v_user_email),
      jsonb_build_object(
        'produto_id', v_pid,
        'produto_nome', coalesce(v_nome_prod, 'Produto'),
        'tipo', 'Entrada',
        'motivo', 'Compra',
        'quantidade', v_faltante,
        'quantidade_base', v_faltante,
        'referencia_tipo', 'PedidoCompra',
        'referencia_id', v_pedido_id,
        'referencia_numero', v_pedido.numero
      )
    );
    v_linhas := v_linhas + 1;
    v_produtos := array_append(v_produtos, v_pid);
  end loop;

  v_historico_tag := format(
    E'\n[CORREÇÃO MOVIMENTOS RECEPÇÃO RETROATIVA | PC %s | %s linha(s) | %s]',
    coalesce(v_pedido.numero, v_pedido_id),
    v_linhas,
    now()::text
  );
  update public.pedido_compra
    set historico = coalesce(historico, '') || v_historico_tag
  where id = v_pedido_id;

  foreach v_pid in array v_produtos
  loop
    perform public.recalcular_estoque_produto(v_pid);
  end loop;

  return jsonb_build_object(
    'pedido_id', v_pedido_id,
    'numero', v_pedido.numero,
    'aplicado', true,
    'deltas', v_deltas,
    'linhas_corrigidas', v_linhas
  );
exception when others then
  return jsonb_build_object('pedido_id', v_pedido_id, 'error', sqlerrm);
end;
$$;

-- =====================================================================
-- Permissões
-- =====================================================================
revoke all on function public.job_gerar_lancamentos_cartao() from public, anon, authenticated;
revoke all on function public.job_gerar_contas_previstas_recorrentes() from public, anon, authenticated;
revoke all on function public.corrigir_movimentos_recepcao_um_pedido(jsonb) from public, anon, authenticated;

grant execute on function public.job_gerar_lancamentos_cartao() to service_role;
grant execute on function public.job_gerar_contas_previstas_recorrentes() to service_role;
grant execute on function public.corrigir_movimentos_recepcao_um_pedido(jsonb) to service_role;

-- =====================================================================
-- pg_cron (horários em UTC; America/Rio_Branco = UTC-5)
--   05:00 local → 10:00 UTC  (gerarLancamentosCartao)
--   06:00 local dia 1 → 11:00 UTC dia 1 (gerarContasPrevistasRecorrentes)
-- =====================================================================
do $do$
begin
  if not exists (select 1 from cron.job where jobname = 'job-gerar-lancamentos-cartao') then
    perform cron.schedule(
      'job-gerar-lancamentos-cartao',
      '0 10 * * *',
      $cmd$select public.job_gerar_lancamentos_cartao();$cmd$
    );
  end if;
  if not exists (select 1 from cron.job where jobname = 'job-gerar-contas-previstas') then
    perform cron.schedule(
      'job-gerar-contas-previstas',
      '0 11 1 * *',
      $cmd$select public.job_gerar_contas_previstas_recorrentes();$cmd$
    );
  end if;
end$do$;
