-- 007_extended_entities.sql
-- Cria as 40 entidades restantes referenciadas em src/* mas sem schema modelado ainda.
-- Estratégia: schema "JSONB-first" — cada tabela tem id + timestamps + created_by + dados jsonb.
-- O front lê/escreve transparente via supabaseEntityLayer (modo 'jsonb'), sem precisar de
-- migration por campo. Conforme campos forem virando filtro/ordenação reais, criamos
-- migrations adicionais que extraem `dados->>'campo'` para colunas dedicadas.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Helper: cria tabela JSONB-first com triggers padrão.
do $$
declare
  tbl text;
  tables text[] := array[
    'anexo_documento',
    'area',
    'autorizacao_estorno',
    'avisos_auto',
    'campanha',
    'comprovante_template',
    'conferencia_compra',
    'conferencia_estoque',
    'config_auto_atendimento',
    'configuracoes_estoque',
    'configuracoes_venda',
    'consumo_interno',
    'cotacao',
    'dados_empresa',
    'destinacao_consumo_interno',
    'devolucao_troca',
    'divergencia_compra',
    'evento_editor_layout',
    'evento_logistico_sandbox',
    'eventos_logisticos',
    'importacao_log',
    'interveniente',
    'layout_template',
    'lote_estoque',
    'manifesto_entrada',
    'maquininha',
    'ordem_separacao',
    'perfil_de_acesso',
    'politicas_desconto',
    'protocolo_entrega',
    'rascunho_pedido_venda',
    'responsavel_consumo_interno',
    'status_pedido_compra',
    'supermanifesto',
    'tarefa',
    'transicao_pedido_compra',
    'transportadora',
    'usuario',
    'vale_compra',
    'venda_perdida'
  ];
begin
  foreach tbl in array tables loop
    execute format($f$
      create table if not exists public.%I (
        id          text primary key,
        dados       jsonb not null default '{}'::jsonb,
        created_by  text,
        created_at  timestamptz not null default now(),
        updated_at  timestamptz not null default now()
      );
    $f$, tbl);

    execute format($f$
      drop trigger if exists trg_%I_set_updated_at on public.%I;
    $f$, tbl, tbl);

    execute format($f$
      create trigger trg_%I_set_updated_at
      before update on public.%I
      for each row execute function public.set_updated_at();
    $f$, tbl, tbl);

    execute format($f$
      create index if not exists idx_%I_created_at on public.%I (created_at desc);
    $f$, tbl, tbl);

    execute format($f$
      create index if not exists idx_%I_dados_gin on public.%I using gin (dados jsonb_path_ops);
    $f$, tbl, tbl);
  end loop;
end$$;

-- Colunas adicionais que o app filtra com frequência — facilitam .eq() direto.
alter table public.rascunho_pedido_venda
  add column if not exists vendedor_id text,
  add column if not exists cliente_id  text,
  add column if not exists status      text;

create index if not exists idx_rascunho_pv_vendedor on public.rascunho_pedido_venda (vendedor_id);
create index if not exists idx_rascunho_pv_status   on public.rascunho_pedido_venda (status);

alter table public.cotacao
  add column if not exists status text;

create index if not exists idx_cotacao_status on public.cotacao (status);

alter table public.conferencia_compra
  add column if not exists pedido_compra_id text,
  add column if not exists status           text;

create index if not exists idx_conf_compra_pc on public.conferencia_compra (pedido_compra_id);

alter table public.conferencia_estoque
  add column if not exists status text;

alter table public.divergencia_compra
  add column if not exists pedido_compra_id text,
  add column if not exists embarque_id      text;

create index if not exists idx_div_compra_pc on public.divergencia_compra (pedido_compra_id);
create index if not exists idx_div_compra_emb on public.divergencia_compra (embarque_id);

alter table public.manifesto_entrada
  add column if not exists supermanifesto_id text,
  add column if not exists status            text;

create index if not exists idx_manifesto_status on public.manifesto_entrada (status);

alter table public.transicao_pedido_compra
  add column if not exists pedido_compra_id text,
  add column if not exists tipo             text,
  add column if not exists usuario_id       text;

create index if not exists idx_trans_pc on public.transicao_pedido_compra (pedido_compra_id);

alter table public.tarefa
  add column if not exists status        text,
  add column if not exists assignee_id   text,
  add column if not exists referencia_id text;

alter table public.usuario
  add column if not exists email     text unique,
  add column if not exists full_name text,
  add column if not exists role      text;

create index if not exists idx_usuario_email on public.usuario (email);

alter table public.perfil_de_acesso
  add column if not exists nome text;

alter table public.transportadora
  add column if not exists nome  text,
  add column if not exists ativo boolean default true;

alter table public.dados_empresa
  add column if not exists ativo boolean default true;

alter table public.maquininha
  add column if not exists ativa boolean default true;

alter table public.lote_estoque
  add column if not exists produto_id     text,
  add column if not exists numero_lote    text,
  add column if not exists data_validade  date;

create index if not exists idx_lote_produto on public.lote_estoque (produto_id);

alter table public.vale_compra
  add column if not exists cliente_id text,
  add column if not exists status     text;

alter table public.venda_perdida
  add column if not exists motivo   text,
  add column if not exists vendedor_id text;

alter table public.consumo_interno
  add column if not exists status text;

alter table public.devolucao_troca
  add column if not exists pedido_venda_id text,
  add column if not exists status text;

create index if not exists idx_devolucao_pv on public.devolucao_troca (pedido_venda_id);

alter table public.autorizacao_estorno
  add column if not exists pedido_venda_id text,
  add column if not exists status text;

alter table public.ordem_separacao
  add column if not exists pedido_venda_id text,
  add column if not exists status text;

create index if not exists idx_ordem_sep_pv on public.ordem_separacao (pedido_venda_id);

alter table public.protocolo_entrega
  add column if not exists agenda_id text,
  add column if not exists status    text;
