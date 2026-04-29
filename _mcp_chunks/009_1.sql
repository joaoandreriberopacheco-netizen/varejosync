-- === ConfigAutoAtendimento → public.config_auto_atendimento (3 colunas promovidas) ===
alter table public.config_auto_atendimento add column if not exists ativo boolean;
alter table public.config_auto_atendimento add column if not exists subtitulo_boas_vindas text;
alter table public.config_auto_atendimento add column if not exists titulo_boas_vindas text;

update public.config_auto_atendimento set
  ativo = coalesce(ativo, nullif(dados->>'ativo', '')::boolean),
  subtitulo_boas_vindas = coalesce(subtitulo_boas_vindas, dados->>'subtitulo_boas_vindas'),
  titulo_boas_vindas = coalesce(titulo_boas_vindas, dados->>'titulo_boas_vindas')
where dados is not null and dados <> '{}'::jsonb;

update public.config_auto_atendimento
  set dados = dados - array['ativo', 'subtitulo_boas_vindas', 'titulo_boas_vindas']
where dados is not null and dados <> '{}'::jsonb;


-- ConfiguracoesEstoque (configuracoes_estoque): nenhum campo descoberto; mantém modo JSONB-first.

-- ConfiguracoesVenda (configuracoes_venda): nenhum campo descoberto; mantém modo JSONB-first.

-- === ConsumoInterno → public.consumo_interno (1 colunas promovidas) ===
alter table public.consumo_interno add column if not exists numero text;

update public.consumo_interno set
  numero = coalesce(numero, dados->>'numero')
where dados is not null and dados <> '{}'::jsonb;

update public.consumo_interno
  set dados = dados - array['numero']
where dados is not null and dados <> '{}'::jsonb;


-- === Cotacao → public.cotacao (7 colunas promovidas) ===
alter table public.cotacao add column if not exists data_abertura timestamptz;
alter table public.cotacao add column if not exists fornecedores jsonb;
alter table public.cotacao add column if not exists itens jsonb;
alter table public.cotacao add column if not exists numero text;
alter table public.cotacao add column if not exists respostas jsonb;
alter table public.cotacao add column if not exists status text;
alter table public.cotacao add column if not exists titulo text;

update public.cotacao set
  data_abertura = coalesce(data_abertura, nullif(dados->>'data_abertura', '')::timestamptz),
  fornecedores = coalesce(fornecedores, (dados->'fornecedores')),
  itens = coalesce(itens, (dados->'itens')),
  numero = coalesce(numero, dados->>'numero'),
  respostas = coalesce(respostas, (dados->'respostas')),
  status = coalesce(status, dados->>'status'),
  titulo = coalesce(titulo, dados->>'titulo')
where dados is not null and dados <> '{}'::jsonb;

update public.cotacao
  set dados = dados - array['data_abertura', 'fornecedores', 'itens', 'numero', 'respostas', 'status', 'titulo']
where dados is not null and dados <> '{}'::jsonb;


-- DadosEmpresa (dados_empresa): nenhum campo descoberto; mantém modo JSONB-first.

-- === DestinacaoConsumoInterno → public.destinacao_consumo_interno (2 colunas promovidas) ===
alter table public.destinacao_consumo_interno add column if not exists ativo boolean;
alter table public.destinacao_consumo_interno add column if not exists nome text;

update public.destinacao_consumo_interno set
  ativo = coalesce(ativo, nullif(dados->>'ativo', '')::boolean),
  nome = coalesce(nome, dados->>'nome')
where dados is not null and dados <> '{}'::jsonb;

update public.destinacao_consumo_interno
  set dados = dados - array['ativo', 'nome']
where dados is not null and dados <> '{}'::jsonb;


-- === DevolucaoTroca → public.devolucao_troca (16 colunas promovidas) ===
alter table public.devolucao_troca add column if not exists cliente_id text;
alter table public.devolucao_troca add column if not exists cliente_nome text;
alter table public.devolucao_troca add column if not exists forma_reembolso text;
alter table public.devolucao_troca add column if not exists fotos_mercadoria jsonb;
alter table public.devolucao_troca add column if not exists itens_devolvidos jsonb;
alter table public.devolucao_troca add column if not exists motivo text;
alter table public.devolucao_troca add column if not exists numero text;
alter table public.devolucao_troca add column if not exists operador_id text;
alter table public.devolucao_troca add column if not exists operador_nome text;
alter table public.devolucao_troca add column if not exists pedido_origem_id text;
alter table public.devolucao_troca add column if not exists pedido_origem_numero text;
alter table public.devolucao_troca add column if not exists status text;
alter table public.devolucao_troca add column if not exists tipo text;
alter table public.devolucao_troca add column if not exists vale_compra_codigo text;
alter table public.devolucao_troca add column if not exists vale_compra_id text;
alter table public.devolucao_troca add column if not exists valor_total_devolvido numeric;

update public.devolucao_troca set
  cliente_id = coalesce(cliente_id, dados->>'cliente_id'),
  cliente_nome = coalesce(cliente_nome, dados->>'cliente_nome'),
  forma_reembolso = coalesce(forma_reembolso, dados->>'forma_reembolso'),
  fotos_mercadoria = coalesce(fotos_mercadoria, (dados->'fotos_mercadoria')),
  itens_devolvidos = coalesce(itens_devolvidos, (dados->'itens_devolvidos')),
  motivo = coalesce(motivo, dados->>'motivo'),
  numero = coalesce(numero, dados->>'numero'),
  operador_id = coalesce(operador_id, dados->>'operador_id'),
  operador_nome = coalesce(operador_nome, dados->>'operador_nome'),
  pedido_origem_id = coalesce(pedido_origem_id, dados->>'pedido_origem_id'),
  pedido_origem_numero = coalesce(pedido_origem_numero, dados->>'pedido_origem_numero'),
  status = coalesce(status, dados->>'status'),
  tipo = coalesce(tipo, dados->>'tipo'),
  vale_compra_codigo = coalesce(vale_compra_codigo, dados->>'vale_compra_codigo'),
  vale_compra_id = coalesce(vale_compra_id, dados->>'vale_compra_id'),
  valor_total_devolvido = coalesce(valor_total_devolvido, nullif(dados->>'valor_total_devolvido', '')::numeric)
