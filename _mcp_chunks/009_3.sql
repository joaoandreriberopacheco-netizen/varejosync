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

