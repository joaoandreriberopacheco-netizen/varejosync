import React from 'react';

/** Seletor compacto — mesmo padrão da aba Vendas do Caixa (Aguardando / Consulta). */
export default function FinanceiroPillTabs({ items, value, onChange, className = '' }) {
  return (
    <div className={`flex rounded-2xl bg-muted/50 dark:bg-[#26262e]/80 p-1 gap-1 ${className}`}>
      {items.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`flex-1 min-w-0 px-3 py-2 rounded-xl text-xs sm:text-sm uppercase tracking-wide transition-colors
              ${active
                ? 'bg-card dark:bg-[#383e47] shadow-sm text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground/80'}`}
          >
            <span className="truncate block">{item.label}</span>
            {item.count != null && (
              <span className="tabular-nums"> ({item.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
