import React from 'react';
import { Minus, Percent, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatCurrency } from './quickBudgetUtils';

export default function QuickBudgetItemList({ items, onUpdateItem, onRemoveItem }) {
  if (items.length === 0) {
    return (
      <div className="rounded-3xl bg-card shadow-sm px-4 py-8 text-center text-sm text-muted-foreground">
        Adicione produtos para montar o orçamento rápido.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${item.produto_id}-${item.codigo_interno}`} className="rounded-3xl bg-card shadow-sm p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground break-words">{item.produto_nome}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Estoque: {item.estoque_atual}</span>
                <span>Preço tabela: {formatCurrency(item.preco_cheio)}</span>
                {item.preco_livre && (
                  <span className="text-muted-foreground">Piso custo: {formatCurrency(item.preco_minimo)}</span>
                )}
                {item.preco_livre && <span className="text-emerald-600 dark:text-emerald-400">Preço livre</span>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRemoveItem(item.produto_id)}
              className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-3 items-center">
            <div className="flex items-center rounded-2xl bg-muted/50 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => onUpdateItem(item.produto_id, { quantidade: Math.max(1, Number(item.quantidade || 1) - 1) })}
                className="w-12 h-14 md:w-10 md:h-10 flex items-center justify-center text-muted-foreground"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 md:w-10 text-center text-base md:text-sm font-semibold text-foreground">{item.quantidade}</span>
              <button
                type="button"
                onClick={() => onUpdateItem(item.produto_id, { quantidade: Number(item.quantidade || 1) + 1 })}
                className="w-12 h-14 md:w-10 md:h-10 flex items-center justify-center text-muted-foreground"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Preço unitário</p>
                <Input
                  type="text"
                  step="0.01"
                  value={item.preco_editando ?? item.preco_unitario}
                  onChange={(e) => onUpdateItem(item.produto_id, { preco_editando: e.target.value })}
                  onBlur={() => onUpdateItem(item.produto_id, { preco_commit: true })}
                  inputMode="decimal"
                  className="h-14 md:h-10 border-0 bg-muted/50 rounded-2xl shadow-sm text-base md:text-sm"
                />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1"><Percent className="w-3 h-3" /> Desconto</p>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.desconto || 0}
                  onChange={(e) => onUpdateItem(item.produto_id, { desconto: e.target.value })}
                  inputMode="decimal"
                  className="h-14 md:h-10 border-0 bg-muted/50 rounded-2xl shadow-sm text-base md:text-sm"
                />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Total</p>
                <div className="h-14 md:h-10 rounded-2xl bg-muted/50 shadow-sm px-3 flex items-center justify-end text-sm font-semibold text-foreground">
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