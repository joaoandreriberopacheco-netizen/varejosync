import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Minus, ShoppingCart, X, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function MobileProductSelector({ 
  items, 
  products, 
  onAddItem, 
  onUpdateItem, 
  onRemoveItem,
  formatCurrency 
}) {
  const [view, setView] = useState('catalog'); // 'catalog' | 'cart'
  const [search, setSearch] = useState('');

  const filteredProducts = useMemo(() => {
    if (!search) return products.slice(0, 20);
    const lower = search.toLowerCase();
    return products.filter(p => 
      p.nome.toLowerCase().includes(lower) || 
      (p.codigo_interno && p.codigo_interno.toLowerCase().includes(lower)) ||
      (p.codigo_barras && p.codigo_barras.includes(lower))
    ).slice(0, 50);
  }, [products, search]);

  const getItemQty = (prodId) => {
    const item = items.find(i => i.produto_id === prodId);
    return item ? item.quantidade : 0;
  };

  const handleQuickAdd = (product) => {
    const existingIndex = items.findIndex(i => i.produto_id === product.id);
    if (existingIndex >= 0) {
      onUpdateItem(existingIndex, 'quantidade', items[existingIndex].quantidade + 1);
    } else {
      onAddItem(product);
    }
  };

  const handleQuickRemove = (product) => {
    const existingIndex = items.findIndex(i => i.produto_id === product.id);
    if (existingIndex >= 0) {
      const newQty = items[existingIndex].quantidade - 1;
      if (newQty <= 0) {
        onRemoveItem(existingIndex);
      } else {
        onUpdateItem(existingIndex, 'quantidade', newQty);
      }
    }
  };

  const totalItems = items.length;
  const totalValue = items.reduce((acc, item) => acc + (item.total || 0), 0);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
      {/* Mobile Toggle Tabs */}
      <div className="flex p-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm z-10">
        <button
          onClick={() => setView('catalog')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
            view === 'catalog' 
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 shadow' 
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          Catálogo
        </button>
        <button
          onClick={() => setView('cart')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all relative ${
            view === 'cart' 
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 shadow' 
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          Carrinho
          {totalItems > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500"></span>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {view === 'catalog' ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar produto..."
                className="pl-9 bg-white dark:bg-gray-800 border-none shadow-sm h-10 rounded-xl"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              {filteredProducts.map(product => {
                const qty = getItemQty(product.id);
                return (
                  <div key={product.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 dark:text-gray-100">{product.nome}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {product.codigo_interno || 'S/ Cód'} • {formatCurrency(product.valor_compra)}
                      </div>
                    </div>
                    
                    {qty > 0 ? (
                      <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-1">
                        <button onClick={() => handleQuickRemove(product)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-600 rounded-md shadow-sm text-gray-600 dark:text-gray-200">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-semibold text-sm w-4 text-center">{qty}</span>
                        <button onClick={() => handleQuickAdd(product)} className="w-8 h-8 flex items-center justify-center bg-gray-900 dark:bg-gray-200 rounded-md shadow-sm text-white dark:text-gray-900">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleQuickAdd(product)}
                        className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <ShoppingCart className="w-12 h-12 mb-2 opacity-20" />
                  <p>Carrinho vazio</p>
               </div>
            ) : (
              items.map((item, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm space-y-3">
                   <div className="flex justify-between">
                      <div>
                        <div className="font-medium text-gray-800 dark:text-gray-100 line-clamp-1">{item.produto_nome || "Produto"}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatCurrency(item.custo_unitario)} x {item.quantidade} {item.unidade_medida}
                        </div>
                      </div>
                      <div className="text-right">
                         <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(item.total)}</div>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 flex-1">
                         <button onClick={() => {
                            if(item.quantidade > 1) onUpdateItem(index, 'quantidade', item.quantidade - 1);
                            else onRemoveItem(index);
                         }} className="w-8 h-8 flex items-center justify-center border border-gray-200 dark:border-gray-600 rounded-lg">
                            <Minus className="w-3 h-3" />
                         </button>
                         <Input 
                            type="number" 
                            className="w-16 h-8 text-center bg-transparent border-none p-0 text-sm font-semibold"
                            value={item.quantidade}
                            onChange={(e) => onUpdateItem(index, 'quantidade', e.target.value)}
                         />
                         <button onClick={() => onUpdateItem(index, 'quantidade', parseFloat(item.quantidade) + 1)} className="w-8 h-8 flex items-center justify-center border border-gray-200 dark:border-gray-600 rounded-lg">
                            <Plus className="w-3 h-3" />
                         </button>
                      </div>
                      <button 
                        onClick={() => onRemoveItem(index)}
                        className="text-xs text-red-500 font-medium px-2 py-1 rounded hover:bg-red-50"
                      >
                        Remover
                      </button>
                   </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer Summary */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 p-4 pb-8 md:pb-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
         <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Estimado</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</span>
         </div>
         <div className="text-xs text-gray-400 flex justify-between">
            <span>{totalItems} itens</span>
            <span>+ Frete/Desc calculados no final</span>
         </div>
      </div>
    </div>
  );
}