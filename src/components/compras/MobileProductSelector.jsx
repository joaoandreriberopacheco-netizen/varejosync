import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Minus, ShoppingCart, ChevronLeft, Trash2, DollarSign, AlertCircle, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import NovoProdutoRapidoDialog from './NovoProdutoRapidoDialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export default function MobileProductSelector({ 
  items, 
  products, 
  onAddItem, 
  onUpdateItem, 
  onRemoveItem,
  formatCurrency,
  onOpenAdjustPrices,
  isLocked,
  onProductCreated
}) {
  const [view, setView] = useState('menu'); // 'menu' | 'discount-entry' | 'catalog' | 'cart' | 'edit'
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [quantidadeInput, setQuantidadeInput] = useState('');
  const [custoInput, setCustoInput] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showNovoProduto, setShowNovoProduto] = useState(false);
  // Desconto global sobre preços de compra
  const [descontoGlobalPct, setDescontoGlobalPct] = useState(0);
  const [descontoGlobalPctInput, setDescontoGlobalPctInput] = useState('');
  // Desconto por item na tela de edição (interdependentes)
  const [descontoPctInput, setDescontoPctInput] = useState('');
  const [descontoValorInput, setDescontoValorInput] = useState('');
  // Estado da tela de entrada de desconto global
  const [discountInputVal, setDiscountInputVal] = useState('');
  const [tipoDesconto, setTipoDesconto] = useState('desconto');
  const discountInputRef = React.useRef(null);
  const quantidadeInputRef = React.useRef(null);
  const custoInputRef = React.useRef(null);

  // Auto-focus ao entrar na tela de edição
  useEffect(() => {
    if (view === 'edit' && quantidadeInputRef.current) {
      setTimeout(() => {
        quantidadeInputRef.current?.focus();
        quantidadeInputRef.current?.select();
      }, 100);
    }
  }, [view]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return [];
    const lower = search.toLowerCase();
    return products.filter(p => 
      p.nome.toLowerCase().includes(lower) || 
      (p.codigo_interno && p.codigo_interno.toLowerCase().includes(lower)) ||
      (p.codigo_barras && p.codigo_barras.includes(lower))
    ).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).slice(0, 50);
  }, [products, search]);

  const handleSelectProduct = (product) => {
    const index = items.findIndex(i => i.produto_id === product.id);
    if (index >= 0) {
      handleEditItem(index);
    } else {
      const custo = product.valor_compra || 0;
      // Aplica desconto/acréscimo global (%) sobre o custo
      // descontoGlobalPct > 0 = desconto (subtrai), < 0 = acréscimo (soma)
      const descontoValorBase = descontoGlobalPct !== 0
        ? parseFloat((custo * Math.abs(descontoGlobalPct) / 100).toFixed(2))
        : (product.desconto_compra_padrao || 0);
      // Para acréscimo, valor negativo faz calculateTotal somar ao custo
      const descontoValor = descontoGlobalPct < 0 ? -descontoValorBase : descontoValorBase;
      const newItem = {
        produto_id: product.id,
        produto_nome: product.nome,
        codigo_produto: product.codigo_interno || product.codigo_barras || '',
        unidade_medida: product.unidade_principal || 'UN',
        quantidade: 1,
        custo_unitario: custo,
        valor_desconto_item: descontoValor,
        desconto_pct_item: descontoGlobalPct !== 0 ? Math.abs(descontoGlobalPct) : 0,
      };
      setEditingItem(newItem);
      setQuantidadeInput((1).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setCustoInput(custo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      const pctNum = descontoGlobalPct !== 0 ? Math.abs(descontoGlobalPct) : (custo > 0 ? (product.desconto_compra_padrao || 0) / custo * 100 : 0);
      setDescontoPctInput(pctNum > 0 ? String(Math.round(pctNum * 100) / 100) : '');
      setDescontoValorInput(Math.abs(descontoValor) > 0 ? Math.abs(descontoValor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
      setEditingIndex(-1);
      setView('edit');
    }
  };

  const handleEditItem = (index) => {
    const item = items[index];
    setEditingItem({ ...item });
    setQuantidadeInput((item.quantidade || 1).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setCustoInput((item.custo_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    const custo = item.custo_unitario || 0;
    const desc = item.valor_desconto_item || 0; // pode ser negativo (acréscimo)
    const absDesc = Math.abs(desc);
    const pct = item.desconto_pct_item || (custo > 0 ? (absDesc / custo) * 100 : 0);
    setDescontoPctInput(pct > 0 ? String(Math.round(pct * 100) / 100) : '');
    setDescontoValorInput(absDesc > 0 ? absDesc.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
    setEditingIndex(index);
    setView('edit');
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    if (editingIndex >= 0) {
      // Update existing
      onUpdateItem(editingIndex, editingItem);
    } else {
      // Add new - pass complete item
      onAddItem(editingItem); 
    }
    
    // Reset form and return to catalog for quick next product
    setEditingItem(null);
    setEditingIndex(-1);
    setSearch('');
    setView('catalog');
    
    // Small delay to ensure state is updated before next action
    setTimeout(() => {
      const searchInput = document.querySelector('[placeholder="Buscar produto..."]');
      searchInput?.focus();
    }, 100);
  };

  const calculateTotal = (item) => {
    const qty = parseFloat(item.quantidade) || 0;
    const cost = parseFloat(item.custo_unitario) || 0;
    const discountUnit = parseFloat(item.valor_desconto_item) || 0;
    
    const unitFinalCost = cost - discountUnit;
    return unitFinalCost * qty;
  };

  // Helpers de parse BR
  const parseBR = (s) => parseFloat(String(s || '').replace(/\./g, '').replace(',', '.')) || 0;
  const fmtBR = (n) => (parseFloat(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Sincroniza ao entrar na tela de desconto
  useEffect(() => {
    if (view === 'discount-entry') {
      setDiscountInputVal(descontoGlobalPct !== 0 ? String(Math.abs(descontoGlobalPct)) : '');
      setTipoDesconto(descontoGlobalPct < 0 ? 'acrescimo' : 'desconto');
      setTimeout(() => discountInputRef.current?.focus(), 150);
    }
  }, [view]);

  if (view === 'discount-entry') {
    const numVal = parseFloat(discountInputVal.replace(',', '.')) || 0;

    const handleConfirm = () => {
      const final = tipoDesconto === 'acrescimo' ? -numVal : numVal;
      setDescontoGlobalPct(final);
      setDescontoGlobalPctInput(numVal !== 0 ? String(numVal) : '');
      setView('catalog');
    };

    const isDesconto = tipoDesconto === 'desconto';

    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 z-[60] flex flex-col">
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setView('menu')} className="h-10 w-10">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="ml-2 font-semibold text-gray-900 dark:text-white">Desconto / Acréscimo Global</span>
        </div>

        <div className="flex-1 flex flex-col px-6 pt-8 pb-6 gap-6">
          {/* Toggle Desconto / Acréscimo */}
          <div className="flex rounded-2xl bg-gray-100 dark:bg-gray-800 p-1 gap-1">
            <button
              onClick={() => setTipoDesconto('desconto')}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                isDesconto
                  ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              Desconto
            </button>
            <button
              onClick={() => setTipoDesconto('acrescimo')}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                !isDesconto
                  ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Acréscimo
            </button>
          </div>

          {/* Visor com input nativo */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-6 py-8 flex flex-col items-center shadow-sm gap-3">
            <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              {isDesconto ? 'Desconto sobre todos os itens' : 'Acréscimo sobre todos os itens'}
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-5xl font-bold ${isDesconto ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {isDesconto ? '−' : '+'}
              </span>
              <input
                ref={discountInputRef}
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.01"
                value={discountInputVal}
                onChange={e => setDiscountInputVal(e.target.value)}
                onFocus={e => e.target.select()}
                placeholder="0"
                className={`w-40 text-center text-6xl font-bold bg-transparent border-none outline-none tabular-nums ${
                  isDesconto ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                }`}
                style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
              />
              <span className="text-3xl font-medium text-gray-400">%</span>
            </div>
            {numVal > 0 && (
              <p className="text-sm text-gray-400 mt-1">
                Ex: R$ 100,00 → <strong className={isDesconto ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
                  R$ {(isDesconto ? 100 - numVal : 100 + numVal).toFixed(2)}
                </strong>
              </p>
            )}
          </div>

          <div className="flex-1" />

          {/* Botões de ação */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-14 text-base rounded-2xl border-0 shadow-sm"
              onClick={() => {
                setDescontoGlobalPct(0);
                setDescontoGlobalPctInput('');
                setView('catalog');
              }}
            >
              Sem desc./acrésc.
            </Button>
            <Button
              className="flex-1 h-14 text-base rounded-2xl"
              onClick={handleConfirm}
            >
              <ArrowRight className="w-5 h-5 mr-2" />
              Buscar Itens
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Menu Principal
  if (view === 'menu') {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900">
        <div className="flex-1 flex flex-col p-4 space-y-3">
          {/* Buscar Produtos */}
          <button
            onClick={() => setView('discount-entry')}
            className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 shadow-sm active:scale-[0.98] transition-transform flex items-center gap-4"
            disabled={isLocked}
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

          {/* Resumo do Pedido */}
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
              <div className="font-medium text-gray-900 dark:text-white">Resumo do Pedido</div>
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
      <div className="fixed inset-0 bg-white dark:bg-gray-900 z-[60] flex flex-col">
        <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => {
            setEditingItem(null);
            setEditingIndex(-1);
            setView('catalog');
          }} className="h-10 w-10">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="ml-2 font-medium truncate flex-1 text-gray-900 dark:text-white">{editingItem.produto_nome}</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {isLocked && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <span className="font-medium">Edição bloqueada.</span> Pedido em aprovação financeira.
                </p>
              </div>
            </div>
          )}
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
                 disabled={isLocked}
                >
                 <Minus className="w-5 h-5" />
                </Button>
                <Input 
                ref={quantidadeInputRef}
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
                  const num = parseFloat(quantidadeInput.replace(',', '.')) || 1;
                  setQuantidadeInput(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                  setEditingItem(prev => ({ ...prev, quantidade: num }));
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    custoInputRef.current?.focus();
                    custoInputRef.current?.select();
                  }
                }}
                placeholder="0,00"
                disabled={isLocked}
                />
                <Button 
                 variant="default" size="icon" className="h-11 w-11 rounded-full"
                 onClick={() => {
                   const newVal = (parseFloat(editingItem.quantidade) || 0) + 1;
                   setEditingItem(prev => ({ ...prev, quantidade: newVal }));
                   setQuantidadeInput(newVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                 }}
                 disabled={isLocked}
                >
                 <Plus className="w-5 h-5" />
                </Button>
             </div>
          </div>

          {/* Pricing Field */}
          <div>
            <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2.5 block">Preço de Compra (R$)</Label>
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
                    setEditingItem(prev => {
                      const pct = parseFloat(descontoPctInput) || 0;
                      const novoDesc = parseFloat((numVal * pct / 100).toFixed(2));
                      setDescontoValorInput(novoDesc > 0 ? fmtBR(novoDesc) : '');
                      return { ...prev, custo_unitario: numVal, valor_desconto_item: novoDesc };
                    });
                  }
                }
              }}
              onFocus={e => e.target.select()}
              onBlur={() => {
                const num = parseFloat(custoInput.replace(',', '.')) || 0;
                setCustoInput(fmtBR(num));
                setEditingItem(prev => {
                  const pct = parseFloat(descontoPctInput) || 0;
                  const novoDesc = parseFloat((num * pct / 100).toFixed(2));
                  setDescontoValorInput(novoDesc > 0 ? fmtBR(novoDesc) : '');
                  return { ...prev, custo_unitario: num, valor_desconto_item: novoDesc };
                });
              }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(); } }}
              placeholder="0,00"
              disabled={isLocked}
            />
          </div>

          {/* Desconto/Acréscimo - campos interdependentes */}
          {(() => {
            const isAcrescimo = (editingItem?.valor_desconto_item || 0) < 0;
            const labelPct = isAcrescimo ? 'Acréscimo %' : 'Desconto %';
            const labelVal = isAcrescimo ? 'Acréscimo R$' : 'Desconto R$';
            return (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">{labelPct}</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={descontoPctInput}
                    onChange={e => {
                      const v = e.target.value;
                      if (/^[\d.,]*$/.test(v)) {
                        setDescontoPctInput(v);
                        const pct = parseBR(v);
                        const custo = parseFloat(editingItem?.custo_unitario) || 0;
                        const absDesc = parseFloat((custo * pct / 100).toFixed(2));
                        // preserve sign based on current state
                        const sign = (editingItem?.valor_desconto_item || 0) < 0 ? -1 : 1;
                        const novoDesc = sign * absDesc;
                        setDescontoValorInput(absDesc > 0 ? fmtBR(absDesc) : '');
                        setEditingItem(prev => ({ ...prev, valor_desconto_item: novoDesc, desconto_pct_item: pct }));
                      }
                    }}
                    onFocus={e => e.target.select()}
                    onBlur={() => {
                      const pct = parseBR(descontoPctInput);
                      setDescontoPctInput(pct > 0 ? String(Math.round(pct * 100) / 100) : '');
                    }}
                    className="h-11 text-center bg-gray-50 dark:bg-gray-800 border-0 shadow-sm text-sm rounded-xl"
                    disabled={isLocked}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">{labelVal}</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={descontoValorInput}
                    onChange={e => {
                      const v = e.target.value;
                      if (/^[\d.,]*$/.test(v)) {
                        setDescontoValorInput(v);
                        const absDesc = parseBR(v);
                        const custo = parseFloat(editingItem?.custo_unitario) || 0;
                        const novoPct = custo > 0 ? parseFloat(((absDesc / custo) * 100).toFixed(4)) : 0;
                        const sign = (editingItem?.valor_desconto_item || 0) < 0 ? -1 : 1;
                        const novoDesc = sign * absDesc;
                        setDescontoPctInput(novoPct > 0 ? String(Math.round(novoPct * 100) / 100) : '');
                        setEditingItem(prev => ({ ...prev, valor_desconto_item: novoDesc, desconto_pct_item: novoPct }));
                      }
                    }}
                    onFocus={e => e.target.select()}
                    onBlur={() => {
                      const desc = parseBR(descontoValorInput);
                      setDescontoValorInput(desc > 0 ? fmtBR(desc) : '');
                    }}
                    className="h-11 text-center bg-gray-50 dark:bg-gray-800 border-0 shadow-sm text-sm rounded-xl"
                    disabled={isLocked}
                  />
                </div>
              </div>
            );
          })()}

          {/* Custo líquido + total */}
          {(() => {
            const custo = parseFloat(editingItem?.custo_unitario) || 0;
            const desc = parseFloat(editingItem?.valor_desconto_item) || 0; // negativo = acréscimo
            const liquido = custo - desc;
            const isAcrescimo = desc < 0;
            return desc !== 0 ? (
              <div className="flex justify-between items-center text-sm px-1">
                <span className="text-gray-500 dark:text-gray-400">Custo {isAcrescimo ? 'com acréscimo' : 'líquido'}</span>
                <span className={`font-semibold ${isAcrescimo ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{formatCurrency(liquido)}</span>
              </div>
            ) : null;
          })()}

          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg flex justify-between items-center">
             <span className="font-medium text-gray-600 dark:text-gray-400 text-sm">Total do Item</span>
             <span className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          {editingIndex >= 0 ? (
            <div className="space-y-2">
              <Button 
                className="w-full h-12" 
                onClick={handleSaveEdit}
                disabled={isLocked}
              >
                Salvar Alterações
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 h-12"
                  onClick={() => {
                    setEditingItem(null);
                    setEditingIndex(-1);
                    setView('catalog');
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1 h-12"
                  onClick={() => {
                     onRemoveItem(editingIndex);
                     setEditingItem(null);
                     setEditingIndex(-1);
                     setView('catalog');
                  }}
                  disabled={isLocked}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remover
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button 
                variant="outline"
                className="flex-1 h-14 text-base"
                onClick={() => {
                  setEditingItem(null);
                  setEditingIndex(-1);
                  setView('catalog');
                }}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1 h-14 text-base"
                onClick={handleSaveEdit}
                disabled={isLocked}
              >
                OK
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const totalItems = items.length;
  const totalValue = items.reduce((acc, item) => acc + (item.total || 0), 0);

  // View: Catalog (Busca de Produtos)
  if (view === 'catalog') {
    return (
      <>
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-[60] flex flex-col">
          <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 gap-2">
            <Button variant="ghost" size="icon" onClick={() => setView('menu')} className="h-10 w-10">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="ml-2 font-medium flex-1 text-gray-900 dark:text-white">Buscar Produtos</div>
            {items.length > 0 && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setView('cart')}
                className="h-10 w-10 relative"
              >
                <ShoppingCart className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {items.length}
                </div>
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 p-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              {/* Badge de desconto global ativo */}
              {descontoGlobalPct !== 0 && (
                <button
                  onClick={() => setView('discount-entry')}
                  className={`w-full mb-3 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-medium ${
                    descontoGlobalPct > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  }`}
                >
                  {descontoGlobalPct > 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                  {descontoGlobalPct > 0 ? 'Desconto' : 'Acréscimo'} global de {Math.abs(descontoGlobalPct)}% ativo — toque para alterar
                </button>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Buscar produto..."
                  className="pl-11 bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-12 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setSelectedIndex(-1); }}
                  onKeyDown={e => {
                    if (!filteredProducts.length) return;
                    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => prev < filteredProducts.length - 1 ? prev + 1 : 0); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => prev > 0 ? prev - 1 : filteredProducts.length - 1); }
                    else if (e.key === 'Enter' && selectedIndex >= 0) { e.preventDefault(); handleSelectProduct(filteredProducts[selectedIndex]); setSelectedIndex(-1); }
                    else if (e.key === 'Tab' && filteredProducts.length > 0) { e.preventDefault(); setSelectedIndex(prev => prev < filteredProducts.length - 1 ? prev + 1 : 0); }
                  }}
                  autoFocus
                  disabled={isLocked}
                />
              </div>
            </div>

            <div className="p-4 space-y-2">
              {search.trim() === '' ? (
                <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                  <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="font-medium">Digite para buscar</p>
                  <p className="text-sm mt-1">Ex: areia, tinta, tubo...</p>
                </div>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product, idx) => {
                  const inCart = items.find(i => i.produto_id === product.id);
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={product.id}
                      onClick={() => { if (!isLocked) handleSelectProduct(product); }}
                      className={`p-4 rounded-xl shadow-sm cursor-pointer transition-all active:scale-[0.98] ${
                        isSelected
                          ? 'bg-indigo-100 border-2 border-indigo-400 dark:bg-indigo-900/40 dark:border-indigo-600'
                          : inCart
                          ? 'bg-indigo-50 border border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800'
                          : 'bg-gray-50 dark:bg-gray-800'
                      } ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium truncate ${inCart ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-800 dark:text-gray-100'}`}>
                            {product.nome}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                            {product.codigo_interno || 'S/ Cód'} • {formatCurrency(product.valor_compra)}
                          </div>
                        </div>
                        {inCart && (
                          <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200 border-0">
                            {inCart.quantidade} {inCart.unidade_medida}
                          </Badge>
                        )}
                      </div>
                      {inCart && (
                        <div className="mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-800 flex justify-between items-center">
                          <span className="text-xs text-indigo-700 dark:text-indigo-300">Total do item</span>
                          <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100">{formatCurrency(inCart.total || 0)}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Search className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="font-medium">Nenhum produto encontrado</p>
                  <p className="text-sm mt-1">para "{search}"</p>
                </div>
              )}
            </div>
          </div>
          {/* FAB - Criar Produto */}
          {!isLocked && (
            <button
              onClick={() => {
                document.activeElement?.blur();
                setShowNovoProduto(true);
              }}
              className="fixed bottom-6 right-6 z-[70] w-14 h-14 bg-gray-800 dark:bg-white text-white dark:text-gray-900 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
              title="Criar novo produto"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
        </div>
        <NovoProdutoRapidoDialog
          isOpen={showNovoProduto}
          onClose={() => setShowNovoProduto(false)}
          nomeInicial={search}
          onSuccess={(novoProduto) => {
            if (onProductCreated) onProductCreated(novoProduto);
            handleSelectProduct(novoProduto);
            setSearch('');
            setShowNovoProduto(false);
          }}
        />
      </>
    );
  }

  // View: Cart (Resumo com edição de itens)
  const sortedItems = [...items].sort((a, b) => 
    (a.produto_nome || '').localeCompare(b.produto_nome || '', 'pt-BR')
  );

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-[60] flex flex-col">
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 gap-2">
        <Button variant="ghost" size="icon" onClick={() => setView('catalog')} className="h-10 w-10">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="ml-2 font-medium flex-1 text-gray-900 dark:text-white">Carrinho</div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium mb-1">Nenhum item adicionado</p>
            <p className="text-sm mb-6">Adicione produtos ao pedido</p>
            <Button 
              onClick={() => setView('catalog')}
              className="bg-gray-700 hover:bg-gray-600"
              disabled={isLocked}
            >
              <Plus className="w-4 h-4 mr-2" />
              Buscar Produtos
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedItems.map((item, index) => {
              const originalIndex = items.findIndex(i => i.produto_id === item.produto_id && i.quantidade === item.quantidade);
              return (
              <div 
                key={originalIndex} 
                onClick={() => {
                  if (!isLocked) handleEditItem(originalIndex);
                }}
                className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {item.produto_nome || "Produto"}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      {item.quantidade} {item.unidade_medida} × {formatCurrency(item.custo_unitario)}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400 dark:text-gray-500">Total</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(item.total || 0)}
                      </span>
                    </div>
                  </div>
                  {!isLocked && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveItem(originalIndex);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Total</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}