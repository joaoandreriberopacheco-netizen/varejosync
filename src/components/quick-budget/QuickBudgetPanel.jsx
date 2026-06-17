import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Check, Loader2, MessageCircle, Search, ShoppingCart, X } from 'lucide-react';
import QuickBudgetProductSearch from './QuickBudgetProductSearch';
import QuickBudgetFlowItemEditor from './QuickBudgetFlowItemEditor';
import QuickBudgetCartView from './QuickBudgetCartView';
import {
  buildQuickBudgetItem,
  getBudgetSummary,
  getFullPrice,
  getQuickBudgetUnitContext,
  recalculateItem,
} from './quickBudgetUtils';
import { shareOrDownloadHtmlDocument, shouldUseMobileDocumentExport } from '@/lib/mobilePrintAndShare';
import { toast } from 'sonner';
import { QUICK_ACCESS_PANEL_CLASS, QUICK_ACCESS_PANEL_SHELL_CLASS } from '@/lib/quickAccessOverlay';

export default function QuickBudgetPanel({ open, onOpenChange, sessionKey = 0 }) {
  const [produtos, setProdutos] = useState([]);
  const [tabelaSelecionada, setTabelaSelecionada] = useState(null);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [flowStage, setFlowStage] = useState('quantity');
  const [quantityDraft, setQuantityDraft] = useState('1');
  const [priceDraft, setPriceDraft] = useState('0');
  const [unitOptions, setUnitOptions] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showCartMobile, setShowCartMobile] = useState(false);
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
    (async () => {
      const [prods, tabelas, me] = await Promise.all([
        base44.entities.Produto.filter({ ativo: true }),
        base44.entities.TabelaPreco.filter({ ativo: true }).catch(() => []),
        base44.auth.me().catch(() => null),
      ]);
      setProdutos(prods || []);
      const list = tabelas || [];
      const t =
        list.find((x) => x.id === me?.tabela_preco_id) ||
        list.find((x) => x.is_default) ||
        list[0] ||
        null;
      setTabelaSelecionada(t);
    })();
  }, [open, produtos.length]);

  const summary = useMemo(() => getBudgetSummary(items), [items]);

  useEffect(() => {
    if (!open) {
      resetPanel();
      return;
    }
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open || sessionKey === 0) return;
    resetPanel();
    setProdutos([]);
  }, [sessionKey, open]);

  const handleSelectProduct = (produto) => {
    const ctx = getQuickBudgetUnitContext(produto, tabelaSelecionada);
    setSelectedProduct(produto);
    setUnitOptions(ctx.unitOptions || []);
    setSelectedUnit(ctx.unidadeDefault);
    setFlowStage('quantity');
    setQuantityDraft('1');
    setPriceDraft(String(getFullPrice(produto, tabelaSelecionada, ctx.unidadeDefault)));
    setTimeout(() => quantityInputRef.current?.focus(), 50);
  };

  const handleUnitChange = (unit) => {
    if (!selectedProduct || !unit) return;
    setSelectedUnit(unit);
    setPriceDraft(String(getFullPrice(selectedProduct, tabelaSelecionada, unit)));
  };

  const resetFlow = () => {
    setSelectedProduct(null);
    setUnitOptions([]);
    setSelectedUnit(null);
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
    setShowCartMobile(false);
  };

  const handleSaveItem = () => {
    if (!selectedProduct) return;
    const draft = buildQuickBudgetItem(selectedProduct, tabelaSelecionada, selectedUnit);
    const piso = getFullPrice(selectedProduct, tabelaSelecionada, selectedUnit);
    let precoUnitario = draft.preco_unitario;
    if (selectedProduct.preco_livre) {
      precoUnitario = String(Math.max(Number(priceDraft) || 0, piso));
    }
    const nextItem = recalculateItem({
      ...draft,
      quantidade: quantityDraft,
      preco_unitario: selectedProduct.preco_livre ? precoUnitario : draft.preco_unitario,
    });
    const lineKey = nextItem.item_key;

    setItems((prev) => {
      const existing = prev.find((item) => item.item_key === lineKey);
      if (existing) {
        return prev.map((item) => (item.item_key === lineKey
          ? recalculateItem({
              ...item,
              preco_venda_lista: nextItem.preco_venda_lista,
              tem_ajuste_tabela: nextItem.tem_ajuste_tabela,
              preco_cheio: nextItem.preco_cheio,
              preco_minimo: nextItem.preco_minimo,
              quantidade: Number(item.quantidade || 0) + Number(nextItem.quantidade || 0),
              preco_unitario: nextItem.preco_unitario,
              unidade: nextItem.unidade,
              unidade_medida: nextItem.unidade_medida,
              unidade_sigla: nextItem.unidade_sigla,
              fator_conversao: nextItem.fator_conversao,
            })
          : item));
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
    body { margin: 0; font-family: 'DIN 1451', DINish, system-ui, sans-serif; background: #f8fafc; color: #111827; }
    .wrap { max-width: 720px; margin: 0 auto; padding: 24px 16px 48px; }
    .card { background: #fff; border-radius: 24px; box-shadow: 0 6px 24px rgba(15, 23, 42, 0.08); padding: 20px; }
    .top { display: flex; justify-content: space-between; gap: 12px; align-items: start; }
    h1 { margin: 0; font-size: 28px; font-family: 'DIN 1451', DINish, system-ui, sans-serif; }
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
          <div class="muted">${Number(summary.quantidadeItens || 0)} qtd · ${items.length} itens</div>
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
              <div class="item-meta">${item.quantidade} ${item.unidade || 'UN'} × ${Number(item.preco_unitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
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

    try {
      if (shouldUseMobileDocumentExport()) {
        const r = await shareOrDownloadHtmlDocument(html, `orcamento-rapido-${Date.now()}.html`, 'Orçamento rápido');
        if (r === 'downloaded') toast.success('Arquivo baixado — abra e use Compartilhar se quiser');
      } else {
        const shareWindow = window.open('', '_blank');
        if (shareWindow) {
          shareWindow.document.open();
          shareWindow.document.write(html);
          shareWindow.document.close();
        }
      }
    } catch (e) {
      if (e?.name !== 'AbortError') toast.error('Não foi possível exportar o orçamento');
    } finally {
      setIsSharing(false);
    }
  };

  const content = (
    <div className={`relative flex min-h-0 flex-1 flex-col ${QUICK_ACCESS_PANEL_SHELL_CLASS}`}>
      <div className="flex items-center justify-between px-4 py-4 border-b border-border/40 bg-card">
        <div>
          <DialogTitle className="text-lg font-semibold text-foreground font-glacial">Orçamento rápido</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">Consulta leve sem perder a tela de baixo</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetPanel();
            onOpenChange(false);
          }}
          className="w-9 h-9 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 pb-28 md:pb-4">
        <QuickBudgetProductSearch
          inputRef={searchInputRef}
          query={query}
          onQueryChange={setQuery}
          produtos={produtos}
          tabelaPreco={tabelaSelecionada}
          onAddProduct={handleSelectProduct}
          onSubmitFirstResult={handleSelectProduct}
        />

        {selectedProduct ? (
          <QuickBudgetFlowItemEditor
            selectedProduct={selectedProduct}
            tabelaPreco={tabelaSelecionada}
            stage={flowStage}
            quantity={quantityDraft}
            price={priceDraft}
            unitOptions={unitOptions}
            selectedUnit={selectedUnit}
            onUnitChange={handleUnitChange}
            onQuantityChange={setQuantityDraft}
            onPriceChange={setPriceDraft}
            onNext={handleNextStep}
            onSave={handleSaveItem}
            quantityInputRef={quantityInputRef}
            priceInputRef={priceInputRef}
          />
        ) : (
          <div className="rounded-3xl bg-card shadow-sm px-4 py-4 flex items-center gap-3 text-xs text-muted-foreground">
            <Search className="w-4 h-4" />
            Os itens ficam guardados no carrinho para você continuar buscando sem fechar o teclado.
          </div>
        )}
      </div>

      {isMobile && items.length > 0 && (
        <div className={`absolute inset-0 z-[100] ${QUICK_ACCESS_PANEL_SHELL_CLASS} flex flex-col`} style={{ display: showCartMobile ? 'flex' : 'none' }}>
          <div className="flex items-center justify-between px-4 py-4 border-b border-border/40 bg-card">
            <button type="button" onClick={() => setShowCartMobile(false)} className="w-9 h-9 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground font-glacial">Carrinho</p>
              <p className="text-[11px] text-muted-foreground">{summary.quantidadeItens} qtd · {items.length} itens</p>
            </div>
            <div className="w-9" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-28">
            <QuickBudgetCartView
              items={items}
              summary={summary}
              onClose={() => {
                resetPanel();
                onOpenChange(false);
              }}
              onShare={handleShare}
              isSharing={isSharing}
              compact
            />
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="relative z-40 border-t border-border/40 bg-card/95 dark:bg-background/95 backdrop-blur-md px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-4 shadow-[0_-10px_26px_rgba(15,23,42,0.08)] dark:shadow-[0_-10px_26px_rgba(0,0,0,0.32)]">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-muted-foreground leading-none mb-0.5">Total</div>
              <div className="text-xl font-bold text-foreground leading-tight font-glacial">{summary.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
            {isMobile && (
              <button
                type="button"
                onClick={() => setShowCartMobile(true)}
                aria-label="Abrir carrinho"
                className="relative w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted dark:hover:bg-muted/80 flex-shrink-0"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 bg-muted text-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">
                  {items.length}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                resetPanel();
                onOpenChange(false);
              }}
              className="h-10 px-4 bg-muted text-foreground/90 rounded-xl font-medium flex items-center justify-center gap-2 text-sm"
            >
              <Check className="w-4 h-4" /> Concluir
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={isSharing}
              className="h-10 px-4 bg-muted hover:bg-muted text-foreground rounded-xl font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />} Compartilhar
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          overlayClassName={QUICK_ACCESS_PANEL_CLASS}
          className={`${QUICK_ACCESS_PANEL_CLASS} ${QUICK_ACCESS_PANEL_SHELL_CLASS} mt-0 flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col rounded-none border-0 p-0 [&>div:first-child]:hidden`}
        >
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={QUICK_ACCESS_PANEL_CLASS}
        className={`${QUICK_ACCESS_PANEL_CLASS} ${QUICK_ACCESS_PANEL_SHELL_CLASS} flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-2xl [&>button.absolute]:hidden`}
      >
        <DialogHeader className="hidden" />
        {content}
      </DialogContent>
    </Dialog>
  );
}