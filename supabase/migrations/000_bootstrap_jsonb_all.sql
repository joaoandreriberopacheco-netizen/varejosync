-- 000_bootstrap_jsonb_all.sql
-- Bootstrap uniforme: cria TODAS as tabelas mapeadas como JSONB-first
--   (id, dados jsonb, created_by, created_at, updated_at) se ainda não existirem.
-- Isto permite que a função migrarBase44ParaSupabase grave todos os dados do Base44
-- sem depender de colunas dedicadas. As migrations 001..016 (já existentes) podem
-- ser corridas DEPOIS para promover campos de dados->>X para colunas dedicadas
-- (ADD COLUMN IF NOT EXISTS + UPDATE ... coalesce). Como usam IF NOT EXISTS,
-- não conflitam com as tabelas já criadas aqui.
--
-- Cole este bloco inteiro no Supabase Dashboard → SQL Editor → Run.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$
declare
  t text;
  tables text[] := array[
    'lancamento_financeiro','terceiro','produto','pedido_venda','pedido_compra',
    'movimentacao_estoque','contas_financeiras','formas_de_pagamento','tabela_preco',
    'turno_caixa','embarque','conta_recorrente','conta_prevista','categoria_produto',
    'categoria_financeira','agenda_logistica','movimentos_caixa','target_flare',
    'catalogo_interface','anexo_documento','area','autorizacao_estorno',
    'comprovante_template','conferencia_compra','conferencia_estoque',
    'config_auto_atendimento','configuracoes_estoque','configuracoes_venda',
    'consumo_interno','cotacao','dados_empresa','destinacao_consumo_interno',
    'devolucao_troca','divergencia_compra','evento_editor_layout',
    'evento_logistico_sandbox','eventos_logisticos','folha_previsao_modelo',
    'folha_previsao_competencia','agefin_serie_modelo','agefin_serie_competencia',
    'budget_modelo','budget_competencia','folha_centro_custo','agenda_item',
    'importacao_log','interveniente','layout_template','lote_estoque',
    'manifesto_entrada','maquininha','ordem_separacao','perfil_de_acesso',
    'politicas_desconto','protocolo_entrega','rascunho_pedido_venda',
    'responsavel_consumo_interno','status_pedido_compra','supermanifesto',
    'tarefa','transicao_pedido_compra','transportadora','usuario','vale_compra',
    'venda_perdida','campanha','avisos_auto'
  ];
begin
  foreach t in array tables loop
    execute format($f$
      create table if not exists public.%I (
        id          text primary key,
        dados       jsonb not null default '{}'::jsonb,
        created_by  text,
        created_at  timestamptz not null default now(),
        updated_at  timestamptz not null default now()
      );
    $f$, t);
    execute format($f$
      create index if not exists idx_%I_created_at on public.%I (created_at desc);
    $f$, t, t);
    execute format($f$
      drop trigger if exists trg_%I_set_updated_at on public.%I;
      create trigger trg_%I_set_updated_at
        before update on public.%I
        for each row execute function public.set_updated_at();
    $f$, t, t, t, t);
  end loop;
end$$;