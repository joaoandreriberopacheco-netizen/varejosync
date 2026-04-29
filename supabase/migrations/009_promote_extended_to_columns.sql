-- 009_promote_extended_to_columns.sql
-- Gerado por scripts/generate-migration-009.mjs.
-- Promove `dados->>X` -> coluna dedicada para todas as 40 entidades estendidas.
-- Depois desta migration, entityTableMap.js coloca todas em mode='columns'.

-- Operações são idempotentes: ADD COLUMN IF NOT EXISTS + UPDATE WHERE coluna IS NULL.
-- Repetir a migration não muda o estado.

-- === AnexoDocumento → public.anexo_documento (10 colunas promovidas) ===
alter table public.anexo_documento add column if not exists descricao text;
alter table public.anexo_documento add column if not exists mime_type text;
alter table public.anexo_documento add column if not exists nome_arquivo text;
alter table public.anexo_documento add column if not exists origem text;
alter table public.anexo_documento add column if not exists referencia_id text;
alter table public.anexo_documento add column if not exists referencia_numero text;
alter table public.anexo_documento add column if not exists referencia_tipo text;
alter table public.anexo_documento add column if not exists tamanho_bytes text;
alter table public.anexo_documento add column if not exists tipo_documento text;
alter table public.anexo_documento add column if not exists url_drive text;

update public.anexo_documento set
  descricao = coalesce(descricao, dados->>'descricao'),
  mime_type = coalesce(mime_type, dados->>'mime_type'),
  nome_arquivo = coalesce(nome_arquivo, dados->>'nome_arquivo'),
  origem = coalesce(origem, dados->>'origem'),
  referencia_id = coalesce(referencia_id, dados->>'referencia_id'),
  referencia_numero = coalesce(referencia_numero, dados->>'referencia_numero'),
  referencia_tipo = coalesce(referencia_tipo, dados->>'referencia_tipo'),
  tamanho_bytes = coalesce(tamanho_bytes, dados->>'tamanho_bytes'),
  tipo_documento = coalesce(tipo_documento, dados->>'tipo_documento'),
  url_drive = coalesce(url_drive, dados->>'url_drive')
where dados is not null and dados <> '{}'::jsonb;

update public.anexo_documento
  set dados = dados - array['descricao', 'mime_type', 'nome_arquivo', 'origem', 'referencia_id', 'referencia_numero', 'referencia_tipo', 'tamanho_bytes', 'tipo_documento', 'url_drive']
where dados is not null and dados <> '{}'::jsonb;

create index if not exists idx_anexo_documento_referencia_id on public.anexo_documento (referencia_id);

-- === Area → public.area (4 colunas promovidas) ===
alter table public.area add column if not exists ativo boolean;
alter table public.area add column if not exists codigo text;
alter table public.area add column if not exists descricao text;
alter table public.area add column if not exists nome text;

update public.area set
  ativo = coalesce(ativo, nullif(dados->>'ativo', '')::boolean),
  codigo = coalesce(codigo, dados->>'codigo'),
  descricao = coalesce(descricao, dados->>'descricao'),
  nome = coalesce(nome, dados->>'nome')
where dados is not null and dados <> '{}'::jsonb;

update public.area
  set dados = dados - array['ativo', 'codigo', 'descricao', 'nome']
where dados is not null and dados <> '{}'::jsonb;


-- === AutorizacaoEstorno → public.autorizacao_estorno (15 colunas promovidas) ===
alter table public.autorizacao_estorno add column if not exists caixa_operador_id text;
alter table public.autorizacao_estorno add column if not exists caixa_operador_nome text;
alter table public.autorizacao_estorno add column if not exists cliente_nome text;
alter table public.autorizacao_estorno add column if not exists devolucao_id text;
alter table public.autorizacao_estorno add column if not exists devolucao_numero text;
alter table public.autorizacao_estorno add column if not exists forma_reembolso text;
alter table public.autorizacao_estorno add column if not exists gerente_aprovador_id text;
alter table public.autorizacao_estorno add column if not exists gerente_aprovador_nome text;
alter table public.autorizacao_estorno add column if not exists motivo text;
alter table public.autorizacao_estorno add column if not exists numero text;
alter table public.autorizacao_estorno add column if not exists pedido_origem_numero text;
alter table public.autorizacao_estorno add column if not exists status text;
alter table public.autorizacao_estorno add column if not exists turno_caixa_destino_id text;
alter table public.autorizacao_estorno add column if not exists turno_caixa_destino_numero text;
alter table public.autorizacao_estorno add column if not exists valor_autorizado numeric;

