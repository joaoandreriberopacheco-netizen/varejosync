import React from 'react';
import { cn } from '@/lib/utils';

/** Seletor compacto — padrão Consulta do Turno / Caixa (Aguardando / Consulta). */
export default function FinanceiroPillTabs({ items, value, onChange, className = '', compact = false }) {
  return (
    <div
      className={cn(
        'flex shrink-0 rounded-2xl p-1 gap-1 p38-search-field',
        className,
      )}
    >
      {items.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              'rounded-xl uppercase tracking-wide transition-colors',
              compact
                ? 'flex-none px-2 py-1.5 text-[9px] sm:px-3.5 sm:py-2 sm:text-[11px] md:px-3'
                : 'min-w-0 flex-1 px-3 py-2 text-xs sm:text-sm',
              active
                ? 'bg-card font-medium text-foreground shadow-sm dark:bg-[#383e47]'
                : 'text-muted-foreground hover:text-foreground/80',
            )}
          >
            {item.shortLabel ? (
              <>
                <span className="block truncate md:hidden">{item.shortLabel}</span>
                <span className="hidden truncate md:block">{item.label}</span>
              </>
            ) : (
              <span className="block truncate">{item.label}</span>
            )}
            {item.count != null && <span className="tabular-nums"> ({item.count})</span>}
          </button>
        );
      })}
    </div>
  );
}
