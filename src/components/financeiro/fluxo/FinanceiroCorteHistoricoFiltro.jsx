import React from 'react';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';

/** Toggle partilhado — Fluxo de Caixa e Caixas e Bancos (preferência no localStorage). */
export default function FinanceiroCorteHistoricoFiltro({
  mostrarHistoricoAnterior,
  dataCorte,
  onMostrarHistoricoAnterior,
  onDataCorte,
  contextoLista = 'lista',
}) {
  return (
    <div className="space-y-1.5 border-t border-border/25 pt-2.5 dark:border-white/5">
      <label className="flex cursor-pointer items-center gap-2 py-0.5">
        <Checkbox
          checked={mostrarHistoricoAnterior}
          onCheckedChange={(v) => onMostrarHistoricoAnterior(!!v)}
          className="h-3.5 w-3.5 border-muted-foreground/40"
        />
        <span className="text-[11px] text-muted-foreground/90">
          Mostrar histórico anterior
          {!mostrarHistoricoAnterior && dataCorte && (
            <span className="text-muted-foreground/60">
              {' '}
              ({contextoLista} desde {format(new Date(`${dataCorte}T12:00:00`), 'dd/MM/yyyy')})
            </span>
          )}
        </span>
      </label>
      {!mostrarHistoricoAnterior && (
        <input
          type="date"
          value={dataCorte}
          onChange={(e) => onDataCorte(e.target.value)}
          className="w-full max-w-[11rem] rounded-lg border border-border/30 bg-transparent px-2 py-1 text-[11px] text-muted-foreground outline-none focus:border-border/60 dark:border-white/10"
        />
      )}
    </div>
  );
}
