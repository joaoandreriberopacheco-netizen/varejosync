const fs = require("fs");
const path = require("path");
const p = path.join(__dirname, "../src/components/vendas/PDVVendedor.jsx");
let c = fs.readFileSync(p, "utf8");

c = c.replace(
  `import { Search, ShoppingCart, Trash2, UserPlus, ArrowRight, Barcode, Truck, Store, Keyboard, Plus, Minus, ArrowLeft, ChevronDown, ChevronRight, AlertCircle, Package, Camera, Undo2, X, Edit, FileText, CreditCard } from 'lucide-react';`,
  `import { Search, ShoppingCart, Trash2, UserPlus, ArrowRight, Barcode, Truck, Store, Keyboard, Plus, Minus, ArrowLeft, ChevronDown, ChevronRight, AlertCircle, Package, Boxes, Camera, Undo2, X, Edit, FileText, CreditCard } from 'lucide-react';`
);

c = c.replace(
  `import { buildSaleUnitOptions, calculateBaseQuantity, getItemUnitKey } from '@/lib/productUnits';`,
  `import { buildSaleUnitOptions, calculateBaseQuantity, getItemUnitKey, pickDefaultSaleUnit, hasAlternativeUnits } from '@/lib/productUnits';`
);

const oldSel = `  const handleSelecionarProduto = (produto) => {
    setBuscaProduto('');
    setShowSuggestions(false);
    setQuantidadeAtual('');

    if (isMobile) {
      inputProdutoRef.current?.blur();
    }

    const opcoes = buildSaleUnitOptions(produto, tabelaPreco?.fator_ajuste || 1);
    if (opcoes.length > 1) {
      setUnitSelector({ open: true, product: produto });
      return;
    }

    aplicarUnidadeAoProdutoSelecionado(produto, opcoes[0]);
  };`;

const newSel = `  const handleSelecionarProduto = (produto) => {
    setBuscaProduto('');
    setShowSuggestions(false);
    setQuantidadeAtual('');

    if (isMobile) {
      inputProdutoRef.current?.blur();
    }

    const mult = tabelaPreco?.fator_ajuste || 1;
    const opcoes = buildSaleUnitOptions(produto, mult);
    const escolha = pickDefaultSaleUnit(produto, mult) || opcoes[0];
    aplicarUnidadeAoProdutoSelecionado(produto, escolha);
  };`;

if (!c.includes(oldSel)) throw new Error("handleSelecionarProduto block not found");
c = c.replace(oldSel, newSel);

const oldPrecoLine = `                const precoTabela = produto.preco_venda_padrao * (tabelaPreco?.fator_ajuste || 1);`;
const newPrecoLine = `                const multT = tabelaPreco?.fator_ajuste || 1;
                const optPreco = pickDefaultSaleUnit(produto, multT);
                const precoTabela = optPreco ? optPreco.valor_unitario : produto.preco_venda_padrao * multT;`;
if (!c.includes(oldPrecoLine)) throw new Error("precoTabela line not found");
c = c.replace(oldPrecoLine, newPrecoLine);

const oldNome = `                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100 leading-snug break-words whitespace-normal">{produto.nome}</p>`;
const newNome = `                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100 leading-snug break-words whitespace-normal flex items-center gap-2 flex-wrap">
                        {hasAlternativeUnits(produto) && (
                          <Boxes className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-500" title="Várias unidades de venda" aria-hidden />
                        )}
                        {produto.nome}
                      </p>`;
if (!c.includes(oldNome)) throw new Error("nome suggestion block not found");
c = c.replace(oldNome, newNome);

fs.writeFileSync(p, c);
console.log("pdv patched");
