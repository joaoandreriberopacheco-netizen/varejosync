# Gap analysis: embalagens A29 → VarejoSync

Legenda: **A29** = preencher após inventário no clone em `docs/reference-a29-erp/checkout/`. **VarejoSync** = estado actual deste repositório.

| Área | A29 (caminhos) | VarejoSync (caminhos) | Gap / acção |
|------|----------------|----------------------|-------------|
| Domínio unidades | _Preencher pós-inventário_ | [`src/lib/productUnits.js`](../../src/lib/productUnits.js) — `normalizeAlternativeUnits`, `resolvePrimaryFromFactorOne`, `resolveCommercialUnit`, `resolveCommercialDisplay`, `formatEstoqueApresentacao` | Portar regras/validações concretas do A29 para esta lib; evitar segundo modelo paralelo. |
| Planilha embalagens | _TBD_ | [`embalagensPlanilhaUtils.js`](../../src/components/produtos/massa/embalagensPlanilhaUtils.js), [`ExportarEmbalagensPlanilha.jsx`](../../src/components/produtos/massa/ExportarEmbalagensPlanilha.jsx), [`ImportarEmbalagensPlanilha.jsx`](../../src/components/produtos/massa/ImportarEmbalagensPlanilha.jsx) | Alinhar validações (ex.: duplicados entre slots) com o A29 quando identificadas. |
| UI cadastro | _TBD_ | [`ProdutoFormCompleto.jsx`](../../src/components/produtos/ProdutoFormCompleto.jsx) + `UnidadesAlternativasEditor` | Pré-visualização de listagens usa as mesmas funções de `productUnits` (ver alterações recentes). |
| Catálogo / tabelas | _TBD_ | [`ProdutosPlanaTable.jsx`](../../src/components/produtos/ProdutosPlanaTable.jsx), [`TabelaPrecosConsulta.jsx`](../../src/pages/TabelaPrecosConsulta.jsx), [`MobileHierarquica.jsx`](../../src/components/produtos/MobileHierarquica.jsx), [`TreeGrid.jsx`](../../src/components/produtos/treegrid/TreeGrid.jsx) | Coluna “Unid.” alinhada a `getCatalogUnitLabels`; estoque já usa `formatEstoqueApresentacao` → `resolveCommercialUnit` por baixo. |
| Compras / pedido | _TBD_ | `resolveCommercialDisplay` em [`PedidosCompra.jsx`](../../src/pages/PedidosCompra.jsx), [`SugestaoCompra.jsx`](../../src/components/compras/SugestaoCompra.jsx), etc. | Já centralizado; comparar só mensagens e edge cases com A29. |
| OCR / LLM | _TBD_ | [`ImportadorPedidoCompra.jsx`](../../src/components/compras/ImportadorPedidoCompra.jsx), [`EstimativaEmbalagensIA.jsx`](../../src/pages/EstimativaEmbalagensIA.jsx) | Ver [`OCR_EMBALAGENS_BACKEND_DECISAO.md`](./OCR_EMBALAGENS_BACKEND_DECISAO.md). |

## Próximo passo

1. Clonar A29 em `docs/reference-a29-erp/checkout/`.
2. Substituir `_TBD_` / `_Preencher…_` por caminhos reais.
3. Para cada linha com diferença de regra, abrir PR pequeno em `src/lib` ou componente correspondente.
