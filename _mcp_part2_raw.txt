-- === EventosLogisticos → public.eventos_logisticos (18 colunas promovidas) ===
alter table public.eventos_logisticos add column if not exists causa_atraso text;
alter table public.eventos_logisticos add column if not exists contagem_volumes_ok integer;
alter table public.eventos_logisticos add column if not exists data_hora_conclusao timestamptz;
alter table public.eventos_logisticos add column if not exists data_prevista date;
alter table public.eventos_logisticos add column if not exists foto_avarias_url text;
alter table public.eventos_logisticos add column if not exists itens_recebidos jsonb;
alter table public.eventos_logisticos add column if not exists numero text;
alter table public.eventos_logisticos add column if not exists observacoes_discrepancia text;
alter table public.eventos_logisticos add column if not exists pedidos_compra_ids jsonb;
alter table public.eventos_logisticos add column if not exists responsavel_id text;
alter table public.eventos_logisticos add column if not exists responsavel_nome text;
alter table public.eventos_logisticos add column if not exists status text;
alter table public.eventos_logisticos add column if not exists sugestao_melhoria text;
alter table public.eventos_logisticos add column if not exists teve_atraso boolean;
alter table public.eventos_logisticos add column if not exists teve_avarias boolean;
alter table public.eventos_logisticos add column if not exists tipo text;
alter table public.eventos_logisticos add column if not exists titulo text;
alter table public.eventos_logisticos add column if not exists veredito_conformidade text;

update public.eventos_logisticos set
  causa_atraso = coalesce(causa_atraso, dados->>'causa_atraso'),
  contagem_volumes_ok = coalesce(contagem_volumes_ok, nullif(dados->>'contagem_volumes_ok', '')::integer),
  data_hora_conclusao = coalesce(data_hora_conclusao, nullif(dados->>'data_hora_conclusao', '')::timestamptz),
  data_prevista = coalesce(data_prevista, nullif(dados->>'data_prevista', '')::date),
  foto_avarias_url = coalesce(foto_avarias_url, dados->>'foto_avarias_url'),
  itens_recebidos = coalesce(itens_recebidos, (dados->'itens_recebidos')),
  numero = coalesce(numero, dados->>'numero'),
  observacoes_discrepancia = coalesce(observacoes_discrepancia, dados->>'observacoes_discrepancia'),
  pedidos_compra_ids = coalesce(pedidos_compra_ids, (dados->'pedidos_compra_ids')),
  responsavel_id = coalesce(responsavel_id, dados->>'responsavel_id'),
  responsavel_nome = coalesce(responsavel_nome, dados->>'responsavel_nome'),
  status = coalesce(status, dados->>'status'),
  sugestao_melhoria = coalesce(sugestao_melhoria, dados->>'sugestao_melhoria'),
  teve_atraso = coalesce(teve_atraso, nullif(dados->>'teve_atraso', '')::boolean),
  teve_avarias = coalesce(teve_avarias, nullif(dados->>'teve_avarias', '')::boolean),
  tipo = coalesce(tipo, dados->>'tipo'),
  titulo = coalesce(titulo, dados->>'titulo'),
  veredito_conformidade = coalesce(veredito_conformidade, dados->>'veredito_conformidade')
where dados is not null and dados <> '{}'::jsonb;

update public.eventos_logisticos
  set dados = dados - array['causa_atraso', 'contagem_volumes_ok', 'data_hora_conclusao', 'data_prevista', 'foto_avarias_url', 'itens_recebidos', 'numero', 'observacoes_discrepancia', 'pedidos_compra_ids', 'responsavel_id', 'responsavel_nome', 'status', 'sugestao_melhoria', 'teve_atraso', 'teve_avarias', 'tipo', 'titulo', 'veredito_conformidade']
where dados is not null and dados <> '{}'::jsonb;


