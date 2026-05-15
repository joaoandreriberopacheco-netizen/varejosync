# Unidade de exibição no Produto (Base44)

**O que é:** a embalagem que o catálogo, o PDV e os relatórios mostram ao cliente (vitrine). Pode ser a unidade base (fator 1) ou uma alternativa (CX, M2, etc.).

**Onde fica no código:** leitura única em `src/lib/productUnits.js` — `resolveUnidadeExibicao(produto)`, `getUnidadeExibicaoSigla`, `getUnidadeExibicaoId`. Gravação: `applyUnidadesToProduto` em `productUnitsCrud.js` + formulário de produto.

## Campos na entidade `Produto` (consola Base44)

| Campo | Tipo sugerido | Papel |
|-------|----------------|--------|
| `unidade_comercial_id` | texto | **ID estável** da linha escolhida: `primary` (unidade base) ou o `id` de uma linha em `unidades_alternativas[]` |
| `unidade_apresentacao_default` | texto | **Sigla** da vitrine (UN, CX, M2…), desnormalizada para listagens rápidas |
| `unidade_show_ativa` | boolean | `true` = usa vitrine; `false` = catálogo/PDV só na unidade base |
| `unidade_show_comercial` | texto | Espelho legado da sigla comercial (mantido no save; pode omitir em telas novas) |
| `unidade_show_logistica` | texto | Opcional; logística / embarques (não é a mesma regra da vitrine comercial) |
| `unidade_principal` | texto | Unidade fator-1 (estoque e custo base) |
| `unidades_alternativas` | JSON/array | Embalagens adicionais com `id`, `unidade`, `fator_conversao`, etc. |

**Regra de gravação:** ao salvar embalagens, o app define **os dois** `unidade_comercial_id` + `unidade_apresentacao_default` juntos (nunca só um).

**Prioridade de leitura:** `unidade_comercial_id` → `unidade_apresentacao_default` / `unidade_show_comercial` → `unidade_principal`.

## O que conferir na consola se algo “volta” errado

1. Os campos acima existem na entidade `Produto` (nomes exatos).
2. Após editar no formulário, um GET do produto traz `unidade_comercial_id` e `unidade_apresentacao_default` preenchidos.
3. Cada item em `unidades_alternativas` tem `id` único e estável (não mudar IDs à mão).

## Legado (ainda usado em alguns sítios)

- `unidade_exibicao_sigla` — coluna antiga em planilhas/relatórios; preferir `unidade_apresentacao_default`.
- Entidade `ProdutoEmbalagem` — opcional (`VITE_USE_PRODUTO_EMBALAGEM_ENTITY`); **não** é necessária para esta cadeia.

## Consumidores (leitura via `productUnits.js`)

| Área | Ficheiros | Funções |
|------|-----------|---------|
| Catálogo / produto | `ProdutosPlanaTable`, `TreeGrid`, `MobileHierarquica`, `ProdutoFormCompleto`, planilhas embalagens | `getUnidadeExibicaoSigla`, `getCatalogoComercialView`, `resolveUnidadeExibicao` |
| PDV / AutoShop | `PDVSupermercado`, `AutoShop`, `ProductDetailDialog` | `pickDefaultSaleUnit`, `getUnidadeExibicaoSigla` |
| Compras — formulário | `PedidoCompraForm`, `ImportadorPedidoCompra`, `MobileProductSelector`, `CotacoesManager` | `pickDefaultPurchaseUnit`, `normalizePurchaseItemToCommercial` |
| Compras — listagem/cards | `PedidosCompra.jsx` | `resolveUnidadeExibicaoParaCompras`, `buildSnapshotExibicaoComercial`, `resolveCommercialDisplay` |
| Compras — relatórios | `ActionMenuComprasV2`, `RelatorioConsolidadoCompra`, `PedidoCompraResumoDialog` | `resolveUnidadeExibicaoParaCompras`, `normalizeItemCompraParaExibicao` |
| Compras — sugestão | `SugestaoCompra.jsx` | `resolveCommercialDisplay` |
| Embarque / logística | `EventoEmbarquesPanel` (sandbox), cards em `PedidosCompra` | `resolveBoatLogisticsUnit` (`unidade_show_logistica` → vitrine → base) |
| Persistência embalagens | `productUnitsCrud.js`, `applyUnidadesToProduto` | espelho `unidade_comercial_id` + siglas |

**Referência A29:** comparar em `docs/reference-a29-erp/checkout/` (clone local, gitignored) ou repo irmão `a29-erp` — ver `docs/reference-a29-erp/README.md`. Sem checkout local, usar `docs/migration/A29_VS_VAREJO_EMBALAGENS_GAP.md`.
