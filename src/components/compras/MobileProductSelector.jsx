import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Minus, ShoppingCart, ChevronLeft, Save, Trash2 } from 'lucide-react';
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
  const [view, setView] = useState('catalog'); // 'catalog' | 'cart' | 'edit'
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
        valor_frete_item: 0,
        valor_imposto1: 0,
        valor_imposto2: 0,
        outros_custos: 0,
        valor_desconto_item: 0,
        markup: 40,
        preco_venda_atual: product.preco_venda_padrao || 0
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
    const freight = parseFloat(item.valor_frete_item) || 0;
    const imp1 = parseFloat(item.valor_imposto1) || 0;
    const imp2 = parseFloat(item.valor_imposto2) || 0;
    const outros = parseFloat(item.outros_custos) || 0;
    const discount = parseFloat(item.valor_desconto_item) || 0;
    return (qty * cost) + freight + imp1 + imp2 + outros - discount;
  };

  if (view === 'edit' && editingItem) {
    const total = calculateTotal(editingItem);
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg">
        <div className="flex items-center p-3 border-b border-gray-100 dark:border-gray-700">
          <Button variant="ghost" size="icon" onClick={() => setView('catalog')}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="ml-2 font-medium truncate flex-1">{editingItem.produto_nome}</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Quantity Stepper */}
          <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
             <Label className="mb-3 text-xs uppercase tracking-wide text-gray-500">Quantidade ({editingItem.unidade_medida})</Label>
             <div className="flex items-center gap-6">
                <Button 
                  variant="outline" size="icon" className="h-12 w-12 rounded-full border-gray-300 dark:border-gray-600"
                  onClick={() => setEditingItem(prev => ({ ...prev, quantidade: Math.max(1, (parseFloat(prev.quantidade) || 0) - 1) }))}
                >
                  <Minus className="w-5 h-5" />
                </Button>
                <Input 
                  type="number"
                  className="w-24 text-center h-12 text-2xl font-bold bg-transparent border-none focus-visible:ring-0 p-0"
                  value={editingItem.quantidade}
                  onChange={e => setEditingItem(prev => ({ ...prev, quantidade: parseFloat(e.target.value) || 0 }))}
                />
                <Button 
                  variant="default" size="icon" className="h-12 w-12 rounded-full"
                  onClick={() => setEditingItem(prev => ({ ...prev, quantidade: (parseFloat(prev.quantidade) || 0) + 1 }))}
                >
                  <Plus className="w-5 h-5" />
                </Button>
             </div>
          </div>

          {/* Pricing Fields */}
          <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2">
                <Label className="text-xs text-gray-500 mb-1.5 block">Custo Unitário (R$)</Label>
                <Input 
                   type="number" step="0.01"
                   className="h-12 text-lg bg-gray-50 dark:bg-gray-800 border-transparent"
                   value={editingItem.custo_unitario}
                   onChange={e => setEditingItem(prev => ({ ...prev, custo_unitario: parseFloat(e.target.value) || 0 }))}
                />
             </div>
             <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Frete Total (+)</Label>
                <Input 
                   type="number" step="0.01"
                   className="h-12 bg-gray-50 dark:bg-gray-800 border-transparent text-gray-700"
                   value={editingItem.valor_frete_item}
                   onChange={e => setEditingItem(prev => ({ ...prev, valor_frete_item: parseFloat(e.target.value) || 0 }))}
                />
             </div>
             <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Desconto Total (-)</Label>
                <Input 
                   type="number" step="0.01"
                   className="h-12 bg-gray-50 dark:bg-gray-800 border-transparent text-red-500"
                   value={editingItem.valor_desconto_item}
                   onChange={e => setEditingItem(prev => ({ ...prev, valor_desconto_item: parseFloat(e.target.value) || 0 }))}
                />
             </div>
             <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Imposto 1 (+)</Label>
                <Input 
                   type="number" step="0.01"
                   className="h-12 bg-gray-50 dark:bg-gray-800 border-transparent text-orange-600"
                   value={editingItem.valor_imposto1 || 0}
                   onChange={e => setEditingItem(prev => ({ ...prev, valor_imposto1: parseFloat(e.target.value) || 0 }))}
                />
             </div>
             <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Imposto 2 (+)</Label>
                <Input 
                   type="number" step="0.01"
                   className="h-12 bg-gray-50 dark:bg-gray-800 border-transparent text-orange-600"
                   value={editingItem.valor_imposto2 || 0}
                   onChange={e => setEditingItem(prev => ({ ...prev, valor_imposto2: parseFloat(e.target.value) || 0 }))}
                />
             </div>
             <div className="col-span-2">
                <Label className="text-xs text-gray-500 mb-1.5 block">Outros Custos (+)</Label>
                <Input 
                   type="number" step="0.01"
                   className="h-12 bg-gray-50 dark:bg-gray-800 border-transparent text-gray-700"
                   value={editingItem.outros_custos || 0}
                   onChange={e => setEditingItem(prev => ({ ...prev, outros_custos: parseFloat(e.target.value) || 0 }))}
                />
             </div>
          </div>

          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg flex justify-between items-center mt-6">
             <span className="font-medium text-gray-600 dark:text-gray-400">Total do Item</span>
             <span className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          {editingIndex >= 0 && (
             <Button 
                variant="destructive" 
                className="flex-1"
                onClick={() => {
                   onRemoveItem(editingIndex);
                   setView('catalog');
                }}
             >
                <Trash2 className="w-4 h-4 mr-2" />
                Remover
             </Button>
          )}
          <Button 
            className={`flex-[2] ${editingIndex < 0 ? 'w-full' : ''}`} 
            onClick={handleSaveEdit}
          >
            <Save className="w-4 h-4 mr-2" />
            Confirmar
          </Button>
        </div>
      </div>
    );
  }

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
          Produtos
        </button>
        <button
          onClick={() => setView('cart')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all relative ${
            view === 'cart' 
              ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 shadow' 
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          Carrinho ({totalItems})
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
                const inCartCount = items.filter(i => i.produto_id === product.id).length;
                const isSelected = inCartCount > 0;
                
                return (
                  <div 
                    key={product.id} 
                    onClick={() => handleSelectProduct(product)}
                    className={`p-3 rounded-xl shadow-sm flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] ${
                        isSelected 
                        ? 'bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800' 
                        : 'bg-white dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex-1">
                      <div className={`font-medium ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-800 dark:text-gray-100'}`}>
                        {product.nome}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {product.codigo_interno || 'S/ Cód'} • {formatCurrency(product.valor_compra)}
                      </div>
                    </div>
                    
                    {isSelected ? (
                      <Badge className="bg-indigo-600 hover:bg-indigo-700 ml-2">
                        {inCartCount > 1 ? `${inCartCount}x` : 'No Carrinho'}
                      </Badge>
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                        <Plus className="w-4 h-4" />
                      </div>
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
                <div 
                    key={index} 
                    onClick={() => handleEditItem(index)}
                    className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm space-y-2 active:scale-[0.98] transition-transform"
                >
                   <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 dark:text-gray-100 line-clamp-1">{item.produto_nome || "Produto"}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {item.quantidade} {item.unidade_medida} x {formatCurrency(item.custo_unitario)}
                        </div>
                      </div>
                      <div className="text-right">
                         <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(item.total)}</div>
                         {(item.valor_frete_item > 0 || item.valor_desconto_item > 0) && (
                            <div className="text-[10px] text-gray-400">
                               {item.valor_frete_item > 0 && `+F: ${item.valor_frete_item}`}
                               {item.valor_desconto_item > 0 && ` -D: ${item.valor_desconto_item}`}
                            </div>
                         )}
                      </div>
                   </div>
                   <div className="text-xs text-blue-600 dark:text-blue-400 font-medium pt-1">
                      Toque para editar
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
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total do Pedido</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</span>
         </div>
         {view === 'cart' && items.length > 0 && (
             <Button className="w-full mt-3 bg-gray-900 text-white dark:bg-white dark:text-gray-900" onClick={() => setView('catalog')}>
                 Continuar Comprando
             </Button>
         )}
      </div>
    </div>
  );
}