-- === ImportacaoLog → public.importacao_log (7 colunas promovidas) ===
alter table public.importacao_log add column if not exists data_desfeita timestamptz;
alter table public.importacao_log add column if not exists quantidade_itens integer;
alter table public.importacao_log add column if not exists snapshot_dados jsonb;
alter table public.importacao_log add column if not exists status text;
alter table public.importacao_log add column if not exists tipo_importacao text;
alter table public.importacao_log add column if not exists usuario_desfez text;
alter table public.importacao_log add column if not exists usuario_responsavel text;

update public.importacao_log set
  data_desfeita = coalesce(data_desfeita, nullif(dados->>'data_desfeita', '')::timestamptz),
  quantidade_itens = coalesce(quantidade_itens, nullif(dados->>'quantidade_itens', '')::integer),
  snapshot_dados = coalesce(snapshot_dados, (dados->'snapshot_dados')),
  status = coalesce(status, dados->>'status'),
  tipo_importacao = coalesce(tipo_importacao, dados->>'tipo_importacao'),
  usuario_desfez = coalesce(usuario_desfez, dados->>'usuario_desfez'),
  usuario_responsavel = coalesce(usuario_responsavel, dados->>'usuario_responsavel')
where dados is not null and dados <> '{}'::jsonb;

update public.importacao_log
  set dados = dados - array['data_desfeita', 'quantidade_itens', 'snapshot_dados', 'status', 'tipo_importacao', 'usuario_desfez', 'usuario_responsavel']
where dados is not null and dados <> '{}'::jsonb;


-- === Interveniente → public.interveniente (1 colunas promovidas) ===
alter table public.interveniente add column if not exists ativo boolean;

update public.interveniente set
  ativo = coalesce(ativo, nullif(dados->>'ativo', '')::boolean)
where dados is not null and dados <> '{}'::jsonb;

update public.interveniente
  set dados = dados - array['ativo']
where dados is not null and dados <> '{}'::jsonb;

create index if not exists idx_interveniente_ativo on public.interveniente (ativo);

-- === LayoutTemplate → public.layout_template (6 colunas promovidas) ===
alter table public.layout_template add column if not exists blocks_config jsonb;
alter table public.layout_template add column if not exists categoria text;
alter table public.layout_template add column if not exists descricao text;
alter table public.layout_template add column if not exists is_default boolean;
alter table public.layout_template add column if not exists nome text;
alter table public.layout_template add column if not exists tipo text;

update public.layout_template set
  blocks_config = coalesce(blocks_config, (dados->'blocks_config')),
  categoria = coalesce(categoria, dados->>'categoria'),
  descricao = coalesce(descricao, dados->>'descricao'),
  is_default = coalesce(is_default, nullif(dados->>'is_default', '')::boolean),
  nome = coalesce(nome, dados->>'nome'),
  tipo = coalesce(tipo, dados->>'tipo')
where dados is not null and dados <> '{}'::jsonb;

update public.layout_template
  set dados = dados - array['blocks_config', 'categoria', 'descricao', 'is_default', 'nome', 'tipo']
where dados is not null and dados <> '{}'::jsonb;


-- === LoteEstoque → public.lote_estoque (8 colunas promovidas) ===
alter table public.lote_estoque add column if not exists data_entrada_no_lote date;
alter table public.lote_estoque add column if not exists data_validade date;
alter table public.lote_estoque add column if not exists numero_lote text;
alter table public.lote_estoque add column if not exists numeros_serie jsonb;
alter table public.lote_estoque add column if not exists produto_id text;
alter table public.lote_estoque add column if not exists produto_nome text;
alter table public.lote_estoque add column if not exists quantidade_atual numeric;
alter table public.lote_estoque add column if not exists status text;

update public.lote_estoque set
  data_entrada_no_lote = coalesce(data_entrada_no_lote, nullif(dados->>'data_entrada_no_lote', '')::date),
  data_validade = coalesce(data_validade, nullif(dados->>'data_validade', '')::date),
  numero_lote = coalesce(numero_lote, dados->>'numero_lote'),
  numeros_serie = coalesce(numeros_serie, (dados->'numeros_serie')),
  produto_id = coalesce(produto_id, dados->>'produto_id'),
  produto_nome = coalesce(produto_nome, dados->>'produto_nome'),
  quantidade_atual = coalesce(quantidade_atual, nullif(dados->>'quantidade_atual', '')::numeric),
  status = coalesce(status, dados->>'status')
