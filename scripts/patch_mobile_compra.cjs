const fs = require("fs");

function patchFile(relPath, replacements) {
  let c = fs.readFileSync(relPath, "utf8");
  for (const { oldStr, newStr } of replacements) {
    if (!c.includes(oldStr)) {
      const altOld = oldStr.replace(/\r\n/g, "\n");
      const altNew = newStr.replace(/\r\n/g, "\n");
      if (c.includes(altOld)) {
        c = c.replace(altOld, altNew);
        continue;
      }
      throw new Error("Pattern not found in " + relPath + ": " + oldStr.slice(0, 100));
    }
    c = c.replace(oldStr, newStr);
  }
  fs.writeFileSync(relPath, c, "utf8");
  console.log("OK", relPath);
}

patchFile("src/components/compras/MobileProductSelector.jsx", [
  {
    oldStr:
      "import { buildPurchaseUnitOptions, calculateBaseQuantity, getItemUnitKey } from '@/lib/productUnits';",
    newStr:
      "import { buildPurchaseUnitOptions, pickDefaultPurchaseUnit, calculateBaseQuantity, getItemUnitKey } from '@/lib/productUnits';",
  },
  {
    oldStr: "import { Search, Plus, Minus, ShoppingCart, ChevronLeft, Trash2, DollarSign, AlertCircle, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';",
    newStr:
      "import { Search, Plus, Minus, ShoppingCart, ChevronLeft, Trash2, DollarSign, AlertCircle, ArrowRight, TrendingDown, TrendingUp, Boxes } from 'lucide-react';",
  },
  {
    oldStr:
      "  const handleSelectProduct = (product) => {\r\n    const options = buildPurchaseUnitOptions(product);\r\n    if (options.length > 1) {\r\n      setUnitSelector({ open: true, product });\r\n      return;\r\n    }\r\n    startEditingProductWithUnit(product, options[0]);\r\n  };",
    newStr:
      "  const handleSelectProduct = (product) => {\r\n    const defaultOpt = pickDefaultPurchaseUnit(product);\r\n    if (!defaultOpt) return;\r\n    startEditingProductWithUnit(product, defaultOpt);\r\n  };",
  },
  {
    oldStr:
      "                filteredProducts.map((product, idx) => {\r\n                  const inCart = items.find(i => i.produto_id === product.id);\r\n                  const isSelected = idx === selectedIndex;\r\n                  return (\r\n                    <div\r\n                      key={product.id}\r\n                      ref={(el) => { catalogItemRefs.current[idx] = el; }}\r\n                      onClick={() => { if (!isLocked) handleSelectProduct(product); }}\r\n                      className={`p-4 rounded-xl shadow-sm cursor-pointer transition-all active:scale-[0.98] ${\r\n                        isSelected\r\n                          ? 'bg-indigo-100 border-2 border-indigo-400 dark:bg-indigo-900/40 dark:border-indigo-600'\r\n                          : inCart\r\n                          ? 'bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800'\r\n                          : 'bg-gray-50 dark:bg-gray-800'\r\n                      } ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}\r\n                    >\r\n                      <div className=\"flex items-start gap-3\">\r\n                        <div className=\"flex-1 min-w-0\">\r\n                          <div className={`font-medium truncate ${inCart ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-800 dark:text-gray-100'}`}>\r\n                            {product.nome}\r\n                          </div>\r\n                          <div className=\"text-sm text-gray-500 dark:text-gray-400 mt-1 truncate\">\r\n                            {product.codigo_interno || 'S/ Cód'} • {formatCurrency(product.valor_compra)}\r\n                          </div>\r\n                        </div>",
    newStr:
      "                filteredProducts.map((product, idx) => {\r\n                  const inCart = items.find(i => i.produto_id === product.id);\r\n                  const isSelected = idx === selectedIndex;\r\n                  const purchaseOpts = buildPurchaseUnitOptions(product);\r\n                  const variasUnidades = purchaseOpts.length > 1;\r\n                  const custoApresentacao = pickDefaultPurchaseUnit(product)?.valor_unitario ?? product.valor_compra;\r\n                  return (\r\n                    <div\r\n                      key={product.id}\r\n                      ref={(el) => { catalogItemRefs.current[idx] = el; }}\r\n                      onClick={() => { if (!isLocked) handleSelectProduct(product); }}\r\n                      className={`p-4 rounded-xl shadow-sm cursor-pointer transition-all active:scale-[0.98] ${\r\n                        isSelected\r\n                          ? 'bg-indigo-100 border-2 border-indigo-400 dark:bg-indigo-900/40 dark:border-indigo-600'\r\n                          : inCart\r\n                          ? 'bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800'\r\n                          : 'bg-gray-50 dark:bg-gray-800'\r\n                      } ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}\r\n                    >\r\n                      <div className=\"flex items-start gap-3\">\r\n                        <div className=\"flex-1 min-w-0\">\r\n                          <div className={`font-medium truncate ${inCart ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-800 dark:text-gray-100'}`}>\r\n                            {product.nome}\r\n                          </div>\r\n                          <div className=\"text-sm text-gray-500 dark:text-gray-400 mt-1\">\r\n                            <span className=\"truncate block\">{product.codigo_interno || 'S/ Cód'} • {formatCurrency(custoApresentacao)}</span>\r\n                            {variasUnidades && (\r\n                              <span className=\"mt-1 flex items-center gap-2 flex-wrap\">\r\n                                <Boxes className=\"w-3.5 h-3.5 text-gray-400 shrink-0\" aria-hidden />\r\n                                <button\r\n                                  type=\"button\"\r\n                                  className=\"text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline\"\r\n                                  onClick={(e) => {\r\n                                    e.stopPropagation();\r\n                                    setUnitSelector({ open: true, product });\r\n                                  }}\r\n                                >\r\n                                  Outra unidade\r\n                                </button>\r\n                              </span>\r\n                            )}\r\n                          </div>\r\n                        </div>",
  },
]);