update public.autorizacao_estorno set
  caixa_operador_id = coalesce(caixa_operador_id, dados->>'caixa_operador_id'),
  caixa_operador_nome = coalesce(caixa_operador_nome, dados->>'caixa_operador_nome'),
  cliente_nome = coalesce(cliente_nome, dados->>'cliente_nome'),
  devolucao_id = coalesce(devolucao_id, dados->>'devolucao_id'),
  devolucao_numero = coalesce(devolucao_numero, dados->>'devolucao_numero'),
  forma_reembolso = coalesce(forma_reembolso, dados->>'forma_reembolso'),
  gerente_aprovador_id = coalesce(gerente_aprovador_id, dados->>'gerente_aprovador_id'),
  gerente_aprovador_nome = coalesce(gerente_aprovador_nome, dados->>'gerente_aprovador_nome'),
  motivo = coalesce(motivo, dados->>'motivo'),
  numero = coalesce(numero, dados->>'numero'),
  pedido_origem_numero = coalesce(pedido_origem_numero, dados->>'pedido_origem_numero'),
  status = coalesce(status, dados->>'status'),
  turno_caixa_destino_id = coalesce(turno_caixa_destino_id, dados->>'turno_caixa_destino_id'),
  turno_caixa_destino_numero = coalesce(turno_caixa_destino_numero, dados->>'turno_caixa_destino_numero'),
  valor_autorizado = coalesce(valor_autorizado, nullif(dados->>'valor_autorizado', '')::numeric)
where dados is not null and dados <> '{}'::jsonb;

update public.autorizacao_estorno
  set dados = dados - array['caixa_operador_id', 'caixa_operador_nome', 'cliente_nome', 'devolucao_id', 'devolucao_numero', 'forma_reembolso', 'gerente_aprovador_id', 'gerente_aprovador_nome', 'motivo', 'numero', 'pedido_origem_numero', 'status', 'turno_caixa_destino_id', 'turno_caixa_destino_numero', 'valor_autorizado']
where dados is not null and dados <> '{}'::jsonb;


-- AvisosAuto (avisos_auto): nenhum campo descoberto; mantém modo JSONB-first.

-- Campanha (campanha): nenhum campo descoberto; mantém modo JSONB-first.

-- === ComprovanteTemplate → public.comprovante_template (5 colunas promovidas) ===
alter table public.comprovante_template add column if not exists descricao text;
alter table public.comprovante_template add column if not exists html_template text;
alter table public.comprovante_template add column if not exists is_default boolean;
alter table public.comprovante_template add column if not exists nome text;
alter table public.comprovante_template add column if not exists tipo text;

update public.comprovante_template set
  descricao = coalesce(descricao, dados->>'descricao'),
  html_template = coalesce(html_template, dados->>'html_template'),
  is_default = coalesce(is_default, nullif(dados->>'is_default', '')::boolean),
  nome = coalesce(nome, dados->>'nome'),
  tipo = coalesce(tipo, dados->>'tipo')
where dados is not null and dados <> '{}'::jsonb;

update public.comprovante_template
  set dados = dados - array['descricao', 'html_template', 'is_default', 'nome', 'tipo']
where dados is not null and dados <> '{}'::jsonb;

create index if not exists idx_comprovante_template_is_default on public.comprovante_template (is_default);

