import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { X } from 'lucide-react';
import QuickBudgetProductSearch from './QuickBudgetProductSearch';
import QuickBudgetFlowItemEditor from './QuickBudgetFlowItemEditor';
import QuickBudgetCartView from './QuickBudgetCartView';
import { buildQuickBudgetItem, getBudgetSummary, getFullPrice, recalculateItem } from './quickBudgetUtils';

export default function QuickBudgetPanel({ open, onOpenChange }) {
  const [produtos, setProdutos] = useState([]);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [flowStage, setFlowStage] = useState('quantity');
  const [quantityDraft, setQuantityDraft] = useState('1');
  const [priceDraft, setPriceDraft] = useState('0');
  const [isSharing, setIsSharing] = useState(false);
  const searchInputRef = useRef(null);
  const quantityInputRef = useRef(null);
  const priceInputRef = useRef(null);

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

  useEffect(() => {
    if (!open) {
      resetPanel();
      return;
    }
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [open]);

  const handleSelectProduct = (produto) => {
    setSelectedProduct(produto);
    setFlowStage('quantity');
    setQuantityDraft('1');
    setPriceDraft(String(getFullPrice(produto)));
    setTimeout(() => quantityInputRef.current?.focus(), 50);
  };

  const resetFlow = () => {
    setSelectedProduct(null);
    setFlowStage('quantity');
    setQuantityDraft('1');
    setPriceDraft('0');
    setQuery('');
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const resetPanel = () => {
    resetFlow();
    setItems([]);
    setIsSharing(false);
  };

  const handleSaveItem = () => {
    if (!selectedProduct) return;
    const draft = buildQuickBudgetItem(selectedProduct);
    const nextItem = recalculateItem({
      ...draft,
      quantidade: quantityDraft,
      preco_unitario: selectedProduct.preco_livre ? priceDraft : draft.preco_unitario,
    });

    setItems((prev) => {
      const existing = prev.find((item) => item.produto_id === selectedProduct.id);
      if (existing) {
        return prev.map((item) => item.produto_id === selectedProduct.id
          ? recalculateItem({
              ...item,
              quantidade: Number(item.quantidade || 0) + Number(nextItem.quantidade || 0),
              preco_unitario: nextItem.preco_unitario,
            })
          : item);
      }
      return [nextItem, ...prev];
    });

    resetFlow();
  };

  const handleNextStep = () => {
    if (!selectedProduct) return;
    if (selectedProduct.preco_livre) {
      setFlowStage('price');
      setTimeout(() => priceInputRef.current?.focus(), 50);
      return;
    }
    handleSaveItem();
  };

  const handleShare = async () => {
    if (items.length === 0 || isSharing) return;

    setIsSharing(true);
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Orçamento rápido</title>
  <style>
    body { margin: 0; font-family: Inter, Arial, sans-serif; background: #f8fafc; color: #111827; }
    .wrap { max-width: 720px; margin: 0 auto; padding: 24px 16px 48px; }
    .card { background: #fff; border-radius: 24px; box-shadow: 0 6px 24px rgba(15, 23, 42, 0.08); padding: 20px; }
    .top { display: flex; justify-content: space-between; gap: 12px; align-items: start; }
    h1 { margin: 0; font-size: 28px; font-family: Quicksand, Inter, sans-serif; }
    .muted { color: #6b7280; font-size: 14px; }
    .total { text-align: right; }
    .total strong { display: block; font-size: 28px; }
    .list { margin-top: 18px; display: grid; gap: 10px; }
    .item { background: #f8fafc; border-radius: 18px; padding: 14px; display: flex; justify-content: space-between; gap: 12px; }
    .item-name { font-weight: 600; }
    .item-meta { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .item-total { font-weight: 700; white-space: nowrap; }
    .summary { margin-top: 18px; background: #f8fafc; border-radius: 18px; padding: 14px; display: grid; gap: 8px; }
    .summary-row { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
    .summary-row.total-row { font-size: 18px; font-weight: 700; color: #111827; }
    .actions { margin-top: 18px; display: flex; gap: 10px; flex-wrap: wrap; }
    .button { appearance: none; border: 0; border-radius: 16px; padding: 14px 18px; background: #111827; color: white; font-weight: 600; cursor: pointer; text-decoration: none; }
    @media print { body { background: white; } .wrap { padding: 0; } .card { box-shadow: none; border-radius: 0; } .actions { display: none; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="top">
        <div>
          <h1>Orçamento rápido</h1>
          <div class="muted">${Number(summary.quantidadeItens || 0)} unidades · ${items.length} itens</div>
        </div>
        <div class="total">
          <div class="muted">Total</div>
          <strong>${summary.total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </div>
      </div>
      <div class="list">
        ${items.map((item) => `
          <div class="item">
            <div>
              <div class="item-name">${item.produto_nome}</div>
              <div class="item-meta">${item.quantidade} x ${Number(item.preco_unitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
            <div class="item-total">${Number(item.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
          </div>
        `).join('')}
      </div>
      <div class="summary">
        <div class="summary-row"><span>Subtotal</span><strong>${Number(summary.subtotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
        ${Number(summary.desconto || 0) > 0 ? `<div class="summary-row"><span>Desconto</span><strong>${Number(summary.desconto || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>` : ''}
        <div class="summary-row total-row"><span>Total</span><strong>${Number(summary.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div>
      </div>
      <div class="actions">
        <button class="button" onclick="window.print()">Baixar PDF</button>
      </div>
    </div>
  </div>
</body>
</html>`;

    const shareWindow = window.open('', '_blank');
    if (shareWindow) {
      shareWindow.document.open();
      shareWindow.document.write(html);
      shareWindow.document.close();
    }
    setIsSharing(false);
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
          onClick={() => {
            resetPanel();
            onOpenChange(false);
          }}
          className="w-9 h-9 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-4">
        <QuickBudgetProductSearch
          inputRef={searchInputRef}
          query={query}
          onQueryChange={setQuery}
          produtos={produtos}
          onAddProduct={handleSelectProduct}
          onSubmitFirstResult={handleSelectProduct}
        />

        {selectedProduct && (
          <QuickBudgetFlowItemEditor
            selectedProduct={selectedProduct}
            stage={flowStage}
            quantity={quantityDraft}
            price={priceDraft}
            onQuantityChange={setQuantityDraft}
            onPriceChange={setPriceDraft}
            onNext={handleNextStep}
            onSave={handleSaveItem}
            quantityInputRef={quantityInputRef}
            priceInputRef={priceInputRef}
          />
        )}

        <QuickBudgetCartView
          items={items}
          summary={summary}
          onClose={() => {
            resetPanel();
            onOpenChange(false);
          }}
          onShare={handleShare}
          isSharing={isSharing}
        />
      </div>

    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[88vh] max-h-[88vh] rounded-t-[28px] border-0 bg-transparent p-0 overflow-hidden">
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