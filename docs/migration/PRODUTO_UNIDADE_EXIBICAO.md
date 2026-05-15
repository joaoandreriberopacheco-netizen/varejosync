# Unidade de exibição no Produto (Base44)

**O que é:** a embalagem que o catálogo, o PDV e os relatórios mostram ao cliente (vitrine). Pode ser a unidade base (fator 1) ou uma alternativa (CX, M2, etc.).

**Onde fica no código:** leitura única em `src/lib/productUnits.js` — `resolveUnidadeExibicao(produto)`, `getUnidadeExibicaoSigla`, `getUnidadeExibicaoId`. Gravação: `applyUnidadesToProduto` em `productUnitsCrud.js` + formulário de produto.

Ver também: [PRODUTO_EMBALAGEM_BASE44.md](./PRODUTO_EMBALAGEM_BASE44.md) (entidade opcional `ProdutoEmbalagem`).

## Princípio do formulário (truth only)

O formulário de produto **não é vitrine decorativa**: traduz a escolha que o utilizador gravou (`unidade_comercial_id`, siglas de vitrine e `is_comercial` em `unidades_alternativas[]`). Se os dados no servidor divergirem ou `resolveUnidadeExibicao` tiver de cair na unidade base, o UI mostra aviso âmbar — nunca finge que a base foi escolhida quando foi uma alternativa.

## Campos na entidade `Produto` (consola Base44)

| Campo | Tipo sugerido | Papel |
|-------|----------------|--------|
| `unidade_comercial_id` | texto | **ID estável** da linha escolhida: `primary` (unidade base) ou o `id` de uma linha em `unidades_alternativas[]` |
| `unidade_apresentacao_default` | texto | **Sigla** da vitrine (UN, CX, M2…), desnormalizada para listagens rápidas |
| `unidade_show_ativa` | boolean | `true` = usa vitrine; `false` = catálogo/PDV só na unidade base |
| `unidade_show_comercial` | texto | Espelho legado da sigla comercial (mantido no save; pode omitir em telas novas) |
| `unidade_show_logistica` | texto | Opcional; logística / embarques (não é a mesma regra da vitrine comercial) |
| `unidade_principal` | texto | Unidade fator-1 (estoque e custo base) |
| `unidades` | JSON/array | Opcional: lista canónica (`id`, `sigla`, `is_principal`, `is_comercial`…). O app recompõe o legado no save. |
| `unidades_alternativas` | JSON/array | Embalagens além da base — ver exemplo abaixo |

**Regra de gravação:** ao salvar embalagens, o app define **os dois** `unidade_comercial_id` + `unidade_apresentacao_default` juntos (nunca só um).

**Prioridade de leitura:** `unidade_comercial_id` → `unidade_apresentacao_default` / `unidade_show_comercial` → `is_comercial` numa linha do JSON → `unidade_principal`.

## Exemplo JSON no console Base44 (produto com CX na vitrine)

Colunas de topo (trecho):

```json
{
  "unidade_principal": "M2",
  "unidade_comercial_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "unidade_apresentacao_default": "CX",
  "unidade_show_comercial": "CX",
  "unidade_show_logistica": "CX",
  "unidade_show_ativa": true,
  "unidades_alternativas": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "unidade": "CX",
      "fator_conversao": 2.16,
      "fator_preco": 1,
      "ajuste_percentual": 0,
      "ativo": true,
      "is_principal": false,
      "is_comercial": true
    }
  ]
}
```

Vitrine na **unidade base** (`primary`) — nenhuma linha do array com `is_comercial: true`:

```json
{
  "unidade_principal": "UN",
  "unidade_comercial_id": "primary",
  "unidade_apresentacao_default": "UN",
  "unidade_show_comercial": "UN",
  "unidade_show_logistica": "UN",
  "unidade_show_ativa": true,
  "unidades_alternativas": [
    {
      "id": "alt-cx-001",
      "unidade": "CX",
      "fator_conversao": 12,
      "is_principal": false,
      "is_comercial": false,
      "ativo": true
    }
  ]
}
```

Cada item em `unidades_alternativas` deve trazer **`is_comercial`** (`true` ou `false`). Exatamente **uma** embalagem do produto (base ou alternativa) é a vitrine; quando é a base, use `unidade_comercial_id: "primary"` e todas as linhas do array com `is_comercial: false`.

## O que conferir na consola se algo “volta” errado

1. Os campos acima existem na entidade `Produto` (nomes exatos) — ver `docs/migration/ENTITIES_MANIFEST.json`.
2. Após editar no formulário, um GET do produto traz `unidade_comercial_id` e `unidade_apresentacao_default` preenchidos.
3. Cada item em `unidades_alternativas` tem `id` único e estável (não mudar IDs à mão).
4. Após um save pelo app, cada linha do JSON tem `is_comercial` explícito.

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
| Persistência embalagens | `productUnitsCrud.js`, `applyUnidadesToProduto` | espelho `unidade_comercial_id` + siglas + `is_comercial` no JSON |

**Referência A29:** comparar em `docs/reference-a29-erp/checkout/` (clone local, gitignored) ou repo irmão `a29-erp` — ver `docs/reference-a29-erp/README.md`. Sem checkout local, usar `docs/migration/A29_VS_VAREJO_EMBALAGENS_GAP.md`.