where dados is not null and dados <> '{}'::jsonb;

update public.lote_estoque
  set dados = dados - array['data_entrada_no_lote', 'data_validade', 'numero_lote', 'numeros_serie', 'produto_id', 'produto_nome', 'quantidade_atual', 'status']
where dados is not null and dados <> '{}'::jsonb;


-- === ManifestoEntrada → public.manifesto_entrada (7 colunas promovidas) ===
alter table public.manifesto_entrada add column if not exists conferente_id text;
alter table public.manifesto_entrada add column if not exists conferente_nome text;
alter table public.manifesto_entrada add column if not exists data_conferencia timestamptz;
alter table public.manifesto_entrada add column if not exists itens_conferidos jsonb;
alter table public.manifesto_entrada add column if not exists status text;
alter table public.manifesto_entrada add column if not exists status_codigo_conferencia_itens text;
alter table public.manifesto_entrada add column if not exists volumes jsonb;

update public.manifesto_entrada set
  conferente_id = coalesce(conferente_id, dados->>'conferente_id'),
  conferente_nome = coalesce(conferente_nome, dados->>'conferente_nome'),
  data_conferencia = coalesce(data_conferencia, nullif(dados->>'data_conferencia', '')::timestamptz),
  itens_conferidos = coalesce(itens_conferidos, (dados->'itens_conferidos')),
  status = coalesce(status, dados->>'status'),
  status_codigo_conferencia_itens = coalesce(status_codigo_conferencia_itens, dados->>'status_codigo_conferencia_itens'),
  volumes = coalesce(volumes, (dados->'volumes'))
where dados is not null and dados <> '{}'::jsonb;

update public.manifesto_entrada
  set dados = dados - array['conferente_id', 'conferente_nome', 'data_conferencia', 'itens_conferidos', 'status', 'status_codigo_conferencia_itens', 'volumes']
where dados is not null and dados <> '{}'::jsonb;


-- === Maquininha → public.maquininha (1 colunas promovidas) ===
alter table public.maquininha add column if not exists ativo boolean;

update public.maquininha set
  ativo = coalesce(ativo, nullif(dados->>'ativo', '')::boolean)
where dados is not null and dados <> '{}'::jsonb;

update public.maquininha
  set dados = dados - array['ativo']
where dados is not null and dados <> '{}'::jsonb;

create index if not exists idx_maquininha_ativo on public.maquininha (ativo);

-- === OrdemSeparacao → public.ordem_separacao (1 colunas promovidas) ===
alter table public.ordem_separacao add column if not exists pedido_venda_id text;

update public.ordem_separacao set
  pedido_venda_id = coalesce(pedido_venda_id, dados->>'pedido_venda_id')
where dados is not null and dados <> '{}'::jsonb;

update public.ordem_separacao
  set dados = dados - array['pedido_venda_id']
where dados is not null and dados <> '{}'::jsonb;

create index if not exists idx_ordem_separacao_pedido_venda_id on public.ordem_separacao (pedido_venda_id);

-- PerfilDeAcesso (perfil_de_acesso): nenhum campo descoberto; mantém modo JSONB-first.

-- PoliticasDesconto (politicas_desconto): nenhum campo descoberto; mantém modo JSONB-first.

-- === ProtocoloEntrega → public.protocolo_entrega (1 colunas promovidas) ===
alter table public.protocolo_entrega add column if not exists pedido_venda_id text;

update public.protocolo_entrega set
  pedido_venda_id = coalesce(pedido_venda_id, dados->>'pedido_venda_id')
where dados is not null and dados <> '{}'::jsonb;

update public.protocolo_entrega
  set dados = dados - array['pedido_venda_id']
where dados is not null and dados <> '{}'::jsonb;

create index if not exists idx_protocolo_entrega_pedido_venda_id on public.protocolo_entrega (pedido_venda_id);
