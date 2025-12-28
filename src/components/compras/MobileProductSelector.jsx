import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Minus, ShoppingCart, ChevronLeft, Save, Trash2, X, DollarSign, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export default function MobileProductSelector({ 
  items, 
  products, 
  onAddItem, 
  onUpdateItem, 
  onRemoveItem,
  formatCurrency,
  onOpenAdjustPrices
}) {
  const [view, setView] = useState('menu'); // 'menu' | 'catalog' | 'cart' | 'edit'
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [quantidadeInput, setQuantidadeInput] = useState('');
  const [custoInput, setCustoInput] = useState('');
  const custoInputRef = React.useRef(null);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return [];
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
      const newItem = {
        produto_id: product.id,
        produto_nome: product.nome,
        codigo_produto: product.codigo_interno || product.codigo_barras || '',
        unidade_medida: product.unidade_principal || 'UN',
        quantidade: 1,
        custo_unitario: product.valor_compra || 0,
        valor_desconto_item: product.desconto_compra_padrao || 0
      };
      setEditingItem(newItem);
      setQuantidadeInput((1).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setCustoInput((product.valor_compra || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setEditingIndex(-1); // New item
      setView('edit');
    }
  };

  const handleEditItem = (index) => {
    const item = items[index];
    setEditingItem({ ...item });
    setQuantidadeInput((item.quantidade || 1).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setCustoInput((item.custo_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
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
    setView('menu');
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

  // Menu Principal
  if (view === 'menu') {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900">
        <div className="flex-1 flex flex-col p-4 space-y-3">
          {/* Buscar Produtos */}
          <button
            onClick={() => setView('catalog')}
            className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 shadow-sm active:scale-[0.98] transition-transform flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm">
              <Search className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900 dark:text-white">Buscar Produtos</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Adicionar itens ao pedido</div>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
          </button>

          {/* Carrinho */}
          <button
            onClick={() => setView('cart')}
            className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 shadow-sm active:scale-[0.98] transition-transform flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm relative">
              <ShoppingCart className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              {items.length > 0 && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {items.length}
                </div>
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900 dark:text-white">Carrinho de Itens</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {items.length > 0 ? `${items.length} ${items.length === 1 ? 'item' : 'itens'}` : 'Nenhum item adicionado'}
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
          </button>

          {/* Ajustar Preços */}
          <button
            onClick={() => onOpenAdjustPrices?.()}
            disabled={items.length === 0}
            className={`rounded-xl p-6 shadow-sm active:scale-[0.98] transition-transform flex items-center gap-4 ${
              items.length === 0 
                ? 'bg-gray-100 dark:bg-gray-800/50 opacity-50' 
                : 'bg-gray-50 dark:bg-gray-800'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center shadow-sm">
              <DollarSign className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900 dark:text-white">Ajustar Preços</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {items.length === 0 ? 'Adicione itens primeiro' : 'Atualizar custos dos produtos'}
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  if (view === 'edit' && editingItem) {
    const total = calculateTotal(editingItem);
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
        <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => {
            setView('menu');
            setEditingItem(null);
            setEditingIndex(-1);
          }} className="h-10 w-10">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="ml-2 font-medium truncate flex-1 text-gray-900 dark:text-white">{editingItem.produto_nome}</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* Quantity Stepper */}
          <div className="flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
             <Label className="mb-3 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Quantidade ({editingItem.unidade_medida})</Label>
             <div className="flex items-center gap-5">
                <Button 
                 variant="outline" size="icon" className="h-11 w-11 rounded-full border-gray-300 dark:border-gray-600"
                 onClick={() => {
                   const newVal = Math.max(1, (parseFloat(editingItem.quantidade) || 0) - 1);
                   setEditingItem(prev => ({ ...prev, quantidade: newVal }));
                   setQuantidadeInput(newVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                 }}
                >
                 <Minus className="w-5 h-5" />
                </Button>
                <Input 
                  type="text"
                  inputMode="decimal"
                  className="w-20 text-center h-11 text-2xl font-bold bg-transparent border-none focus-visible:ring-0 p-0 shadow-none text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600"
                  value={quantidadeInput}
                  onChange={e => {
                    const val = e.target.value;
                    if (/^[\d.,]*$/.test(val)) {
                      setQuantidadeInput(val);
                      const numVal = parseFloat(val.replace(',', '.'));
                      if (!isNaN(numVal)) {
                        setEditingItem(prev => ({ ...prev, quantidade: numVal }));
                      }
                    }
                  }}
                  onFocus={e => e.target.select()}
                  onBlur={() => {
                    const num = parseFloat(quantidadeInput.replace(',', '.')) || 0;
                    setQuantidadeInput(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                    setEditingItem(prev => ({ ...prev, quantidade: num }));
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      custoInputRef.current?.focus();
                    }
                  }}
                  placeholder="0,00"
                />
                <Button 
                 variant="default" size="icon" className="h-11 w-11 rounded-full"
                 onClick={() => {
                   const newVal = (parseFloat(editingItem.quantidade) || 0) + 1;
                   setEditingItem(prev => ({ ...prev, quantidade: newVal }));
                   setQuantidadeInput(newVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                 }}
                >
                 <Plus className="w-5 h-5" />
                </Button>
             </div>
          </div>

          {/* Pricing Field - Somente Custo Unitário */}
          <div>
            <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2.5 block">Custo Unitário (R$)</Label>
            <Input 
              ref={custoInputRef}
              type="text"
              inputMode="decimal"
              className="h-13 text-xl font-bold bg-gray-50 dark:bg-gray-800 border-0 shadow-sm text-center text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600"
              value={custoInput}
              onChange={e => {
                const val = e.target.value;
                if (/^[\d.,]*$/.test(val)) {
                  setCustoInput(val);
                  const numVal = parseFloat(val.replace(',', '.'));
                  if (!isNaN(numVal)) {
                    setEditingItem(prev => ({ ...prev, custo_unitario: numVal }));
                  }
                }
              }}
              onFocus={e => e.target.select()}
              onBlur={() => {
                const num = parseFloat(custoInput.replace(',', '.')) || 0;
                setCustoInput(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                setEditingItem(prev => ({ ...prev, custo_unitario: num }));
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.target.blur();
                }
              }}
              placeholder="0,00"
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
                setView('menu');
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
                     setView('menu');
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

  // View: Catalog (Busca de Produtos)
  if (view === 'catalog') {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
        <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setView('menu')} className="h-10 w-10">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="ml-2 font-medium flex-1 text-gray-900 dark:text-white">Buscar Produtos</div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="relative sticky top-0 bg-white dark:bg-gray-900 pb-3 z-10">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar produto..."
              className="pl-11 bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-12 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2 mt-2">
            {search.trim() === '' ? (
              <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="font-medium">Digite para buscar</p>
                <p className="text-sm mt-1">Ex: areia, tinta, tubo...</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map(product => {
                const inCartCount = items.filter(i => i.produto_id === product.id).length;
                const isSelected = inCartCount > 0;
                
                return (
                  <div 
                    key={product.id} 
                    onClick={() => handleSelectProduct(product)}
                    className={`p-4 rounded-xl shadow-sm flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] ${
                        isSelected 
                        ? 'bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800' 
                        : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-800 dark:text-gray-100'}`}>
                        {product.nome}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {product.codigo_interno || 'S/ Cód'} • {formatCurrency(product.valor_compra)}
                      </div>
                    </div>
                    
                    {isSelected ? (
                      <Badge className="bg-indigo-600 hover:bg-indigo-700 ml-3 flex-shrink-0">
                        {inCartCount > 1 ? `${inCartCount}x` : '✓'}
                      </Badge>
                    ) : (
                      <div className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 flex-shrink-0 ml-3">
                        <Plus className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="font-medium">Nenhum produto encontrado</p>
                <p className="text-sm mt-1">para "{search}"</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</span>
          </div>
        </div>
      </div>
    );
  }

  // View: Cart (Carrinho)
  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => setView('menu')} className="h-10 w-10">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="ml-2 font-medium flex-1 text-gray-900 dark:text-white">Carrinho de Itens</div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium mb-1">Carrinho vazio</p>
            <p className="text-sm mb-6">Adicione produtos ao pedido</p>
            <Button 
              onClick={() => setView('catalog')}
              className="bg-gray-700 hover:bg-gray-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Buscar Produtos
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div 
                key={index} 
                onClick={() => handleEditItem(index)}
                className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 dark:text-gray-100 line-clamp-1">{item.produto_nome || "Produto"}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {item.quantidade} {item.unidade_medida} x {formatCurrency(item.custo_unitario)}
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="font-bold text-gray-900 dark:text-white">{formatCurrency(item.total)}</div>
                    {item.valor_desconto_item > 0 && (
                      <div className="text-xs text-green-600 dark:text-green-500">
                        -Desc: {formatCurrency(item.valor_desconto_item)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <Button 
              className="w-full mt-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 border-0 shadow-sm" 
              variant="outline"
              onClick={() => setView('catalog')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Mais Produtos
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
          <span className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</span>
        </div>
      </div>
    </div>
  );
}