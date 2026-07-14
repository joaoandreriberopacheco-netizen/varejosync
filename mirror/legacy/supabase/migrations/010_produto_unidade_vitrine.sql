-- Coluna canónica de vitrine/PDV (espelha lógica em applyUnidadesToProduto / ENTITIES_MANIFEST).
alter table public.produto add column if not exists unidade_vitrine text not null default '';

comment on column public.produto.unidade_vitrine is 'Sigla da unidade de exibição; vazio = mesma que unidade_principal.';