-- === ConferenciaCompra → public.conferencia_compra (15 colunas promovidas) ===
alter table public.conferencia_compra add column if not exists assinatura_url text;
alter table public.conferencia_compra add column if not exists conferente_id text;
alter table public.conferencia_compra add column if not exists conferente_nome text;
alter table public.conferencia_compra add column if not exists data_conclusao timestamptz;
alter table public.conferencia_compra add column if not exists interveniente_id text;
alter table public.conferencia_compra add column if not exists interveniente_nome text;
alter table public.conferencia_compra add column if not exists itens_conferidos jsonb;
alter table public.conferencia_compra add column if not exists observacoes_gerais text;
alter table public.conferencia_compra add column if not exists pedido_compra_id text;
alter table public.conferencia_compra add column if not exists pedido_numero text;
alter table public.conferencia_compra add column if not exists senha_confirmacao text;
alter table public.conferencia_compra add column if not exists status text;
alter table public.conferencia_compra add column if not exists tipo text;
alter table public.conferencia_compra add column if not exists total_divergencias numeric;
alter table public.conferencia_compra add column if not exists total_itens_ok numeric;

update public.conferencia_compra set
  assinatura_url = coalesce(assinatura_url, dados->>'assinatura_url'),
  conferente_id = coalesce(conferente_id, dados->>'conferente_id'),
  conferente_nome = coalesce(conferente_nome, dados->>'conferente_nome'),
  data_conclusao = coalesce(data_conclusao, nullif(dados->>'data_conclusao', '')::timestamptz),
  interveniente_id = coalesce(interveniente_id, dados->>'interveniente_id'),
  interveniente_nome = coalesce(interveniente_nome, dados->>'interveniente_nome'),
  itens_conferidos = coalesce(itens_conferidos, (dados->'itens_conferidos')),
  observacoes_gerais = coalesce(observacoes_gerais, dados->>'observacoes_gerais'),
  pedido_compra_id = coalesce(pedido_compra_id, dados->>'pedido_compra_id'),
  pedido_numero = coalesce(pedido_numero, dados->>'pedido_numero'),
  senha_confirmacao = coalesce(senha_confirmacao, dados->>'senha_confirmacao'),
  status = coalesce(status, dados->>'status'),
  tipo = coalesce(tipo, dados->>'tipo'),
  total_divergencias = coalesce(total_divergencias, nullif(dados->>'total_divergencias', '')::numeric),
  total_itens_ok = coalesce(total_itens_ok, nullif(dados->>'total_itens_ok', '')::numeric)
where dados is not null and dados <> '{}'::jsonb;

update public.conferencia_compra
  set dados = dados - array['assinatura_url', 'conferente_id', 'conferente_nome', 'data_conclusao', 'interveniente_id', 'interveniente_nome', 'itens_conferidos', 'observacoes_gerais', 'pedido_compra_id', 'pedido_numero', 'senha_confirmacao', 'status', 'tipo', 'total_divergencias', 'total_itens_ok']
where dados is not null and dados <> '{}'::jsonb;

create index if not exists idx_conferencia_compra_pedido_compra_id on public.conferencia_compra (pedido_compra_id);
create index if not exists idx_conferencia_compra_status on public.conferencia_compra (status);

-- === ConferenciaEstoque → public.conferencia_estoque (7 colunas promovidas) ===
alter table public.conferencia_estoque add column if not exists ajuste_aplicado text;
alter table public.conferencia_estoque add column if not exists data_fim date;
alter table public.conferencia_estoque add column if not exists data_inicio date;
alter table public.conferencia_estoque add column if not exists itens_conferidos jsonb;
alter table public.conferencia_estoque add column if not exists responsavel_id text;
alter table public.conferencia_estoque add column if not exists responsavel_nome text;
alter table public.conferencia_estoque add column if not exists status text;

update public.conferencia_estoque set
  ajuste_aplicado = coalesce(ajuste_aplicado, dados->>'ajuste_aplicado'),
  data_fim = coalesce(data_fim, nullif(dados->>'data_fim', '')::date),
  data_inicio = coalesce(data_inicio, nullif(dados->>'data_inicio', '')::date),
  itens_conferidos = coalesce(itens_conferidos, (dados->'itens_conferidos')),
  responsavel_id = coalesce(responsavel_id, dados->>'responsavel_id'),
  responsavel_nome = coalesce(responsavel_nome, dados->>'responsavel_nome'),
  status = coalesce(status, dados->>'status')
