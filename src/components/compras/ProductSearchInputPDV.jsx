import React, { useState, useRef, useMemo } from 'react';
import { Search, Plus, Wand2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Fuzzy word-based match: cada palavra da query deve estar em alguma parte do nome
function matchesQuery(nome, query) {
  if (!query) return true;
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const n = nome.toLowerCase();
  return words.every(w => n.includes(w));
}

export default function ProductSearchInputPDV({ item, index, produtos, getSuggestedProduct, setItems, setProductSearch, productSearch }) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  const currentQuery = productSearch[index] || '';
  const suggestedProduct = getSuggestedProduct(item);
  const selectedProduct = item.selected_product_id && item.selected_product_id !== 'create_new'
    ? produtos.find(p => p.id === item.selected_product_id)
    : null;

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

  const handleCreateNew = () => {
    setItems(prev => prev.map((c, i) => i === index ? { ...c, selected_product_id: 'create_new', ignored: false } : c));
    setProductSearch(prev => ({ ...prev, [index]: '' }));
    setIsFocused(false);
  };

  const handleClear = () => {
    setItems(prev => prev.map((c, i) => i === index ? { ...c, selected_product_id: '' } : c));
    setProductSearch(prev => ({ ...prev, [index]: '' }));
    if (inputRef.current) inputRef.current.focus();
  };

  // Quando focado: filtra por query se tiver texto, ou mostra os primeiros 8 do catálogo
  const visibleProducts = useMemo(() => {
    if (!isFocused) return [];
    if (!currentQuery.trim()) {
      return [...produtos].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).slice(0, 8);
    }
    return produtos
      .filter(p => matchesQuery(p.nome || '', currentQuery))
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
      .slice(0, 8);
  }, [isFocused, currentQuery, produtos]);

  const showDropdown = isFocused;

  return (
    <div className="relative min-w-0">
      <div className={cn(
        "h-12 rounded-2xl bg-gray-50 dark:bg-gray-900 shadow-sm flex items-center gap-2 px-3 transition-all",
        isFocused && "ring-1 ring-gray-300 dark:ring-gray-600"
      )}>
        <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-none" />

        <input
          ref={inputRef}
          value={currentQuery}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          placeholder="Buscar no catálogo..."
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />

        {/* Status inline (quando não está digitando e há um estado definido) */}
        {!isFocused && !currentQuery && (
          <span className={cn(
            "text-xs truncate max-w-[120px] text-right",
            item.selected_product_id === 'create_new' ? 'text-gray-600 dark:text-gray-300' :
            selectedProduct ? 'text-emerald-700 dark:text-emerald-400' :
            suggestedProduct ? 'text-emerald-600 dark:text-emerald-400' :
            'text-red-400 dark:text-red-500'
          )}>
            {item.selected_product_id === 'create_new' ? 'Criar novo' :
             selectedProduct ? selectedProduct.nome :
             suggestedProduct ? `IA: ${suggestedProduct.nome}` :
             'Não encontrado'}
          </span>
        )}

        {/* Aceitar sugestão IA rapidamente */}
        {!isFocused && !currentQuery && suggestedProduct && !item.selected_product_id && (
          <button
            type="button"
            onMouseDown={() => handleSelect(suggestedProduct.id, suggestedProduct.nome)}
            className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-none"
            title="Aceitar sugestão IA"
          >
            <Wand2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          </button>
        )}

        {/* Limpar seleção */}
        {(item.selected_product_id || currentQuery) && (
          <button
            type="button"
            onMouseDown={handleClear}
            className="w-6 h-6 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-700 flex-none"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        {/* Criar novo */}
        <button
          type="button"
          onMouseDown={handleCreateNew}
          className="w-7 h-7 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex-none"
          title="Criar novo produto"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dropdown do catálogo */}
      {showDropdown && (
        <div className="absolute z-30 w-full mt-1 rounded-2xl bg-white dark:bg-gray-950 shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {visibleProducts.length > 0 ? (
            visibleProducts.map(produto => (
              <button
                key={produto.id}
                type="button"
                onMouseDown={() => handleSelect(produto.id, produto.nome)}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900 border-b border-gray-50 dark:border-gray-900 last:border-0"
              >
                {produto.nome}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
              Nenhum produto encontrado para "{currentQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}