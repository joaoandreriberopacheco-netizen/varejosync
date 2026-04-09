import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatCurrency } from './quickBudgetUtils';

export default function QuickBudgetItemList({ items, onUpdateItem, onRemoveItem }) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-sm px-4 py-8 text-center text-sm text-gray-400">
        Adicione produtos para montar o orçamento rápido.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${item.produto_id}-${item.codigo_interno}`} className="rounded-3xl bg-white dark:bg-gray-900 shadow-sm p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white break-words">{item.produto_nome}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Estoque: {item.estoque_atual}</span>
                <span>Cheio: {formatCurrency(item.preco_cheio)}</span>
                <span className="line-through opacity-70">Min: {formatCurrency(item.preco_minimo)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRemoveItem(item.produto_id)}
              className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-3 items-center">
            <div className="flex items-center rounded-2xl bg-gray-50 dark:bg-gray-800 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => onUpdateItem(item.produto_id, { quantidade: Math.max(1, Number(item.quantidade || 1) - 1) })}
                className="w-12 h-14 md:w-10 md:h-10 flex items-center justify-center text-gray-500"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 md:w-10 text-center text-base md:text-sm font-semibold text-gray-900 dark:text-white">{item.quantidade}</span>
              <button
                type="button"
                onClick={() => onUpdateItem(item.produto_id, { quantidade: Number(item.quantidade || 1) + 1 })}
                className="w-12 h-14 md:w-10 md:h-10 flex items-center justify-center text-gray-500"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-gray-400 mb-1">Preço unitário</p>
                <Input
                  type="number"
                  step="0.01"
                  min={item.preco_minimo}
                  value={item.preco_unitario}
                  onChange={(e) => onUpdateItem(item.produto_id, { preco_unitario: e.target.value })}
                  inputMode="decimal"
                  className="h-14 md:h-10 border-0 bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-sm text-base md:text-sm"
                />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-1">Total</p>
                <div className="h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 shadow-sm px-3 flex items-center justify-end text-sm font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(item.total)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}