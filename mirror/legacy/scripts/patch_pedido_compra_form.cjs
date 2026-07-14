const fs = require("fs");
const relPath = "src/components/compras/PedidoCompraForm.jsx";
let c = fs.readFileSync(relPath, "utf8");

const importLine = "import { cancelarLancamentosNaoPagosPedidoCompra, listarLancamentosPedidoCompra, temLancamentoPagoParaPedido } from '@/lib/pedidoCompraFinanceiro';\r\n";
const importNew =
  "import { cancelarLancamentosNaoPagosPedidoCompra, listarLancamentosPedidoCompra, temLancamentoPagoParaPedido } from '@/lib/pedidoCompraFinanceiro';\r\nimport { pickDefaultPurchaseUnit } from '@/lib/productUnits';\r\n";
if (!c.includes(importLine)) {
  const alt = importLine.replace(/\r\n/g, "\n");
  if (c.includes(alt)) {
    c = c.replace(alt, importNew.replace(/\r\n/g, "\n"));
  } else throw new Error("import anchor not found");
} else {
  c = c.replace(importLine, importNew);
}

const oldProdutoId =
  "        if (field === 'produto_id') {\r\n            const produto = produtos.find(p => p.id === value);\r\n            if (produto) {\r\n                item.produto_nome = produto.nome;\r\n                item.codigo_produto = produto.codigo_interno || produto.codigo_barras;\r\n                item.unidade_medida = produto.unidade_principal || 'UN';\r\n                item.fator_conversao = 1;\r\n                item.custo_unitario = produto.valor_compra || 0;\r\n                item.valor_desconto_item = produto.desconto_compra_padrao || 0; \r\n            }\r\n        }";
const newProdutoId =
  "        if (field === 'produto_id') {\r\n            const produto = produtos.find(p => p.id === value);\r\n            if (produto) {\r\n                const opt = pickDefaultPurchaseUnit(produto);\r\n                item.produto_nome = produto.nome;\r\n                item.codigo_produto = produto.codigo_interno || produto.codigo_barras;\r\n                item.unidade_medida = opt?.unidade || produto.unidade_principal || 'UN';\r\n                item.fator_conversao = opt?.fator_conversao ?? 1;\r\n                item.custo_unitario = (opt?.valor_unitario ?? produto.valor_compra) || 0;\r\n                item.valor_desconto_item = produto.desconto_compra_padrao || 0; \r\n            }\r\n        }";
if (!c.includes(oldProdutoId)) throw new Error("produto_id block not found");
c = c.replace(oldProdutoId, newProdutoId);

const oldAdd =
  "    } else {\r\n        newItem = { \r\n            produto_id: product?.id || '', \r\n            produto_nome: product?.nome || '', \r\n            codigo_produto: product?.codigo_interno || product?.codigo_barras || '',\r\n            quantidade: 1, \r\n            unidade_medida: product?.unidade_compra || 'UN',\r\n            custo_unitario: product?.valor_compra || 0,\r\n            valor_desconto_item: product?.desconto_compra_padrao || 0,\r\n            observacao_item: ''\r\n        };\r\n        newItem = calculateItemTotals(newItem);\r\n    }";
const newAdd =
  "    } else {\r\n        const pu = product?.id ? pickDefaultPurchaseUnit(product) : null;\r\n        newItem = { \r\n            produto_id: product?.id || '', \r\n            produto_nome: product?.nome || '', \r\n            codigo_produto: product?.codigo_interno || product?.codigo_barras || '',\r\n            quantidade: 1, \r\n            unidade_medida: pu?.unidade || product?.unidade_compra || 'UN',\r\n            fator_conversao: pu?.fator_conversao ?? 1,\r\n            custo_unitario: (pu?.valor_unitario ?? product?.valor_compra) || 0,\r\n            valor_desconto_item: product?.desconto_compra_padrao || 0,\r\n            observacao_item: ''\r\n        };\r\n        newItem = calculateItemTotals(newItem);\r\n    }";
if (!c.includes(oldAdd)) throw new Error("handleAddItem else not found");
c = c.replace(oldAdd, newAdd);

const oldCsv =
  "                    const custoFinalUnitario = roundToTwoDecimals(finalCost - descontoImportado);\r\n\r\n                    newItems.push({\r\n                        produto_id: product.id,\r\n                        produto_nome: product.nome,\r\n                        codigo_produto: product.codigo_interno || product.codigo_barras,\r\n                        quantidade: qty,\r\n                        unidade_medida: product.unidade_principal || 'UN',\r\n                        custo_unitario: finalCost,";
const newCsv =
  "                    const custoFinalUnitario = roundToTwoDecimals(finalCost - descontoImportado);\r\n                    const optImp = pickDefaultPurchaseUnit(product);\r\n                    const fatorImp = optImp?.fator_conversao ?? 1;\r\n\r\n                    newItems.push({\r\n                        produto_id: product.id,\r\n                        produto_nome: product.nome,\r\n                        codigo_produto: product.codigo_interno || product.codigo_barras,\r\n                        quantidade: qty,\r\n                        unidade_medida: optImp?.unidade || product.unidade_principal || 'UN',\r\n                        fator_conversao: fatorImp,\r\n                        quantidade_base: roundToTwoDecimals(qty * fatorImp),\r\n                        custo_unitario: finalCost,";
if (!c.includes(oldCsv)) throw new Error("CSV block not found");
c = c.replace(oldCsv, newCsv);

fs.writeFileSync(relPath, c, "utf8");
console.log("OK PedidoCompraForm");
