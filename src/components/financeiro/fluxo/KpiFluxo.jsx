import React from 'react';
import { TrendingUp, TrendingDown, ArrowRightLeft, AlertTriangle } from 'lucide-react';

const R = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

/** Surface compartilhada para manter consistência visual com barras de consulta. */
const kpiBlock = 'rounded-[22px] border border-transparent bg-[#EEF1F4] px-3.5 py-3 dark:border-border dark:bg-card';

const kpiCardBase =
  'rounded-[22px] border border-transparent bg-[hsl(var(--background))] dark:border-border dark:bg-card';
/** Padding maior para destacar Saldo / Vencidos e afastar da borda do container */
const kpiSaldoPad = 'px-5 py-4 sm:px-6 sm:py-5';
/** Espaço único entre todos os blocos de KPI (vertical e entre colunas) */
const kpiGap = 'gap-3';

export default function KpiFluxo({ kpis }) {
  const taxa = kpis.entrou > 0 ? (kpis.saiu / kpis.entrou * 100).toFixed(0) : 0;

  const saldoBody = (
    <>
      <div className="bg-transparent mb-2.5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-[8px] uppercase tracking-[0.16em] text-gray-500 dark:text-muted-foreground">Saldo de Execução</p>
          <p className="break-words text-[17px] font-semibold leading-tight text-gray-900 tabular-nums sm:text-[19px] dark:text-foreground">
            <span className={kpis.saldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{kpis.saldo >= 0 ? '+' : '−'}</span>
            {R(Math.abs(kpis.saldo))}
          </p>
        </div>
        <div className="shrink-0 pt-0.5 text-right">
          <p className="mb-1 text-[8px] uppercase tracking-[0.16em] text-gray-400 dark:text-muted-foreground">Taxa</p>
          <p className="text-[13px] font-semibold text-gray-700 dark:text-foreground">{taxa}%</p>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white dark:bg-muted">
        <div className="bg-teal-400 rounded-full h-full transition-all dark:bg-primary/50" style={{ width: `${Math.min(Number(taxa), 100)}%` }} />
      </div>
    </>
  );

  return (
    <div className={`flex min-w-0 w-full max-w-full flex-col overflow-x-clip ${kpiGap}`}>
      <div className={`grid min-w-0 grid-cols-2 ${kpiGap}`}>
        <div className="min-w-0 bg-[hsl(var(--background))] rounded-[22px] border border-transparent px-3.5 py-3 dark:border-border dark:bg-card">
          <div className="mb-1.5 flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-white dark:bg-muted">
              <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
            </div>
            <p className="min-w-0 text-[8px] uppercase tracking-[0.16em] text-gray-500 dark:text-muted-foreground">Receitas</p>
          </div>
          <p className="break-words text-[14px] font-semibold leading-tight text-gray-900 tabular-nums sm:text-[15px] dark:text-foreground">{R(kpis.entrou)}</p>
          {kpis.pEntrou > 0 && <p className="mt-1 break-words text-[9px] text-gray-500 dark:text-muted-foreground">+{R(kpis.pEntrou)} previsto</p>}
        </div>
        <div className="min-w-0 bg-[hsl(var(--background))] rounded-[22px] border border-transparent px-3.5 py-3 dark:border-border dark:bg-card">
          <div className="mb-1.5 flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] bg-white dark:bg-muted">
              <TrendingDown className="h-3 w-3 text-red-500 dark:text-red-400" />
            </div>
            <p className="min-w-0 text-[8px] uppercase tracking-[0.16em] text-gray-500 dark:text-muted-foreground">Despesas</p>
          </div>
          <p className="break-words text-[14px] font-semibold leading-tight text-gray-900 tabular-nums sm:text-[15px] dark:text-foreground">{R(kpis.saiu)}</p>
          {kpis.pSaiu > 0 && <p className="mt-1 break-words text-[9px] text-gray-500 dark:text-muted-foreground">+{R(kpis.pSaiu)} previsto</p>}
        </div>
      </div>

      {kpis.vencidos > 0 ? (
        <div className={`flex min-w-0 flex-col sm:flex-row sm:items-stretch ${kpiGap}`}>
          <div className={`${kpiCardBase} ${kpiSaldoPad} min-w-0 flex-1`}>{saldoBody}</div>
          <div className={`${kpiCardBase} ${kpiSaldoPad} flex min-h-0 min-w-0 flex-1 items-center gap-3`}>
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] uppercase tracking-wider text-gray-500 dark:text-muted-foreground">Vencidos</p>
              <p className="break-words text-sm font-semibold leading-snug text-gray-900 dark:text-foreground">
                <span className="text-red-600 dark:text-red-400">−</span>
                {R(kpis.vencidos)} · {kpis.qtdVencidos} lançamento{kpis.qtdVencidos !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className={`${kpiCardBase} ${kpiSaldoPad}`}>{saldoBody}</div>
      )}

      {kpis.totalTransferencias > 0 &&
      <div className={`${kpiBlock} flex items-center gap-3`}>
          <ArrowRightLeft className="h-4 w-4 flex-none text-slate-500 dark:text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-wider text-gray-500 dark:text-muted-foreground">Transferências</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-foreground">{R(kpis.totalTransferencias)}</p>
          </div>
        </div>
      }
    </div>);

}