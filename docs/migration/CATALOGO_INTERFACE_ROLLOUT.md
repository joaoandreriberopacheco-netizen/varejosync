# Rollout — descoberta de nós e manutenção do catálogo

## Estratégia de “novos no ramo” (branch discovery)

Três camadas, por ordem de automação:

1. **Manual (fase atual)**  
   Equipa cria/atualiza registros `CatalogoInterface` no Base44 (ou via Supabase quando o datalink estiver ativo). Novos componentes aparecem no tree grid ao serem inseridos com o `parent_id` correto e `lifecycle_status` adequado (`ativo` ou `rascunho`).

2. **Semi-automático (recomendado a seguir)**  
   Script em CI ou local que compara fontes no repositório (ex.: chaves em `src/pages.config.js`, lista de ficheiros em `src/pages/`) com os `page_key` / `stable_code` já existentes e gera um relatório de **lacunas** (CSV/JSON). Não grava na base sozinho; abre PR ou checklist para humanos promoverem linhas a `ativo`.

3. **Automático (opcional)**  
   Job que insere candidatos com `lifecycle_status: "rascunho"` e `parent_id` inferido por convenção de pastas. Exige revisão humana antes de ativar — risco de ruído se o layout divergir do disco.

**Recomendação:** começar pela camada 1 + documentação de `stable_code` (prefixos por módulo); introduzir camada 2 quando o catálogo tiver volume.

## Descontinuação

- Marcar `lifecycle_status: "descontinuado"` e preencher `substituido_por_stable_code` quando existir substituto.
- A função `listarCatalogoInterface` omite descontinuados por defeito (`incluir_descontinuados: false`), alinhado a um tree grid “só o que importa agora”.

## Supabase / A29

- Tabela `public.catalogo_interface` espelha a entidade; ver migração `004_catalogo_interface.sql`.
- Em produção, apertar políticas RLS (hoje homologação permite leitura/escrita a `authenticated` — ajustar para escrita só admin ou `service_role` quando o modelo de auth estiver fechado).

## Pré-visualização HTML (módulos → páginas → componentes)

- Comando: `npm run catalogo:build-preview`
- Saída: `docs/migration/catalogo_interface_preview.html` (dados embutidos, funciona offline).
- O script analisa cada `src/pages/*.jsx`: imports de `@/components` (exceto `ui/`) e `../components/`, e **por baixo** de cada bloco lista subcomponentes (imports relativos `./` e outros `@/components` no mesmo ficheiro). Cada nó mostra um **código hierárquico**, ex.: `CAT-PG-PDV.PDVVendedor.ComprovantePreVenda`.
- **Zonas sem ficheiro próprio** (barra de pesquisa, lista): podes marcar no JSX `data-catalog-code="CAT-PG-PDV.PDVVendedor.zona_busca"` no elemento raiz da zona, ou `{/* @catalog CAT-PG-PDV.PDVVendedor.lista_sugestoes */}` — o gerador recolhe esses códigos na secção «Marcadores explícitos».
- Também procura `CardTitle`, `TabsTrigger` e `DialogTitle` por regex. Não depende de Base44 — é documentação visual do código.

## Bootstrap do catálogo (módulos → páginas)

1. **Gerar ficheiros** (a partir da lista em `scripts/generate-catalogo-interface-seed.mjs`):
   ```bash
   npm run catalogo:generate-seed
   ```
   Produz:
   - `supabase/seeds/generated_catalogo_interface.sql` — `INSERT` com módulos e uma linha `pagina` por rota em `pages.config.js` (sob o pai `cat_piloto_raiz` do `seed.sql`).
   - `docs/migration/catalogo_interface_bootstrap.json` — resumo dos módulos e páginas.

2. **Supabase:** com a migração `004` aplicada e o `seed.sql` base (nó `cat_piloto_raiz`), executar o SQL gerado no Studio ou `psql` (ou incluir o ficheiro num pipeline de seeds). Usa `on conflict (id) do nothing` para ser idempotente.

3. **Só Base44 (sem Postgres):** importar registos equivalentes na entidade (por UI, script com SDK, ou exportar a partir do Supabase após seed). O SQL não corre no runtime Base44 puro; o gerador pode ser alinhado no futuro a um JSON em massa se a plataforma expuser API de bulk create.