where dados is not null and dados <> '{}'::jsonb;

update public.conferencia_estoque
  set dados = dados - array['ajuste_aplicado', 'data_fim', 'data_inicio', 'itens_conferidos', 'responsavel_id', 'responsavel_nome', 'status']
where dados is not null and dados <> '{}'::jsonb;


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

-- === RascunhoPedidoVenda → public.rascunho_pedido_venda (3 colunas promovidas) ===
alter table public.rascunho_pedido_venda add column if not exists data_retorno timestamptz;
alter table public.rascunho_pedido_venda add column if not exists motivo_retorno text;
alter table public.rascunho_pedido_venda add column if not exists status text;

update public.rascunho_pedido_venda set
  data_retorno = coalesce(data_retorno, nullif(dados->>'data_retorno', '')::timestamptz),
  motivo_retorno = coalesce(motivo_retorno, dados->>'motivo_retorno'),
  status = coalesce(status, dados->>'status')
where dados is not null and dados <> '{}'::jsonb;

update public.rascunho_pedido_venda
  set dados = dados - array['data_retorno', 'motivo_retorno', 'status']
where dados is not null and dados <> '{}'::jsonb;


-- === ResponsavelConsumoInterno → public.responsavel_consumo_interno (2 colunas promovidas) ===
alter table public.responsavel_consumo_interno add column if not exists ativo boolean;
alter table public.responsavel_consumo_interno add column if not exists nome text;

update public.responsavel_consumo_interno set
  ativo = coalesce(ativo, nullif(dados->>'ativo', '')::boolean),
  nome = coalesce(nome, dados->>'nome')
where dados is not null and dados <> '{}'::jsonb;

update public.responsavel_consumo_interno
  set dados = dados - array['ativo', 'nome']
where dados is not null and dados <> '{}'::jsonb;


-- StatusPedidoCompra (status_pedido_compra): nenhum campo descoberto; mantém modo JSONB-first.

-- === Supermanifesto → public.supermanifesto (17 colunas promovidas) ===
alter table public.supermanifesto add column if not exists conferente_volumes_foto text;
alter table public.supermanifesto add column if not exists conferente_volumes_id text;
alter table public.supermanifesto add column if not exists conferente_volumes_nome text;
alter table public.supermanifesto add column if not exists conferente_volumes_senha_hash text;
alter table public.supermanifesto add column if not exists data_conferencia_volumes timestamptz;
alter table public.supermanifesto add column if not exists observacoes_consolidadas text;
alter table public.supermanifesto add column if not exists ocorrencias_conferencia jsonb;
alter table public.supermanifesto add column if not exists pedidos_vinculados jsonb;
alter table public.supermanifesto add column if not exists peso_total_bruto_kg numeric;
alter table public.supermanifesto add column if not exists reabertura_data timestamptz;
alter table public.supermanifesto add column if not exists reabertura_foto text;
alter table public.supermanifesto add column if not exists reabertura_responsavel text;
alter table public.supermanifesto add column if not exists reabertura_senha_hash text;
alter table public.supermanifesto add column if not exists status text;
alter table public.supermanifesto add column if not exists status_codigo_conferencia_volumes text;
alter table public.supermanifesto add column if not exists tem_divergencias boolean;
alter table public.supermanifesto add column if not exists volumes_conferidos jsonb;

