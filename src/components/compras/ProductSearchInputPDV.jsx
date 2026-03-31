import React, { useState, useRef, useMemo } from 'react';
import { Search, Plus, Wand2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProductSearchInputPDV({ item, index, produtos, getSuggestedProduct, setItems, setProductSearch, productSearch }) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  const currentQuery = productSearch[index] || '';
  const suggestedProduct = getSuggestedProduct(item);
  const selectedProduct = produtos.find(p => p.id === item.selected_product_id);

  const handleChange = (e) => {
    const value = e.target.value;
    setProductSearch(prev => ({ ...prev, [index]: value }));
    setItems(prev => prev.map((c, i) => i === index ? { ...c, selected_product_id: '' } : c));
  };

  const handleSelect = (id, nome) => {
    setItems(prev => prev.map((c, i) => i === index ? { ...c, selected_product_id: id, ignored: false } : c));
    setProductSearch(prev => ({ ...prev, [index]: nome }));
  };

  const handleCreateNew = () => {
    setItems(prev => prev.map((c, i) => i === index ? { ...c, selected_product_id: 'create_new', ignored: false } : c));
    setProductSearch(prev => ({ ...prev, [index]: '' }));
    if (inputRef.current) inputRef.current.blur();
  };

  const handleClear = () => {
    setItems(prev => prev.map((c, i) => i === index ? { ...c, selected_product_id: '' } : c));
    setProductSearch(prev => ({ ...prev, [index]: '' }));
  };

  const filteredProducts = useMemo(() => {
    if (!isFocused || !currentQuery) return [];
    const q = currentQuery.toLowerCase();
    return produtos.filter(p => (p.nome || '').toLowerCase().includes(q)).slice(0, 6);
  }, [isFocused, currentQuery, produtos]);

  const statusLabel = useMemo(() => {
    if (currentQuery && isFocused) return null;
    if (item.selected_product_id === 'create_new') return { text: 'Novo produto', color: 'text-gray-600 dark:text-gray-300' };
    if (selectedProduct) return { text: selectedProduct.nome, color: 'text-emerald-700 dark:text-emerald-400' };
    if (suggestedProduct && !currentQuery) return { text: `IA: ${suggestedProduct.nome}`, color: 'text-emerald-700 dark:text-emerald-400', isSuggestion: true };
    if (!currentQuery) return { text: 'Não encontrado', color: 'text-gray-400 dark:text-gray-500' };
    return null;
  }, [isFocused, currentQuery, item.selected_product_id, selectedProduct, suggestedProduct]);

  return (
    <div className="relative min-w-0">
      <div className={cn(
        "h-12 rounded-2xl bg-gray-50 dark:bg-gray-900 shadow-sm flex items-center gap-2 px-3 transition-all",
        isFocused && "ring-1 ring-gray-200 dark:ring-gray-700"
      )}>
        <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-none" />

        <input
          ref={inputRef}
          value={currentQuery}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 120)}
          placeholder={isFocused ? 'Buscar produto...' : 'Vincular produto'}
          className={cn(
            "flex-1 min-w-0 bg-transparent border-0 outline-none text-sm font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500",
            isFocused || currentQuery ? "text-gray-900 dark:text-white" : "text-transparent"
          )}
        />

        {!isFocused && !currentQuery && statusLabel && (
          statusLabel.isSuggestion ? (
            <button
              type="button"
              onMouseDown={() => { const s = getSuggestedProduct(item); if (s) handleSelect(s.id, s.nome); }}
              className={cn("flex-1 min-w-0 text-xs truncate text-right flex items-center justify-end gap-1", statusLabel.color)}
            >
              <Wand2 className="w-3 h-3 flex-none" />
              <span className="truncate">{suggestedProduct?.nome}</span>
            </button>
          ) : (
            <span className={cn("flex-1 min-w-0 text-xs truncate text-right", statusLabel.color)}>
              {statusLabel.text}
            </span>
          )
        )}

        {(item.selected_product_id || currentQuery) && (
          <button
            type="button"
            onMouseDown={handleClear}
            className="w-6 h-6 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-700 flex-none"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        <button
          type="button"
          onMouseDown={handleCreateNew}
          className="w-7 h-7 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex-none"
          title="Criar novo produto"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {isFocused && currentQuery && (
        <div className="absolute z-20 w-full mt-1 rounded-2xl bg-white dark:bg-gray-950 shadow-lg overflow-hidden">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(produto => (
              <button
                key={produto.id}
                type="button"
                onMouseDown={() => handleSelect(produto.id, produto.nome)}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                {produto.nome}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
              Nenhum produto encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
}