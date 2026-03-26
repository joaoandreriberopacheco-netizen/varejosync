import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Minus, Package, ChevronLeft } from 'lucide-react';

const formatCurrency = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function ConsumoProdutoSelectorPDV({ open, onOpenChange, produtos, onAddItem }) {
  const [search, setSearch] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [quantidade, setQuantidade] = useState('1');
  const searchRef = useRef(null);
  const quantidadeRef = useRef(null);

  const produtosFiltrados = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return [];
    return produtos
      .filter((item) =>
        item.nome?.toLowerCase().includes(term) ||
        item.codigo_interno?.toLowerCase().includes(term) ||
        item.codigo_barras?.includes(term)
      )
      .slice(0, 40);
  }, [produtos, search]);

  const resetState = () => {
    setSearch('');
    setProdutoSelecionado(null);
    setQuantidade('1');
  };

  useEffect(() => {
    if (!open) return;
    if (!produtoSelecionado) {
      setTimeout(() => searchRef.current?.focus(), 150);
    } else {
      setTimeout(() => {
        quantidadeRef.current?.focus();
        quantidadeRef.current?.select();
      }, 150);
    }
  }, [open, produtoSelecionado]);

  const handleClose = (value) => {
    if (!value) resetState();
    onOpenChange(value);
  };

  const handleSelect = (produto) => {
    setProdutoSelecionado(produto);
    setQuantidade('1');
  };

  const handleAdd = () => {
    const quantidadeNumerica = Number(String(quantidade).replace(',', '.')) || 0;
    if (!produtoSelecionado || quantidadeNumerica <= 0) return;
    const custoUnitario = produtoSelecionado.preco_custo_calculado || 0;
    onAddItem({
      produto_id: produtoSelecionado.id,
      produto_nome: produtoSelecionado.nome,
      quantidade: quantidadeNumerica,
      unidade_medida: produtoSelecionado.unidade_principal || 'UN',
      custo_unitario: custoUnitario,
      subtotal: quantidadeNumerica * custoUnitario,
    });
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl rounded-[28px] border-0 bg-white p-0 shadow-2xl dark:bg-gray-900">
        {!produtoSelecionado ? (
          <div className="flex max-h-[80vh] flex-col">
            <div className="border-b border-gray-100 p-4 dark:border-gray-800">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Escolher material</p>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  ref={searchRef}
                  autoFocus
                  type="text"
                  inputMode="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && produtosFiltrados[0]) {
                      e.preventDefault();
                      handleSelect(produtosFiltrados[0]);
                    }
                  }}
                  placeholder="Buscar produto..."
                  className="h-12 rounded-2xl border-0 bg-gray-100 pl-10 shadow-sm dark:bg-gray-800"
                />
              </div>
            </div>
            <div className="overflow-y-auto p-4">
              <div className="space-y-2">
                {produtosFiltrados.map((produto) => (
                  <button
                    key={produto.id}
                    onClick={() => handleSelect(produto)}
                    className="flex w-full items-center justify-between rounded-[24px] bg-gray-50 px-4 py-4 text-left shadow-sm transition hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{produto.nome}</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{produto.codigo_interno || 'Sem código'} · custo calc. {formatCurrency(produto.preco_custo_calculado || 0)}</p>
                    </div>
                    <Package className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  </button>
                ))}
                {!search.trim() && <p className="py-10 text-center text-sm text-gray-400">Digite para buscar no estilo PDV</p>}
                {search.trim() && !produtosFiltrados.length && <p className="py-10 text-center text-sm text-gray-400">Nenhum item encontrado</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex max-h-[80vh] flex-col">
            <div className="border-b border-gray-100 p-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <button onClick={() => setProdutoSelecionado(null)} className="rounded-2xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <ChevronLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-gray-900 dark:text-white">{produtoSelecionado.nome}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Custo calculado: {formatCurrency(produtoSelecionado.preco_custo_calculado || 0)}</p>
                </div>
              </div>
            </div>
            <div className="space-y-5 p-5">
              <div className="rounded-[28px] bg-gray-50 p-5 text-center shadow-sm dark:bg-gray-800">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Quantidade</p>
                <div className="mt-4 flex items-center justify-center gap-4">
                  <Button type="button" variant="outline" size="icon" className="h-12 w-12 rounded-full border-0 shadow-sm" onClick={() => setQuantidade(String(Math.max(1, (Number(String(quantidade).replace(',', '.')) || 1) - 1)))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    ref={quantidadeRef}
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="1"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAdd();
                      }
                    }}
                    className="h-16 w-24 rounded-2xl border-0 bg-white text-center text-3xl font-bold text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                  />
                  <Button type="button" size="icon" className="h-12 w-12 rounded-full bg-gray-900 text-white shadow-sm hover:bg-gray-800 dark:bg-white dark:text-gray-900" onClick={() => setQuantidade(String((Number(String(quantidade).replace(',', '.')) || 0) + 1))}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="rounded-[28px] bg-gray-50 p-5 shadow-sm dark:bg-gray-800">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                  <span>Custo unitário</span>
                  <span className="font-semibold">{formatCurrency(produtoSelecionado.preco_custo_calculado || 0)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-lg font-semibold text-gray-900 dark:text-white">
                  <span>Total</span>
                  <span>{formatCurrency((produtoSelecionado.preco_custo_calculado || 0) * ((Number(String(quantidade).replace(',', '.')) || 0)))}</span>
                </div>
              </div>
              <Button type="button" onClick={handleAdd} className="h-12 w-full rounded-2xl bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900">
                Adicionar item
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}