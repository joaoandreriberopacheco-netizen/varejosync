# Inventário A29-ERP — política de embalagens (referência)

Este ficheiro serve de **checklist** quando o clone de leitura existir em [`docs/reference-a29-erp/checkout/`](../reference-a29-erp/README.md). Sem essa pasta preenchida, preencher manualmente após `git clone` do monorepo A29.

## Estado do workspace

| Condição | Acção |
|----------|--------|
| `checkout/` **vazio** | Correr `scripts/clone-a29-reference.ps1` ou os comandos do README de referência. |
| `checkout/` **preenchido** | Usar os comandos abaixo (ajustar pastas se o layout do A29 for diferente). |

## Comandos úteis (no `checkout/` do A29)

Procurar por domínio de unidades / embalagens (exemplos — adaptar a pastas reais):

```bash
# palavras-chave típicas
rg -n "unidade_principal|embalagem|packaging|unitConversion|fator_conversao" --glob "*.ts" --glob "*.tsx"

# OCR / compras
rg -n "ocr|purchaseOrder|pedido.*compra|vision|extract" --glob "*.ts" --glob "*.tsx"

# importação / spreadsheet
rg -n "xlsx|sheet|import.*prod|bulk" --glob "*.ts" --glob "*.tsx"
```

## Tabela de inventário (preencher por área)

| Área | Caminhos / módulos no A29 (preencher) | Notas |
|------|--------------------------------------|--------|
| Domínio (tipos, validação fator/ajuste) | _TBD_ | Comparar com [`src/lib/productUnits.js`](../../src/lib/productUnits.js) |
| UI cadastro produto | _TBD_ | Comparar com [`ProdutoFormCompleto.jsx`](../../src/components/produtos/ProdutoFormCompleto.jsx) |
| Importação em massa | _TBD_ | Comparar com [`embalagensPlanilhaUtils.js`](../../src/components/produtos/massa/embalagensPlanilhaUtils.js), [`ImportacaoProdutos.jsx`](../../src/pages/ImportacaoProdutos.jsx) |
| OCR pedido de compras | _TBD_ | Comparar com [`ImportadorPedidoCompra.jsx`](../../src/components/compras/ImportadorPedidoCompra.jsx), `base44.integrations` |
| Catálogo / listagens | _TBD_ | Comparar com [`ProdutosPlanaTable.jsx`](../../src/components/produtos/ProdutosPlanaTable.jsx), [`TabelaPrecosConsulta.jsx`](../../src/pages/TabelaPrecosConsulta.jsx), `formatEstoqueApresentacao` |

Última revisão: preencher linhas `_TBD_` após clone local do A29.