update public.supermanifesto set
  conferente_volumes_foto = coalesce(conferente_volumes_foto, dados->>'conferente_volumes_foto'),
  conferente_volumes_id = coalesce(conferente_volumes_id, dados->>'conferente_volumes_id'),
  conferente_volumes_nome = coalesce(conferente_volumes_nome, dados->>'conferente_volumes_nome'),
  conferente_volumes_senha_hash = coalesce(conferente_volumes_senha_hash, dados->>'conferente_volumes_senha_hash'),
  data_conferencia_volumes = coalesce(data_conferencia_volumes, nullif(dados->>'data_conferencia_volumes', '')::timestamptz),
  observacoes_consolidadas = coalesce(observacoes_consolidadas, dados->>'observacoes_consolidadas'),
  ocorrencias_conferencia = coalesce(ocorrencias_conferencia, (dados->'ocorrencias_conferencia')),
  pedidos_vinculados = coalesce(pedidos_vinculados, (dados->'pedidos_vinculados')),
  peso_total_bruto_kg = coalesce(peso_total_bruto_kg, nullif(dados->>'peso_total_bruto_kg', '')::numeric),
  reabertura_data = coalesce(reabertura_data, nullif(dados->>'reabertura_data', '')::timestamptz),
  reabertura_foto = coalesce(reabertura_foto, dados->>'reabertura_foto'),
  reabertura_responsavel = coalesce(reabertura_responsavel, dados->>'reabertura_responsavel'),
  reabertura_senha_hash = coalesce(reabertura_senha_hash, dados->>'reabertura_senha_hash'),
  status = coalesce(status, dados->>'status'),
  status_codigo_conferencia_volumes = coalesce(status_codigo_conferencia_volumes, dados->>'status_codigo_conferencia_volumes'),
  tem_divergencias = coalesce(tem_divergencias, nullif(dados->>'tem_divergencias', '')::boolean),
  volumes_conferidos = coalesce(volumes_conferidos, (dados->'volumes_conferidos'))
where dados is not null and dados <> '{}'::jsonb;

update public.supermanifesto
  set dados = dados - array['conferente_volumes_foto', 'conferente_volumes_id', 'conferente_volumes_nome', 'conferente_volumes_senha_hash', 'data_conferencia_volumes', 'observacoes_consolidadas', 'ocorrencias_conferencia', 'pedidos_vinculados', 'peso_total_bruto_kg', 'reabertura_data', 'reabertura_foto', 'reabertura_responsavel', 'reabertura_senha_hash', 'status', 'status_codigo_conferencia_volumes', 'tem_divergencias', 'volumes_conferidos']
where dados is not null and dados <> '{}'::jsonb;


-- === Tarefa → public.tarefa (13 colunas promovidas) ===
alter table public.tarefa add column if not exists data_conclusao timestamptz;
alter table public.tarefa add column if not exists data_vencimento date;
alter table public.tarefa add column if not exists descricao text;
alter table public.tarefa add column if not exists prioridade text;
alter table public.tarefa add column if not exists referencia_id text;
alter table public.tarefa add column if not exists referencia_numero text;
alter table public.tarefa add column if not exists referencia_tipo text;
alter table public.tarefa add column if not exists responsavel_id text;
alter table public.tarefa add column if not exists responsavel_nome text;
alter table public.tarefa add column if not exists status text;
alter table public.tarefa add column if not exists tipo text;
alter table public.tarefa add column if not exists titulo text;
alter table public.tarefa add column if not exists valor_pendente numeric;

update public.tarefa set
  data_conclusao = coalesce(data_conclusao, nullif(dados->>'data_conclusao', '')::timestamptz),
  data_vencimento = coalesce(data_vencimento, nullif(dados->>'data_vencimento', '')::date),
  descricao = coalesce(descricao, dados->>'descricao'),
  prioridade = coalesce(prioridade, dados->>'prioridade'),
  referencia_id = coalesce(referencia_id, dados->>'referencia_id'),
  referencia_numero = coalesce(referencia_numero, dados->>'referencia_numero'),
  referencia_tipo = coalesce(referencia_tipo, dados->>'referencia_tipo'),
  responsavel_id = coalesce(responsavel_id, dados->>'responsavel_id'),
  responsavel_nome = coalesce(responsavel_nome, dados->>'responsavel_nome'),
  status = coalesce(status, dados->>'status'),
  tipo = coalesce(tipo, dados->>'tipo'),
  titulo = coalesce(titulo, dados->>'titulo'),
  valor_pendente = coalesce(valor_pendente, nullif(dados->>'valor_pendente', '')::numeric)
where dados is not null and dados <> '{}'::jsonb;

