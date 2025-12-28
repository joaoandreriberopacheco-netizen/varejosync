import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Minus, ShoppingCart, ChevronLeft, Save, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export default function MobileProductSelector({ 
  items, 
  products, 
  onAddItem, 
  onUpdateItem, 
  onRemoveItem,
  formatCurrency 
}) {
  const [view, setView] = useState('cart'); // 'catalog' | 'cart' | 'edit'
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editingIndex, setEditingIndex] = useState(-1);

  const filteredProducts = useMemo(() => {
    if (!search) return products.slice(0, 20);
    const lower = search.toLowerCase();
    return products.filter(p => 
      p.nome.toLowerCase().includes(lower) || 
      (p.codigo_interno && p.codigo_interno.toLowerCase().includes(lower)) ||
      (p.codigo_barras && p.codigo_barras.includes(lower))
    ).slice(0, 50);
  }, [products, search]);

  const handleSelectProduct = (product) => {
    // Check if already in cart
    const index = items.findIndex(i => i.produto_id === product.id);
    if (index >= 0) {
      handleEditItem(index);
    } else {
      // Initialize new item structure from product
      setEditingItem({
        produto_id: product.id,
        produto_nome: product.nome,
        codigo_produto: product.codigo_interno || product.codigo_barras || '',
        unidade_medida: product.unidade_principal || 'UN',
        quantidade: 1,
        custo_unitario: product.valor_compra || 0,
        valor_desconto_item: product.desconto_compra_padrao || 0
      });
      setEditingIndex(-1); // New item
      setView('edit');
    }
  };

  const handleEditItem = (index) => {
    const item = items[index];
    setEditingItem({
        ...item
    });
    setEditingIndex(index);
    setView('edit');
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    if (editingIndex >= 0) {
      // Update existing
      onUpdateItem(editingIndex, editingItem);
    } else {
      // Add new (using the special behavior of handleAddItem or we can construct it here and push)
      // The parent handleAddItem creates a default item from product. 
      // We need to pass the full editingItem. 
      // Since parent handleAddItem doesn't support passing full item overrides easily (it generates them),
      // we can call onAddItem(product) to create it, then immediately update it? 
      // Or better, let's look at parent handleAddItem again. 
      // Parent handleAddItem takes (product).
      // We can use onAddItem(null) then update the last item? Risky.
      // Let's manually invoke the logic similar to onAddItem but using onUpdateItem mechanism isn't possible for *new*.
      // Wait, onAddItem in parent:
      // const handleAddItem = (product = null) => { ... logic to create item from product ... setFormData ... }
      
      // I should have refactored handleAddItem to accept a full item, but I didn't.
      // Workaround: Call onAddItem with a "mock" product that has the values we want? 
      // Or we can assume onAddItem returns nothing and we can't get the index.
      // Actually, since I am in a component, I can't easily change parent state "atomically" to add and then update.
      
      // Let's adapt: The user wants to "Select Product" -> "Edit" -> "Save".
      // We can just add the item to the list in parent.
      // I'll assume onAddItem can handle a raw item object if I pass it, or I modify parent to handle it.
      // Let's modify parent handleAddItem slightly to accept a full item object if provided.
      // I'll do that via find_replace in a second. 
      // For now, let's assume onAddItem(editingItem) works if I change parent.
      onAddItem(editingItem); 
    }
    setView('catalog');
    setEditingItem(null);
    setEditingIndex(-1);
    setSearch('');
  };

  const calculateTotal = (item) => {
    const qty = parseFloat(item.quantidade) || 0;
    const cost = parseFloat(item.custo_unitario) || 0;
    const discountUnit = parseFloat(item.valor_desconto_item) || 0;
    
    const unitFinalCost = cost - discountUnit;
    return unitFinalCost * qty;
  };

  if (view === 'edit' && editingItem) {
    const total = calculateTotal(editingItem);
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg">
        <div className="flex items-center p-2.5 border-b border-gray-100 dark:border-gray-700">
          <Button variant="ghost" size="icon" onClick={() => {
            setView('catalog');
            setEditingItem(null);
            setEditingIndex(-1);
          }}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="ml-2 font-medium truncate flex-1 text-sm">{editingItem.produto_nome}</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* Quantity Stepper */}
          <div className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
             <Label className="mb-3 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Quantidade ({editingItem.unidade_medida})</Label>
             <div className="flex items-center gap-5">
                <Button 
                  variant="outline" size="icon" className="h-11 w-11 rounded-full border-gray-300 dark:border-gray-600"
                  onClick={() => setEditingItem(prev => ({ ...prev, quantidade: Math.max(1, (parseFloat(prev.quantidade) || 0) - 1) }))}
                >
                  <Minus className="w-5 h-5" />
                </Button>
                <Input 
                  type="text"
                  inputMode="decimal"
                  className="w-20 text-center h-11 text-2xl font-bold bg-transparent border-none focus-visible:ring-0 p-0 shadow-none text-gray-900 dark:text-white"
                  value={editingItem.quantidade > 0 ? editingItem.quantidade : ''}
                  onChange={e => {
                    const val = e.target.value.replace(',', '.');
                    setEditingItem(prev => ({ ...prev, quantidade: parseFloat(val) || 0 }));
                  }}
                  placeholder="0"
                />
                <Button 
                  variant="default" size="icon" className="h-11 w-11 rounded-full"
                  onClick={() => setEditingItem(prev => ({ ...prev, quantidade: (parseFloat(prev.quantidade) || 0) + 1 }))}
                >
                  <Plus className="w-5 h-5" />
                </Button>
             </div>
          </div>

          {/* Pricing Field - Somente Custo Unitário */}
          <div>
            <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2.5 block">Custo Unitário (R$)</Label>
            <Input 
              type="text"
              inputMode="decimal"
              className="h-13 text-xl font-bold bg-gray-50 dark:bg-gray-800 border-0 shadow-sm text-center text-gray-900 dark:text-white"
              value={editingItem.custo_unitario > 0 ? editingItem.custo_unitario : ''}
              onChange={e => {
                const val = e.target.value.replace(',', '.');
                setEditingItem(prev => ({ ...prev, custo_unitario: parseFloat(val) || 0 }));
              }}
              placeholder="255"
            />
          </div>

          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg flex justify-between items-center">
             <span className="font-medium text-gray-600 dark:text-gray-400 text-sm">Total do Item</span>
             <span className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="p-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
          <Button 
            className="w-full" 
            onClick={handleSaveEdit}
          >
            <Save className="w-4 h-4 mr-2" />
            Confirmar
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setView('catalog');
                setEditingItem(null);
                setEditingIndex(-1);
              }}
            >
              Cancelar
            </Button>
            {editingIndex >= 0 && (
               <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => {
                     onRemoveItem(editingIndex);
                     setView('catalog');
                     setEditingItem(null);
                     setEditingIndex(-1);
                  }}
               >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover
               </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const totalItems = items.length;
  const totalValue = items.reduce((acc, item) => acc + (item.total || 0), 0);

  return (
    <div className="h-full bg-white dark:bg-gray-900 rounded-lg flex flex-col">
      {view === 'catalog' && (
        <div className="flex items-center p-2.5 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setView('cart')}>
            <X className="w-5 h-5" />
          </Button>
          <div className="ml-2 font-medium text-sm flex-1">Buscar Produtos</div>
        </div>
      )}

      <div className="flex-1 p-2 min-h-0 overflow-y-auto">
        {view === 'cart' ? (
          <div className="space-y-2">
            {items.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <ShoppingCart className="w-12 h-12 mb-2 opacity-20" />
                  <p className="mb-4">Carrinho vazio</p>
                  <Button 
                    onClick={() => setView('catalog')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Produtos
                  </Button>
               </div>
            ) : (
              <>
                {items.map((item, index) => (
                  <div 
                      key={index} 
                      onClick={() => handleEditItem(index)}
                      className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                  >
                     <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 dark:text-gray-100 line-clamp-1 text-sm">{item.produto_nome || "Produto"}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {item.quantidade} {item.unidade_medida} x {formatCurrency(item.custo_unitario)}
                          </div>
                        </div>
                        <div className="text-right ml-2">
                           <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(item.total)}</div>
                           {item.valor_desconto_item > 0 && (
                              <div className="text-[10px] text-green-600 dark:text-green-500">
                                 -Desc: {formatCurrency(item.valor_desconto_item)}
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
                ))}
                <Button 
                  className="w-full mt-3" 
                  variant="outline"
                  onClick={() => setView('catalog')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Mais Produtos
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative sticky top-0 bg-white dark:bg-gray-900 pb-2 z-10">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar produto..."
                className="pl-9 bg-gray-50 dark:bg-gray-800 border-none shadow-sm h-10 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400"
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              {filteredProducts.map(product => {
                const inCartCount = items.filter(i => i.produto_id === product.id).length;
                const isSelected = inCartCount > 0;
                
                return (
                  <div 
                    key={product.id} 
                    onClick={() => handleSelectProduct(product)}
                    className={`p-2.5 rounded-xl shadow-sm flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] ${
                        isSelected 
                        ? 'bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800' 
                        : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm truncate ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-800 dark:text-gray-100'}`}>
                        {product.nome}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {product.codigo_interno || 'S/ Cód'} • {formatCurrency(product.valor_compra)}
                      </div>
                    </div>
                    
                    {isSelected ? (
                      <Badge className="bg-indigo-600 hover:bg-indigo-700 ml-2 text-xs flex-shrink-0">
                        {inCartCount > 1 ? `${inCartCount}x` : '✓'}
                      </Badge>
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 flex-shrink-0 ml-2">
                        <Plus className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 p-3 pb-8 md:pb-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex-shrink-0">
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="relative w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                {totalItems > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                    {totalItems}
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Total</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</span>
         </div>
      </div>
    </div>
  );
}