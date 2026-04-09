import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { FileText, MessageCircle, X } from 'lucide-react';
import QuickBudgetProductSearch from './QuickBudgetProductSearch';
import QuickBudgetItemList from './QuickBudgetItemList';
import { buildQuickBudgetItem, formatCurrency, getBudgetSummary, recalculateItem } from './quickBudgetUtils';

export default function QuickBudgetPanel({ open, onOpenChange }) {
  const [produtos, setProdutos] = useState([]);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!open || produtos.length > 0) return;
    base44.entities.Produto.filter({ ativo: true }).then((data) => setProdutos(data || []));
  }, [open, produtos.length]);

  const summary = useMemo(() => getBudgetSummary(items), [items]);

  const handleAddProduct = (produto) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.produto_id === produto.id);
      if (existing) {
        return prev.map((item) => item.produto_id === produto.id ? recalculateItem({ ...item, quantidade: Number(item.quantidade || 1) + 1 }) : item);
      }
      return [recalculateItem(buildQuickBudgetItem(produto)), ...prev];
    });
    setQuery('');
  };

  const handleUpdateItem = (produtoId, updates) => {
    setItems((prev) => prev.map((item) => item.produto_id === produtoId ? recalculateItem({ ...item, ...updates }) : item));
  };

  const handleRemoveItem = (produtoId) => {
    setItems((prev) => prev.filter((item) => item.produto_id !== produtoId));
  };

  const content = (
    <div className="flex flex-col h-full min-h-0 bg-gray-50 dark:bg-gray-950">
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white font-glacial">Orçamento rápido</DialogTitle>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Consulta leve sem perder a tela de baixo</p>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="w-9 h-9 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        <QuickBudgetProductSearch
          query={query}
          onQueryChange={setQuery}
          produtos={produtos}
          onAddProduct={handleAddProduct}
        />

        <QuickBudgetItemList
          items={items}
          onUpdateItem={handleUpdateItem}
          onRemoveItem={handleRemoveItem}
        />
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Resumo</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{summary.quantidadeItens} un · {items.length} itens</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">{formatCurrency(summary.total)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-11 rounded-2xl border-0 bg-gray-100 dark:bg-gray-800 shadow-none text-gray-700 dark:text-gray-200">
            <FileText className="w-4 h-4 mr-2" /> PDF
          </Button>
          <Button className="h-11 rounded-2xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 shadow-none">
            <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[88vh] rounded-t-[28px] border-0 bg-transparent p-0 overflow-hidden">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[82vh] p-0 border-0 rounded-[32px] overflow-hidden shadow-2xl bg-transparent">
        <DialogHeader className="hidden" />
        {content}
      </DialogContent>
    </Dialog>
  );
}