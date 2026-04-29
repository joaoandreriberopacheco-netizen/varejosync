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