import React from 'react';
import { Package2, ShoppingCart, X } from 'lucide-react';

const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function EmptyState() {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-[28px] bg-gray-100/80 px-6 text-center dark:bg-background/80">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-muted">
        <Package2 className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">Nenhum item adicionado</p>
    </div>
  );
}

function ItemRow({ item, onRemove }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-muted">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted">
        <ShoppingCart className="h-4 w-4 text-muted-foreground dark:text-foreground/90" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{item.produto_nome}</p>
        <p className="text-xs text-muted-foreground">
          {item.quantidade} {item.unidade_medida} · {fmt(item.custo_unitario)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-foreground">{fmt(item.subtotal)}</span>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function ConsumoItensDisplay({ items, total, onRemove, compact = false }) {
  return (
    <div className="rounded-[32px] bg-[#1f2937] p-4 shadow-sm dark:bg-[#1b2432]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xl font-bold text-white">Itens</p>
        <span className="text-lg font-semibold text-slate-300">{fmt(total)}</span>
      </div>

      <div className={`${compact ? 'max-h-[280px]' : 'max-h-[360px]'} overflow-y-auto rounded-[28px] bg-slate-800/60 p-3`}>
        <div className="space-y-3">
          {items.length ? items.map((item, i) => (
            <ItemRow key={`${item.produto_id}-${i}`} item={item} onRemove={() => onRemove(i)} />
          )) : <EmptyState />}
        </div>
      </div>
    </div>
  );
}