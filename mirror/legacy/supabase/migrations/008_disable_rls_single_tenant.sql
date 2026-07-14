-- 008_disable_rls_single_tenant.sql
-- Modo single-tenant inicial: desliga RLS em todas as tabelas managed pelo app.
-- Quando ativarmos Supabase Auth real (multi-usuário), reativamos com policies por
-- auth.uid()/created_by. Por enquanto a anon_key tem leitura/escrita irrestrita.

do $$
declare
  rec record;
begin
  for rec in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'terceiro','produto','formas_de_pagamento','contas_financeiras','turno_caixa',
        'pedido_venda','movimentacao_estoque','lancamento_financeiro',
        'categoria_produto','categoria_financeira','tabela_preco','pedido_compra','embarque',
        'conta_recorrente','conta_prevista','agenda_logistica','movimentos_caixa','target_flare',
        'catalogo_interface',
        'anexo_documento','area','autorizacao_estorno','avisos_auto','campanha',
        'comprovante_template','conferencia_compra','conferencia_estoque','config_auto_atendimento',
        'configuracoes_estoque','configuracoes_venda','consumo_interno','cotacao','dados_empresa',
        'destinacao_consumo_interno','devolucao_troca','divergencia_compra','evento_editor_layout',
        'evento_logistico_sandbox','eventos_logisticos','importacao_log','interveniente',
        'layout_template','lote_estoque','manifesto_entrada','maquininha','ordem_separacao',
        'perfil_de_acesso','politicas_desconto','protocolo_entrega','rascunho_pedido_venda',
        'responsavel_consumo_interno','status_pedido_compra','supermanifesto','tarefa',
        'transicao_pedido_compra','transportadora','usuario','vale_compra','venda_perdida'
      )
  loop
    execute format('alter table public.%I disable row level security;', rec.tablename);
  end loop;
end$$;
