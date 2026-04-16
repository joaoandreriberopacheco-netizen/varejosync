-- Homologation seed for P38 transition validation.

insert into public.terceiro (id, nome, tipo, ativo)
values
  ('cli_demo_001', 'Cliente Demo', 'Cliente', true),
  ('for_demo_001', 'Fornecedor Demo', 'Fornecedor', true)
on conflict (id) do nothing;

insert into public.produto (id, nome, sku, estoque_atual, preco_venda, ativo)
values
  ('prod_demo_001', 'Produto Demo A', 'P38-A', 120, 19.90, true),
  ('prod_demo_002', 'Produto Demo B', 'P38-B', 80, 39.90, true)
on conflict (id) do nothing;

insert into public.formas_de_pagamento (id, nome, tipo, taxa, ativo)
values
  ('fp_demo_pix', 'PIX', 'instantaneo', 0, true),
  ('fp_demo_cartao', 'Cartao Credito', 'cartao', 0.0299, true)
on conflict (id) do nothing;

insert into public.contas_financeiras (id, nome, saldo_atual, ativo)
values
  ('cf_demo_caixa', 'Caixa Principal Demo', 1500, true)
on conflict (id) do nothing;

insert into public.turno_caixa (id, status, aberto_em, operador_id, operador_nome)
values ('tc_demo_001', 'Aberto', now(), 'usr_demo_001', 'Operador Demo')
on conflict (id) do nothing;

insert into public.pedido_venda (id, numero, cliente_id, cliente_nome, status, total, itens, pagamentos)
values (
  'pv_demo_001',
  'PV-DEMO-001',
  'cli_demo_001',
  'Cliente Demo',
  'Concluido',
  59.70,
  '[{"produto_id":"prod_demo_001","quantidade":3,"valor_unitario":19.90}]'::jsonb,
  '[{"forma_pagamento_id":"fp_demo_pix","valor":59.70}]'::jsonb
)
on conflict (id) do nothing;

insert into public.movimentacao_estoque (id, produto_id, tipo, quantidade, origem_tipo, origem_id)
values ('me_demo_001', 'prod_demo_001', 'saida', 3, 'PedidoVenda', 'pv_demo_001')
on conflict (id) do nothing;

insert into public.lancamento_financeiro (
  id, tipo, descricao, valor, status, data_vencimento, data_pagamento,
  conta_financeira_id, referencia_tipo, referencia_id
)
values (
  'lf_demo_001', 'Receita', 'Venda demo PV-DEMO-001', 59.70, 'Pago',
  current_date, current_date, 'cf_demo_caixa', 'PedidoVenda', 'pv_demo_001'
)
on conflict (id) do nothing;

-- Piloto CatalogoInterface (manual dinâmico / tree grid)
insert into public.catalogo_interface (
  id, stable_code, parent_id, kind, titulo, descricao, ordem,
  page_key, lifecycle_status, metadados
)
values
  (
    'cat_piloto_raiz',
    'CAT-APP-RAIZ',
    null,
    'modulo',
    'Aplicação (raiz)',
    'Nó raiz de exemplo para o catálogo hierárquico',
    0,
    null,
    'ativo',
    '{}'::jsonb
  ),
  (
    'cat_piloto_fin',
    'CAT-FIN-PAGINA-FLUXO',
    'cat_piloto_raiz',
    'pagina',
    'Fluxo de caixa (exemplo)',
    'Página exemplo ligada a page_key quando existir mapeamento',
    1,
    'FluxoCaixa',
    'ativo',
    '{}'::jsonb
  ),
  (
    'cat_piloto_legacy',
    'CAT-FIN-BTN-LEGACY',
    'cat_piloto_fin',
    'botao',
    'Ação legada (descontinuada)',
    'Exemplo de nó descontinuado — omitido por listarCatalogoInterface sem incluir_descontinuados',
    0,
    null,
    'descontinuado',
    '{"oculto_por_stable_code":"CAT-FIN-CARD-NOVO"}'::jsonb
  )
on conflict (id) do nothing;
