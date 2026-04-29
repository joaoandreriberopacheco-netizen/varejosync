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

