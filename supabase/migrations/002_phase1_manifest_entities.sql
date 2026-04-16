-- Fase 1: entidades do ENTITIES_MANIFEST.json ainda não criadas em 001_p38_core_homologation.sql.
-- Referência: src/docs/migration/ENTITIES_MANIFEST.json

-- Categorias (sem FKs externas)
create table if not exists public.categoria_produto (
  id text primary key,
  organization_id text,
  nome text not null,
  descricao text,
  ativa boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text
);

create table if not exists public.categoria_financeira (
  id text primary key,
  nome text not null,
  tipo text not null check (tipo in ('Receita', 'Despesa')),
  ativa boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text
);

create table if not exists public.tabela_preco (
  id text primary key,
  nome_tabela text not null,
  fator_ajuste numeric(8, 4) not null default 1,
  is_default boolean default false,
  percentual_desconto_maximo numeric(5, 2) default 0,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text
);

-- Pedido de compra
create table if not exists public.pedido_compra (
  id text primary key,
  numero text unique,
  fornecedor_id text not null references public.terceiro (id) on delete restrict,
  fornecedor_nome text,
  data_emissao date,
  data_prevista_entrega date,
  status text not null default 'Rascunho',
  status_embarque text default 'Nenhum',
  percentual_valor_embarcado numeric(5, 2) default 0,
  status_recebimento_geral text default 'Nenhum',
  itens jsonb not null default '[]'::jsonb,
  valor_total numeric(15, 2),
  observacoes text,
  historico text,
  tags text[],
  nfe_emitida boolean default false,
  conta_pagamento_id text references public.contas_financeiras (id) on delete set null,
  tem_divergencias boolean default false,
  conferencia_id text,
  data_aprovacao_financeira timestamptz,
  data_despacho timestamptz,
  data_chegada timestamptz,
  data_conclusao timestamptz,
  motivo_rejeicao_financeira text,
  status_conferencia_pedido text default 'Não Iniciada',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text
);

create index if not exists idx_pedido_compra_fornecedor on public.pedido_compra (fornecedor_id);
create index if not exists idx_pedido_compra_created_at on public.pedido_compra (created_at desc);

-- Embarque (FKs opcionais a entidades fora do manifesto mínimo ficam como text)
create table if not exists public.embarque (
  id text primary key,
  pedido_compra_id text not null references public.pedido_compra (id) on delete cascade,
  numero text not null,
  tipo text not null default 'Embarque',
  status text default 'Pendente',
  status_recebimento text default 'Pendente',
  data_embarque timestamptz,
  eta timestamptz,
  fornecedor_id text references public.terceiro (id) on delete set null,
  transportadora_id text,
  transportadora_nome text,
  supermanifesto_id text,
  manifesto_entrada_id text,
  evento_logistico_id text,
  volumes text,
  volumes_detalhados jsonb default '[]'::jsonb,
  peso_kg numeric(10, 3) default 0,
  observacoes text,
  itens jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text
);

create index if not exists idx_embarque_pedido on public.embarque (pedido_compra_id);

-- Recorrência / previstas
create table if not exists public.conta_recorrente (
  id text primary key,
  nome_despesa text not null,
  terceiro_id text not null references public.terceiro (id) on delete restrict,
  terceiro_nome text,
  categoria_financeira_id text not null references public.categoria_financeira (id) on delete restrict,
  categoria_nome text,
  valor_previsto numeric(15, 2) not null,
  frequencia text not null,
  dia_vencimento int not null,
  observacoes text,
  ativa boolean default true,
  data_fim date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text
);

create table if not exists public.conta_prevista (
  id text primary key,
  descricao text not null,
  terceiro_id text not null references public.terceiro (id) on delete restrict,
  terceiro_nome text,
  categoria_financeira_id text not null references public.categoria_financeira (id) on delete restrict,
  categoria_nome text,
  valor numeric(15, 2) not null,
  data_vencimento date not null,
  natureza text not null,
  parcela_numero int,
  parcela_total int,
  conta_recorrente_id text references public.conta_recorrente (id) on delete set null,
  periodo_referencia date,
  boleto_url text,
  valor_desatualizado boolean default false,
  tem_anexo boolean default false,
  tem_boleto boolean default false,
  tem_comprovante boolean default false,
  status_visual text default 'pendente',
  status text not null default 'Pendente',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text
);

create index if not exists idx_conta_prevista_vencimento on public.conta_prevista (data_vencimento);

-- Agenda (campos mínimos + manifest; motorista como text — User.id fora do núcleo)
create table if not exists public.agenda_logistica (
  id text primary key,
  pedido_venda_id text not null references public.pedido_venda (id) on delete cascade,
  cliente_id text not null references public.terceiro (id) on delete restrict,
  endereco_entrega text not null,
  data_agendada date not null,
  motorista_id text,
  status text default 'Pendente',
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text
);

create index if not exists idx_agenda_pedido on public.agenda_logistica (pedido_venda_id);

-- Movimentos de caixa (reforço/sangria/etc.)
create table if not exists public.movimentos_caixa (
  id text primary key,
  tipo text not null,
  valor numeric(15, 2) not null,
  conta_id text not null references public.contas_financeiras (id) on delete restrict,
  turno_caixa_id text references public.turno_caixa (id) on delete set null,
  usuario_responsavel_id text not null,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text
);

create index if not exists idx_movimentos_caixa_conta on public.movimentos_caixa (conta_id, created_at desc);

-- TargetFlare — modo Flare (campos obrigatórios do manifesto; "column" da UI como flare_column)
create table if not exists public.target_flare (
  id text primary key,
  status text not null default 'pending',
  file_path text not null,
  flare_line int not null,
  flare_column int not null,
  source_location_raw text not null,
  component_name text not null,
  briefing text not null,
  action_briefing text not null,
  confidence numeric(5, 4) not null,
  content_hash text,
  github_issue_number int,
  extras jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text
);

create index if not exists idx_target_flare_status on public.target_flare (status);
create index if not exists idx_target_flare_file on public.target_flare (file_path);

-- Triggers updated_at (reutiliza função pública)
drop trigger if exists trg_categoria_produto_updated on public.categoria_produto;
create trigger trg_categoria_produto_updated
before update on public.categoria_produto
for each row execute function public.set_updated_at();

drop trigger if exists trg_pedido_compra_updated on public.pedido_compra;
create trigger trg_pedido_compra_updated
before update on public.pedido_compra
for each row execute function public.set_updated_at();

drop trigger if exists trg_embarque_updated on public.embarque;
create trigger trg_embarque_updated
before update on public.embarque
for each row execute function public.set_updated_at();

drop trigger if exists trg_target_flare_updated on public.target_flare;
create trigger trg_target_flare_updated
before update on public.target_flare
for each row execute function public.set_updated_at();
