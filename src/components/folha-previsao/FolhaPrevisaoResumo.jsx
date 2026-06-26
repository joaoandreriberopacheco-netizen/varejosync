import React from 'react';
import { formatCurrency } from '@/lib/folhaPrevisaoCalculos';

function KpiCell({ label, value, tone = 'default' }) {
  const tones = {
    default: 'text-foreground',
    positive: 'text-emerald-700 dark:text-emerald-400',
    negative: 'text-red-700 dark:text-red-400',
    muted: 'text-muted-foreground',
    amber: 'text-amber-700 dark:text-amber-400',
  };
  return (
    <div className="rounded-xl bg-card px-3 py-2.5 shadow-sm ring-1 ring-border/40">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold tabular-nums ${tones[tone] || tones.default}`}>{value}</div>
    </div>
  );
}

export default function FolhaPrevisaoResumo({ totais, count }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
      <KpiCell label="Colaboradores" value={String(count || 0)} tone="muted" />
      {totais?.desligados > 0 && (
        <KpiCell label="Desligados" value={String(totais.desligados)} tone="negative" />
      )}
      <KpiCell label="Proventos" value={formatCurrency(totais?.proventos)} tone="positive" />
      <KpiCell label="Descontos" value={formatCurrency(totais?.descontos)} tone="negative" />
      <KpiCell label="Líquido a pagar" value={formatCurrency(totais?.liquido)} />
      {(totais?.totalDecimo > 0 || totais?.totalFerias > 0) && (
        <>
          <KpiCell label="13º no mês" value={formatCurrency(totais?.totalDecimo)} tone="amber" />
          <KpiCell label="Férias no mês" value={formatCurrency(totais?.totalFerias)} tone="amber" />
        </>
      )}
      <KpiCell label="Encargos empresa" value={formatCurrency(totais?.encargosEmpresa)} tone="muted" />
      <KpiCell label="Custo total" value={formatCurrency(totais?.custoTotalEmpresa)} />
    </div>
  );
}
