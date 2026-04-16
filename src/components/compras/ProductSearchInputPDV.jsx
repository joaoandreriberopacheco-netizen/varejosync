import { useState, useRef, useMemo } from 'react';
import { Search, Plus, Wand2, X, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import NovoProdutoRapidoDialog from '@/components/compras/NovoProdutoRapidoDialog';
import { getProdutoLabel, matchesProductQuery } from '@/components/compras/productMatchingUtils';

export default function ProductSearchInputPDV({ item, index, produtos, getSuggestedProduct, setItems, setProductSearch, productSearch, onProductCreated }) {
  const [isFocused, setIsFocused] = useState(false);
  const [showNovoProduto, setShowNovoProduto] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const currentQuery = productSearch[index] || '';
  const suggestedProduct = getSuggestedProduct(item);
  // Se já tem produto selecionado (inclusive sugestão da IA), considera como selecionado
  const selectedProduct = item.selected_product_id && item.selected_product_id !== 'create_new'
    ? produtos.find(p => p.id === item.selected_product_id)
    : null;
  const isConfirmed = !!selectedProduct;

  const handleChange = (e) => {
    const value = e.target.value;
    setProductSearch(prev => ({ ...prev, [index]: value }));
    setItems(prev => prev.map((c, i) => i === index ? { ...c, selected_product_id: '' } : c));
  };

  const handleSelect = (id, nome) => {
    setItems(prev => prev.map((c, i) => i === index ? { ...c, selected_product_id: id, ignored: false } : c));
    setProductSearch(prev => ({ ...prev, [index]: nome }));
    setIsFocused(false);
  };

  const handleClear = (e) => {
    e.preventDefault();
    setItems(prev => prev.map((c, i) => i === index ? { ...c, selected_product_id: '' } : c));
    setProductSearch(prev => ({ ...prev, [index]: '' }));
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const handleOpenNovoProduto = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFocused(false);
    setShowNovoProduto(true);
  };

  const handleNovoProdutoSuccess = (novoProduto) => {
    if (novoProduto) {
      const label = getProdutoLabel(novoProduto);
      onProductCreated?.(novoProduto);
      setItems(prev => prev.map((c, i) => i === index ? { ...c, selected_product_id: novoProduto.id, ignored: false } : c));
      setProductSearch(prev => ({ ...prev, [index]: label }));
    }
    setShowNovoProduto(false);
  };

  const visibleProducts = useMemo(() => {
    if (!isFocused) return [];
    const sorted = [...produtos].sort((a, b) => getProdutoLabel(a).localeCompare(getProdutoLabel(b)));
    if (!currentQuery.trim()) return sorted.slice(0, 8);
    return sorted.filter(p => matchesProductQuery(p, currentQuery)).slice(0, 8);
  }, [isFocused, currentQuery, produtos]);

  return (
    <>
      <div className="relative min-w-0" ref={containerRef}>
        {isConfirmed && !isFocused ? (
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 flex-none" />
            <span className="flex-1 text-sm font-medium text-emerald-800 dark:text-emerald-300 truncate">
              {getProdutoLabel(selectedProduct)}
            </span>
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsFocused(true);
                setProductSearch(prev => ({ ...prev, [index]: '' }));
                setItems(prev => prev.map((c, i) => i === index ? { ...c, selected_product_id: '' } : c));
                setTimeout(() => inputRef.current?.focus(), 10);
              }}
              className="w-6 h-6 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-gray-100 flex-none"
              title="Trocar produto"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={handleClear}
              className="w-5 h-5 rounded-full flex items-center justify-center text-emerald-400 hover:text-emerald-700 flex-none"
            >
              <X className="w-3 h-3" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={handleOpenNovoProduto}
              className="w-6 h-6 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-gray-500 flex-none"
              title="Criar novo produto"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className={cn(
            "rounded-2xl bg-gray-50 dark:bg-gray-900 shadow-sm transition-all",
            isFocused && "ring-1 ring-gray-300 dark:ring-gray-600"
          )}>
            <div className="flex items-center gap-2 px-3 h-12">
              <span className={cn(
                "text-xs truncate max-w-[110px] text-right",
                item.selected_product_id === 'create_new' ? 'text-gray-600 dark:text-gray-300' :
                selectedProduct ? 'text-emerald-700 dark:text-emerald-400' :
                suggestedProduct ? 'text-emerald-600 dark:text-emerald-400' :
                'text-red-400 dark:text-red-500'
              )}>
                {item.selected_product_id === 'create_new' ? 'Criando...' :
                 selectedProduct ? getProdutoLabel(selectedProduct) :
                 suggestedProduct ? `IA: ${getProdutoLabel(suggestedProduct)}` :
                 'Não encontrado'}
              </span>

              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input autoComplete="off"
                  ref={inputRef}
                  type="text"
                  value={currentQuery}
                  onChange={handleChange}
                  onFocus={() => setIsFocused(true)}
                  className="w-full h-10 bg-transparent pl-5 pr-1 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 outline-none"
                  placeholder="Buscar item"
                />
              </div>

              {!isFocused && !currentQuery && suggestedProduct && !item.selected_product_id && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => handleSelect(suggestedProduct.id, getProdutoLabel(suggestedProduct))}
                  className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-none"
                  title="Aceitar sugestão IA"
                >
                  <Wand2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                </button>
              )}

              {(item.selected_product_id || currentQuery) && (
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={handleClear}
                  className="w-6 h-6 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-700 flex-none"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              <button
                type="button"
                tabIndex={-1}
                onMouseDown={handleOpenNovoProduto}
                className="w-7 h-7 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex-none"
                title="Criar novo produto"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {isFocused && (
              <div className="border-t border-gray-100 dark:border-gray-800 max-h-52 overflow-y-auto">
                {visibleProducts.length > 0 ? (
                  visibleProducts.map(produto => (
                    <button
                      key={produto.id}
                      type="button"
                      tabIndex={0}
                      onMouseDown={(e) => { e.preventDefault(); handleSelect(produto.id, getProdutoLabel(produto)); }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900 border-b border-gray-50 dark:border-gray-900 last:border-0"
                    >
                      {getProdutoLabel(produto)}
                    </button>
                  ))
                ) : currentQuery ? (
                  <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
                    Nenhum produto encontrado para "{currentQuery}"
                  </div>
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
                    Nenhum produto no catálogo
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <NovoProdutoRapidoDialog
        isOpen={showNovoProduto}
        onClose={() => setShowNovoProduto(false)}
        onSuccess={handleNovoProdutoSuccess}
        nomeInicial={currentQuery}
      />
    </>
  );
}