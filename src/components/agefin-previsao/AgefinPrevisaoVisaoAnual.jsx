import React from 'react';
import { cn } from '@/lib/utils';
import { formatCompetenciaLabel } from '@/lib/agefinPrevisaoCalculos';
import { formatFinanceiroValor } from '@/components/financeiro/fluxo/FinanceiroListaShared';

export default function AgefinPrevisaoVisaoAnual({ meses = [], onSelecionarMes }) {
  if (!meses.length) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Visão do ano
        </p>
        <p className="text-[11px] text-muted-foreground">Toque no mês para ver a previsão</p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
        {meses.map((m) => (
          <button
            key={m.competencia}
            type="button"
            onClick={() => onSelecionarMes?.(m.competencia)}
            className={cn(
              'rounded-lg border px-2 py-2 text-left transition-colors',
              m.selecionado
                ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                : 'border-border/50 bg-muted/30 hover:bg-muted/60',
            )}
          >
            <p className="text-[10px] font-medium text-muted-foreground uppercase">
              {formatCompetenciaLabel(m.competencia).split('/')[0]}
            </p>
            <p className="text-xs font-semibold tabular-nums text-foreground mt-0.5">
              {formatFinanceiroValor(m.total)}
            </p>
            <p className="text-[10px] text-muted-foreground">{m.count} conta(s)</p>
          </button>
        ))}
      </div>
    </div>
  );
}
