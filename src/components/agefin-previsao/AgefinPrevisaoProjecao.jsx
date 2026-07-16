import React, { useMemo } from 'react';
import { formatFinanceiroValor } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import { P38_KPI_SHELL } from '@/components/financeiro/fluxo/financeiroP38';
import { cn } from '@/lib/utils';
import { calcularProjecaoAgefin, formatCompetenciaLabel } from '@/lib/agefinPrevisaoCalculos';

export default function AgefinPrevisaoProjecao({ modelos, competenciaInicio }) {
  const { meses, totalAno } = useMemo(
    () => calcularProjecaoAgefin(modelos, competenciaInicio),
    [modelos, competenciaInicio],
  );

  return (
    <div className="space-y-4">
      <div className={cn(P38_KPI_SHELL, 'p-4')}>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Total 12 meses</p>
        <p className="text-2xl font-semibold tabular-nums">{formatFinanceiroValor(totalAno)}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Soma das contas fixas ativas a partir de {formatCompetenciaLabel(competenciaInicio)}.
        </p>
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Mês</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Contas</th>
              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => (
              <tr key={m.competencia} className="border-b border-border/30 last:border-0">
                <td className="px-3 py-2.5">{formatCompetenciaLabel(m.competencia)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{m.count}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                  {formatFinanceiroValor(m.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
