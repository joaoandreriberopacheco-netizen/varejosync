import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Package, FileText, X, Percent, Minus, Plus } from 'lucide-react';

const fmtCurrency = (value) => `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtNumber = (value) => (Number(value) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

function resolvePrice(product, tableFactor) {
  return (product?.preco_venda_padrao || 0) * (tableFactor || 1);
}

function resolveMinPrice(product) {
  return product?.preco_custo_calculado || 0;
}

function ProductRow({ product, tableFactor, onAdd }) {
  const fullPrice = resolvePrice(product, tableFactor);
  const minPrice = resolveMinPrice(product);

  return (
    <button
      onClick={() => onAdd(product)}
      className="w-full rounded-2xl bg-white/90 dark:bg-[#23212a] px-4 py-3 text-left shadow-sm transition hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
          <Package className="h-4 w-4 text-gray-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{product.nome}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Estoque {fmtNumber(product.estoque_atual)}</span>
            {product.codigo_interno && <span>#{product.codigo_interno}</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-gray-900 dark:text-gray-100">{fmtCurrency(fullPrice)}</span>
            <span className="text-gray-400 line-through">{fmtCurrency(minPrice)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function QuoteRow({ item, onQtyChange, onDiscountChange, onRemove }) {
  const subtotal = item.price * item.quantity;
  const total = Math.max(subtotal - item.discount, 0);

  return (
    <div className="rounded-2xl bg-white/90 dark:bg-[#23212a] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Estoque {fmtNumber(item.stock)}</span>
            <span>Cheio {fmtCurrency(item.price)}</span>
            <span className="line-through">Limite {fmtCurrency(item.minPrice)}</span>
          </div>
        </div>
        <button onClick={() => onRemove(item.id)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/80 p-2.5">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-gray-400">Quantidade</div>
          <div className="flex items-center gap-2">
            <button onClick={() => onQtyChange(item.id, item.quantity - 1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-gray-900 text-gray-500 shadow-sm">
              <Minus className="h-4 w-4" />
            </button>
            <Input
              type="number"
              inputMode="decimal"
              value={item.quantity}
              min="1"
              onChange={(e) => onQtyChange(item.id, e.target.value)}
              className="h-9 border-0 bg-transparent px-0 text-center text-sm font-semibold shadow-none focus-visible:ring-0"
            />
            <button onClick={() => onQtyChange(item.id, item.quantity + 1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-gray-900 text-gray-500 shadow-sm">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/80 p-2.5">
          <div className="mb-2 flex items-center gap-1 text-[11px] uppercase tracking-wide text-gray-400">
            <Percent className="h-3 w-3" /> Desconto
          </div>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              value={item.discount}
              onChange={(e) => onDiscountChange(item.id, e.target.value)}
              className="h-9 border-0 bg-white dark:bg-gray-900 pr-10 text-right text-sm font-semibold shadow-sm focus-visible:ring-0"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">Total</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">{fmtCurrency(total)}</span>
      </div>
    </div>
  );
}

function BudgetContent({ onClose, isMobile }) {
  const [products, setProducts] = useState([]);
  const [priceTable, setPriceTable] = useState(null);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    const load = async () => {
      const [productsData, me, tables] = await Promise.all([
        base44.entities.Produto.filter({ ativo: true }),
        base44.auth.me(),
        base44.entities.TabelaPreco.filter({ ativo: true })
      ]);

      let selectedTable = tables.find((table) => table.id === me?.tabela_preco_id) || tables.find((table) => table.is_default) || tables[0] || null;
      setPriceTable(selectedTable);
      setProducts(productsData);
    };

    load();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products.slice(0, 25);
    return products.filter((product) =>
      product.nome?.toLowerCase().includes(term) ||
      product.codigo_interno?.toLowerCase().includes(term) ||
      product.codigo_barras?.toLowerCase().includes(term)
    ).slice(0, 25);
  }, [products, search]);

  const quoteTotal = useMemo(() => items.reduce((sum, item) => sum + Math.max((item.price * item.quantity) - item.discount, 0), 0), [items]);

  const handleAdd = (product) => {
    const existing = items.find((item) => item.id === product.id);
    if (existing) {
      setItems((current) => current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      return;
    }

    setItems((current) => [...current, {
      id: product.id,
      name: product.nome,
      stock: product.estoque_atual || 0,
      quantity: 1,
      price: resolvePrice(product, priceTable?.fator_ajuste || 1),
      minPrice: resolveMinPrice(product),
      discount: 0,
    }]);
  };

  const handleQtyChange = (id, value) => {
    const quantity = Math.max(Number(value) || 1, 1);
    setItems((current) => current.map((item) => item.id === id ? { ...item, quantity } : item));
  };

  const handleDiscountChange = (id, value) => {
    const discount = Math.max(Number(value) || 0, 0);
    setItems((current) => current.map((item) => item.id === id ? { ...item, discount } : item));
  };

  const handleRemove = (id) => setItems((current) => current.filter((item) => item.id !== id));

  const handleGeneratePdf = () => {
    if (items.length === 0) return;

    const win = window.open('', '_blank');
    if (!win) return;

    const rows = items.map((item) => {
      const total = Math.max((item.price * item.quantity) - item.discount, 0);
      return `
        <tr>
          <td>${item.name}</td>
          <td>${fmtNumber(item.quantity)}</td>
          <td>${fmtCurrency(item.price)}</td>
          <td>${fmtCurrency(item.discount)}</td>
          <td>${fmtCurrency(total)}</td>
        </tr>
      `;
    }).join('');

    win.document.write(`
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Orçamento rápido</title>
          <style>
            body { font-family: Inter, Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 8px; font-size: 22px; }
            p { margin: 0 0 16px; color: #6b7280; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 13px; }
            th { color: #6b7280; font-weight: 600; }
            .total { margin-top: 18px; text-align: right; font-size: 18px; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Orçamento rápido</h1>
          <p>${customerName ? `Cliente: ${customerName}<br/>` : ''}Gerado em ${new Date().toLocaleString('pt-BR')}</p>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Qtd</th>
                <th>Preço</th>
                <th>Desc.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="total">Total geral: ${fmtCurrency(quoteTotal)}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="flex h-full flex-col bg-transparent">
      <div className="flex items-center justify-between px-4 py-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Amigo rápido</p>
          <h2 className="font-glacial text-lg font-semibold text-gray-900 dark:text-white">Orçamento rápido</h2>
        </div>
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden px-4 pb-4 md:grid-cols-[1.05fr_0.95fr]">
        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <div className="rounded-3xl bg-white/90 p-3 shadow-sm dark:bg-[#23212a]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                autoFocus={!isMobile}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar nome, código ou barras"
                className="h-11 rounded-2xl border-0 bg-gray-50 pl-10 shadow-none focus-visible:ring-0 dark:bg-gray-800"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {filteredProducts.map((product) => (
              <ProductRow key={product.id} product={product} tableFactor={priceTable?.fator_ajuste || 1} onAdd={handleAdd} />
            ))}
            {filteredProducts.length === 0 && (
              <div className="rounded-3xl bg-white/90 px-4 py-10 text-center text-sm text-gray-400 shadow-sm dark:bg-[#23212a]">
                Nenhum produto encontrado.
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <div className="rounded-3xl bg-white/90 p-4 shadow-sm dark:bg-[#23212a]">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <div className="mb-1 text-[11px] uppercase tracking-[0.2em] text-gray-400">Cliente</div>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nome para compartilhar"
                  className="h-11 rounded-2xl border-0 bg-gray-50 shadow-none focus-visible:ring-0 dark:bg-gray-800"
                />
              </div>
              <Button onClick={handleGeneratePdf} disabled={items.length === 0} className="h-11 rounded-2xl bg-gray-900 px-4 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
                <FileText className="mr-2 h-4 w-4" /> PDF / WhatsApp
              </Button>
            </div>
          </div>

          <div className="rounded-3xl bg-white/90 p-4 shadow-sm dark:bg-[#23212a]">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-gray-400">Total geral</div>
                <div className="font-glacial text-2xl font-semibold text-gray-900 dark:text-white">{fmtCurrency(quoteTotal)}</div>
              </div>
              <div className="text-right text-xs text-gray-400">{items.length} item(ns)</div>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {items.length === 0 ? (
              <div className="rounded-3xl bg-white/90 px-4 py-10 text-center text-sm text-gray-400 shadow-sm dark:bg-[#23212a]">
                Monte um orçamento sem sair da tela atual.
              </div>
            ) : items.map((item) => (
              <QuoteRow
                key={item.id}
                item={item}
                onQtyChange={handleQtyChange}
                onDiscountChange={handleDiscountChange}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QuickBudgetSheet({ open, onOpenChange, isMobile }) {
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-[92vw] max-w-none border-0 bg-gray-50 p-0 dark:bg-[#182132] sm:max-w-none">
          <BudgetContent onClose={() => onOpenChange(false)} isMobile />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl border-0 bg-gray-50 p-0 shadow-2xl dark:bg-[#182132]">
        <BudgetContent onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}