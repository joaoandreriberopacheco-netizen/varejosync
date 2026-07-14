import React from 'react';
import { Link2 } from 'lucide-react';
import { FLUVIAL_PERIOD_OPTIONS } from '@/components/logistica-sandbox/fluvialDataUtils';

const EMBARQUE_LINK_OPTIONS = [
  { id: 'todos', label: 'Todas' },
  { id: 'com_vinculo', label: 'Com vínculo' },
  { id: 'sem_vinculo', label: 'Sem vínculo' },
];

function FilterPill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground dark:bg-muted dark:text-foreground shadow-sm'
          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}

export default function FluvialFilterBar({
  periodoFiltro,
  onPeriodoFiltroChange,
  embarqueLinkFilter,
  onEmbarqueLinkFilterChange,
  totalViagens = 0,
  totalCarregadas = 0,
}) {
  return (
    <div className="rounded-3xl bg-card border border-border/40 shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filtros da timeline</p>
        <p className="text-xs text-muted-foreground">
          {totalViagens} de {totalCarregadas} viagem{totalCarregadas !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Período (a partir de hoje)</p>
        <div className="flex flex-wrap gap-2">
          {FLUVIAL_PERIOD_OPTIONS.map((option) => (
            <FilterPill
              key={option.id}
              active={periodoFiltro === option.id}
              onClick={() => onPeriodoFiltroChange?.(option.id)}
            >
              {option.label}
            </FilterPill>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" />
          Vínculo de embarque
        </p>
        <div className="flex flex-wrap gap-2">
          {EMBARQUE_LINK_OPTIONS.map((option) => (
            <FilterPill
              key={option.id}
              active={embarqueLinkFilter === option.id}
              onClick={() => onEmbarqueLinkFilterChange?.(option.id)}
            >
              {option.label}
            </FilterPill>
          ))}
        </div>
      </div>
    </div>
  );
}