update public.tarefa
  set dados = dados - array['data_conclusao', 'data_vencimento', 'descricao', 'prioridade', 'referencia_id', 'referencia_numero', 'referencia_tipo', 'responsavel_id', 'responsavel_nome', 'status', 'tipo', 'titulo', 'valor_pendente']
where dados is not null and dados <> '{}'::jsonb;


-- === TransicaoPedidoCompra → public.transicao_pedido_compra (11 colunas promovidas) ===
alter table public.transicao_pedido_compra add column if not exists codigo_operacao text;
alter table public.transicao_pedido_compra add column if not exists data_transicao timestamptz;
alter table public.transicao_pedido_compra add column if not exists observacao text;
alter table public.transicao_pedido_compra add column if not exists pedido_id text;
alter table public.transicao_pedido_compra add column if not exists pedido_numero text;
alter table public.transicao_pedido_compra add column if not exists responsavel_email text;
alter table public.transicao_pedido_compra add column if not exists responsavel_id text;
alter table public.transicao_pedido_compra add column if not exists responsavel_nome text;
alter table public.transicao_pedido_compra add column if not exists status_anterior text;
alter table public.transicao_pedido_compra add column if not exists status_novo text;
alter table public.transicao_pedido_compra add column if not exists tipo_autenticacao text;

update public.transicao_pedido_compra set
  codigo_operacao = coalesce(codigo_operacao, dados->>'codigo_operacao'),
  data_transicao = coalesce(data_transicao, nullif(dados->>'data_transicao', '')::timestamptz),
  observacao = coalesce(observacao, dados->>'observacao'),
  pedido_id = coalesce(pedido_id, dados->>'pedido_id'),
  pedido_numero = coalesce(pedido_numero, dados->>'pedido_numero'),
  responsavel_email = coalesce(responsavel_email, dados->>'responsavel_email'),
  responsavel_id = coalesce(responsavel_id, dados->>'responsavel_id'),
  responsavel_nome = coalesce(responsavel_nome, dados->>'responsavel_nome'),
  status_anterior = coalesce(status_anterior, dados->>'status_anterior'),
  status_novo = coalesce(status_novo, dados->>'status_novo'),
  tipo_autenticacao = coalesce(tipo_autenticacao, dados->>'tipo_autenticacao')
where dados is not null and dados <> '{}'::jsonb;

update public.transicao_pedido_compra
  set dados = dados - array['codigo_operacao', 'data_transicao', 'observacao', 'pedido_id', 'pedido_numero', 'responsavel_email', 'responsavel_id', 'responsavel_nome', 'status_anterior', 'status_novo', 'tipo_autenticacao']
where dados is not null and dados <> '{}'::jsonb;

create index if not exists idx_transicao_pedido_compra_pedido_id on public.transicao_pedido_compra (pedido_id);

-- === Transportadora → public.transportadora (3 colunas promovidas) ===
alter table public.transportadora add column if not exists ativo boolean;
alter table public.transportadora add column if not exists nome text;
alter table public.transportadora add column if not exists saida_referencia text;

update public.transportadora set
  ativo = coalesce(ativo, nullif(dados->>'ativo', '')::boolean),
  nome = coalesce(nome, dados->>'nome'),
  saida_referencia = coalesce(saida_referencia, dados->>'saida_referencia')
where dados is not null and dados <> '{}'::jsonb;

update public.transportadora
  set dados = dados - array['ativo', 'nome', 'saida_referencia']
where dados is not null and dados <> '{}'::jsonb;


-- === User → public.usuario (7 colunas promovidas) ===
alter table public.usuario add column if not exists caixas_pdv_autorizados_ids jsonb;
alter table public.usuario add column if not exists nickname text;
alter table public.usuario add column if not exists perfil text;
alter table public.usuario add column if not exists perfil_acesso_id text;
alter table public.usuario add column if not exists perfil_acesso_nome text;
alter table public.usuario add column if not exists tabela_preco_id text;
alter table public.usuario add column if not exists tabela_preco_nome text;

