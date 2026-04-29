-- Catálogo hierárquico da UI (CatalogoInterface) — manual dinâmico / tree grid.
-- Ver docs/migration/CATALOGO_INTERFACE_TREE_GRID.md

create table if not exists public.catalogo_interface (
  id text primary key,
  stable_code text not null,
  parent_id text references public.catalogo_interface (id) on delete set null,
  kind text not null check (
    kind in ('modulo', 'pagina', 'aba', 'cartao', 'campo', 'botao', 'outro')
  ),
  titulo text not null,
  descricao text,
  ordem numeric(12, 4) not null default 0,
  page_key text,
  rota text,
  nome_componente text,
  lifecycle_status text not null default 'rascunho' check (
    lifecycle_status in ('ativo', 'descontinuado', 'rascunho')
  ),
  substituido_por_stable_code text,
  metadados jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  constraint catalogo_interface_stable_code_unique unique (stable_code)
);

create index if not exists idx_catalogo_interface_parent on public.catalogo_interface (parent_id);
create index if not exists idx_catalogo_interface_lifecycle on public.catalogo_interface (lifecycle_status);
create index if not exists idx_catalogo_interface_kind on public.catalogo_interface (kind);

drop trigger if exists trg_catalogo_interface_updated on public.catalogo_interface;
create trigger trg_catalogo_interface_updated
before update on public.catalogo_interface
for each row execute function public.set_updated_at();

alter table public.catalogo_interface enable row level security;

-- Idempotente: re-correr migrations (ex.: GitHub Actions) sem falhar se políticas já existirem.
drop policy if exists "catalogo_interface_select_authenticated" on public.catalogo_interface;
drop policy if exists "catalogo_interface_insert_authenticated" on public.catalogo_interface;
drop policy if exists "catalogo_interface_update_authenticated" on public.catalogo_interface;
drop policy if exists "catalogo_interface_delete_authenticated" on public.catalogo_interface;

-- Homologação: leitura e escrita para sessões autenticadas (apertar em produção).
create policy "catalogo_interface_select_authenticated"
  on public.catalogo_interface for select
  to authenticated
  using (true);

create policy "catalogo_interface_insert_authenticated"
  on public.catalogo_interface for insert
  to authenticated
  with check (true);

create policy "catalogo_interface_update_authenticated"
  on public.catalogo_interface for update
  to authenticated
  using (true)
  with check (true);

create policy "catalogo_interface_delete_authenticated"
  on public.catalogo_interface for delete
  to authenticated
  using (true);

comment on table public.catalogo_interface is 'Manual dinâmico da UI (árvore de módulos/páginas/componentes). Global.';