where dados is not null and dados <> '{}'::jsonb;

update public.devolucao_troca
  set dados = dados - array['cliente_id', 'cliente_nome', 'forma_reembolso', 'fotos_mercadoria', 'itens_devolvidos', 'motivo', 'numero', 'operador_id', 'operador_nome', 'pedido_origem_id', 'pedido_origem_numero', 'status', 'tipo', 'vale_compra_codigo', 'vale_compra_id', 'valor_total_devolvido']
where dados is not null and dados <> '{}'::jsonb;


-- === DivergenciaCompra → public.divergencia_compra (16 colunas promovidas) ===
alter table public.divergencia_compra add column if not exists acao_tomada text;
alter table public.divergencia_compra add column if not exists conferencia_id text;
alter table public.divergencia_compra add column if not exists data_resolucao timestamptz;
alter table public.divergencia_compra add column if not exists descricao text;
alter table public.divergencia_compra add column if not exists fotos_urls jsonb;
alter table public.divergencia_compra add column if not exists pedido_compra_id text;
alter table public.divergencia_compra add column if not exists produto_id text;
alter table public.divergencia_compra add column if not exists produto_nome text;
alter table public.divergencia_compra add column if not exists quantidade_avariada numeric;
alter table public.divergencia_compra add column if not exists quantidade_esperada numeric;
alter table public.divergencia_compra add column if not exists quantidade_recebida numeric;
alter table public.divergencia_compra add column if not exists resolucao text;
alter table public.divergencia_compra add column if not exists responsavel_resolucao_id text;
alter table public.divergencia_compra add column if not exists responsavel_resolucao_nome text;
alter table public.divergencia_compra add column if not exists status text;
alter table public.divergencia_compra add column if not exists tipo text;

update public.divergencia_compra set
  acao_tomada = coalesce(acao_tomada, dados->>'acao_tomada'),
  conferencia_id = coalesce(conferencia_id, dados->>'conferencia_id'),
  data_resolucao = coalesce(data_resolucao, nullif(dados->>'data_resolucao', '')::timestamptz),
  descricao = coalesce(descricao, dados->>'descricao'),
  fotos_urls = coalesce(fotos_urls, (dados->'fotos_urls')),
  pedido_compra_id = coalesce(pedido_compra_id, dados->>'pedido_compra_id'),
  produto_id = coalesce(produto_id, dados->>'produto_id'),
  produto_nome = coalesce(produto_nome, dados->>'produto_nome'),
  quantidade_avariada = coalesce(quantidade_avariada, nullif(dados->>'quantidade_avariada', '')::numeric),
  quantidade_esperada = coalesce(quantidade_esperada, nullif(dados->>'quantidade_esperada', '')::numeric),
  quantidade_recebida = coalesce(quantidade_recebida, nullif(dados->>'quantidade_recebida', '')::numeric),
  resolucao = coalesce(resolucao, dados->>'resolucao'),
  responsavel_resolucao_id = coalesce(responsavel_resolucao_id, dados->>'responsavel_resolucao_id'),
  responsavel_resolucao_nome = coalesce(responsavel_resolucao_nome, dados->>'responsavel_resolucao_nome'),
  status = coalesce(status, dados->>'status'),
  tipo = coalesce(tipo, dados->>'tipo')
where dados is not null and dados <> '{}'::jsonb;

update public.divergencia_compra
  set dados = dados - array['acao_tomada', 'conferencia_id', 'data_resolucao', 'descricao', 'fotos_urls', 'pedido_compra_id', 'produto_id', 'produto_nome', 'quantidade_avariada', 'quantidade_esperada', 'quantidade_recebida', 'resolucao', 'responsavel_resolucao_id', 'responsavel_resolucao_nome', 'status', 'tipo']
where dados is not null and dados <> '{}'::jsonb;

create index if not exists idx_divergencia_compra_pedido_compra_id on public.divergencia_compra (pedido_compra_id);

-- === EventoEditorLayout → public.evento_editor_layout (5 colunas promovidas) ===
alter table public.evento_editor_layout add column if not exists dados_evento jsonb;
alter table public.evento_editor_layout add column if not exists descricao_acao text;
alter table public.evento_editor_layout add column if not exists sequencia_blocos jsonb;
alter table public.evento_editor_layout add column if not exists template_layout_id text;
alter table public.evento_editor_layout add column if not exists tipo_evento text;

update public.evento_editor_layout set
  dados_evento = coalesce(dados_evento, (dados->'dados_evento')),
  descricao_acao = coalesce(descricao_acao, dados->>'descricao_acao'),
  sequencia_blocos = coalesce(sequencia_blocos, (dados->'sequencia_blocos')),
  template_layout_id = coalesce(template_layout_id, dados->>'template_layout_id'),
  tipo_evento = coalesce(tipo_evento, dados->>'tipo_evento')
where dados is not null and dados <> '{}'::jsonb;

update public.evento_editor_layout
  set dados = dados - array['dados_evento', 'descricao_acao', 'sequencia_blocos', 'template_layout_id', 'tipo_evento']
where dados is not null and dados <> '{}'::jsonb;


-- EventoLogisticoSandbox (evento_logistico_sandbox): nenhum campo descoberto; mantém modo JSONB-first.