update public.usuario set
  caixas_pdv_autorizados_ids = coalesce(caixas_pdv_autorizados_ids, (dados->'caixas_pdv_autorizados_ids')),
  nickname = coalesce(nickname, dados->>'nickname'),
  perfil = coalesce(perfil, dados->>'perfil'),
  perfil_acesso_id = coalesce(perfil_acesso_id, dados->>'perfil_acesso_id'),
  perfil_acesso_nome = coalesce(perfil_acesso_nome, dados->>'perfil_acesso_nome'),
  tabela_preco_id = coalesce(tabela_preco_id, dados->>'tabela_preco_id'),
  tabela_preco_nome = coalesce(tabela_preco_nome, dados->>'tabela_preco_nome')
where dados is not null and dados <> '{}'::jsonb;

update public.usuario
  set dados = dados - array['caixas_pdv_autorizados_ids', 'nickname', 'perfil', 'perfil_acesso_id', 'perfil_acesso_nome', 'tabela_preco_id', 'tabela_preco_nome']
where dados is not null and dados <> '{}'::jsonb;


-- === ValeCompra → public.vale_compra (9 colunas promovidas) ===
alter table public.vale_compra add column if not exists cliente_id text;
alter table public.vale_compra add column if not exists cliente_nome text;
alter table public.vale_compra add column if not exists codigo text;
alter table public.vale_compra add column if not exists origem_tipo text;
alter table public.vale_compra add column if not exists pedido_origem_id text;
alter table public.vale_compra add column if not exists pedido_origem_numero text;
alter table public.vale_compra add column if not exists status text;
alter table public.vale_compra add column if not exists valor_disponivel numeric;
alter table public.vale_compra add column if not exists valor_original numeric;

update public.vale_compra set
  cliente_id = coalesce(cliente_id, dados->>'cliente_id'),
  cliente_nome = coalesce(cliente_nome, dados->>'cliente_nome'),
  codigo = coalesce(codigo, dados->>'codigo'),
  origem_tipo = coalesce(origem_tipo, dados->>'origem_tipo'),
  pedido_origem_id = coalesce(pedido_origem_id, dados->>'pedido_origem_id'),
  pedido_origem_numero = coalesce(pedido_origem_numero, dados->>'pedido_origem_numero'),
  status = coalesce(status, dados->>'status'),
  valor_disponivel = coalesce(valor_disponivel, nullif(dados->>'valor_disponivel', '')::numeric),
  valor_original = coalesce(valor_original, nullif(dados->>'valor_original', '')::numeric)
where dados is not null and dados <> '{}'::jsonb;

update public.vale_compra
  set dados = dados - array['cliente_id', 'cliente_nome', 'codigo', 'origem_tipo', 'pedido_origem_id', 'pedido_origem_numero', 'status', 'valor_disponivel', 'valor_original']
where dados is not null and dados <> '{}'::jsonb;

create index if not exists idx_vale_compra_codigo on public.vale_compra (codigo);

-- === VendaPerdida → public.venda_perdida (6 colunas promovidas) ===
alter table public.venda_perdida add column if not exists data_registro date;
alter table public.venda_perdida add column if not exists motivo text;
alter table public.venda_perdida add column if not exists origem text;
alter table public.venda_perdida add column if not exists produto_nome text;
alter table public.venda_perdida add column if not exists quantidade_desejada numeric;
alter table public.venda_perdida add column if not exists vendedor_id text;

update public.venda_perdida set
  data_registro = coalesce(data_registro, nullif(dados->>'data_registro', '')::date),
  motivo = coalesce(motivo, dados->>'motivo'),
  origem = coalesce(origem, dados->>'origem'),
  produto_nome = coalesce(produto_nome, dados->>'produto_nome'),
  quantidade_desejada = coalesce(quantidade_desejada, nullif(dados->>'quantidade_desejada', '')::numeric),
  vendedor_id = coalesce(vendedor_id, dados->>'vendedor_id')
where dados is not null and dados <> '{}'::jsonb;

update public.venda_perdida
  set dados = dados - array['data_registro', 'motivo', 'origem', 'produto_nome', 'quantidade_desejada', 'vendedor_id']
where dados is not null and dados <> '{}'::jsonb;


-- Total promovido: 227 colunas em 40 tabelas.