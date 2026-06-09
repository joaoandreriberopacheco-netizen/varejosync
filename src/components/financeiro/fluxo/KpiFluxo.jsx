import React from 'react';
import { TrendingUp, TrendingDown, ArrowRightLeft, AlertTriangle } from 'lucide-react';

const R = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

/** Superfícies P38 — alinhado a p38ThemeSurfaces */
const kpiBlock =
  'rounded-[16px] border border-transparent bg-secondary/60 px-3 py-2 sm:rounded-[22px] sm:px-3.5 sm:py-3 dark:border-white/10 dark:bg-[#26262e]';

const kpiCardBase =
  'rounded-[16px] border border-transparent bg-card sm:rounded-[22px] dark:border-white/10 dark:bg-[#26262e]';
const kpiSaldoPad = 'px-4 py-2.5 sm:px-4 sm:py-3 md:px-6 md:py-5';
const kpiGap = 'gap-3';
const kpiTopPad =
  'min-w-0 rounded-[16px] border border-transparent bg-card px-3 py-2.5 sm:rounded-[22px] sm:px-3.5 sm:py-3 dark:border-white/10 dark:bg-[#26262e]';

const P38_ACCENT = 'text-[#4a5240] dark:text-[#a4ce33]';

export default function KpiFluxo({ kpis }) {
  const taxa = kpis.entrou > 0 ? (kpis.saiu / kpis.entrou * 100).toFixed(0) : 0;

  const saldoBody = (
    <>
      <div className="mb-2 flex items-start justify-between gap-2 sm:mb-2.5 sm:gap-4">
        <div className="min-w-0">
          <p className="mb-0.5 pl-0.5 text-[8px] uppercase leading-tight tracking-normal text-muted-foreground sm:mb-1 sm:tracking-[0.16em]">Saldo de Execução</p>
          <p className="break-words text-[15px] font-semibold leading-tight text-foreground tabular-nums sm:text-[17px] md:text-[19px]">
            <span className={kpis.saldo >= 0 ? P38_ACCENT : 'text-red-600 dark:text-red-400'}>{kpis.saldo >= 0 ? '+' : '−'}</span>
            {R(Math.abs(kpis.saldo))}
          </p>
        </div>
        <div className="shrink-0 pt-0.5 text-right">
          <p className="mb-0.5 text-[8px] uppercase leading-tight tracking-normal text-muted-foreground sm:mb-1 sm:tracking-[0.16em]">Taxa</p>
          <p className="text-[12px] font-semibold text-foreground/90 sm:text-[13px]">{taxa}%</p>
        </div>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-secondary/80 sm:h-1.5 dark:bg-[#383e47]">
        <div className="h-full rounded-full bg-[#4a5240] transition-all dark:bg-[#a4ce33]" style={{ width: `${Math.min(Number(taxa), 100)}%` }} />
      </div>
    </>
  );

  return (
    <div className={`flex min-w-0 w-full max-w-full flex-col ${kpiGap}`}>
      <div className={`grid min-w-0 grid-cols-2 ${kpiGap}`}>
        <div className={kpiTopPad}>
          <div className="mb-1 flex min-w-0 items-center gap-2 sm:mb-1.5 sm:gap-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[9px] bg-secondary/80 sm:h-7 sm:w-7 sm:rounded-[10px] dark:bg-[#383e47]">
              <TrendingUp className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${P38_ACCENT}`} />
            </div>
            <p className="min-w-0 truncate text-[8px] uppercase leading-tight tracking-normal text-muted-foreground sm:tracking-[0.16em]">Receitas</p>
          </div>
          <p className="break-words text-[13px] font-semibold leading-tight text-foreground tabular-nums sm:text-[14px] md:text-[15px]">{R(kpis.entrou)}</p>
          {kpis.pEntrou > 0 && <p className="mt-0.5 break-words text-[8px] text-muted-foreground sm:mt-1 sm:text-[9px]">+{R(kpis.pEntrou)} previsto</p>}
        </div>
        <div className={kpiTopPad}>
          <div className="mb-1 flex min-w-0 items-center gap-2 sm:mb-1.5 sm:gap-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[9px] bg-secondary/80 sm:h-7 sm:w-7 sm:rounded-[10px] dark:bg-[#383e47]">
              <TrendingDown className="h-2.5 w-2.5 text-red-500 sm:h-3 sm:w-3 dark:text-red-400" />
            </div>
            <p className="min-w-0 truncate text-[8px] uppercase leading-tight tracking-normal text-muted-foreground sm:tracking-[0.16em]">Despesas</p>
          </div>
          <p className="break-words text-[13px] font-semibold leading-tight text-foreground tabular-nums sm:text-[14px] md:text-[15px]">{R(kpis.saiu)}</p>
          {kpis.pSaiu > 0 && <p className="mt-0.5 break-words text-[8px] text-muted-foreground sm:mt-1 sm:text-[9px]">+{R(kpis.pSaiu)} previsto</p>}
        </div>
      </div>

      {kpis.vencidos > 0 ? (
        <div className={`flex min-w-0 flex-col sm:flex-row sm:items-stretch ${kpiGap}`}>
          <div className={`${kpiCardBase} ${kpiSaldoPad} min-w-0 flex-1`}>{saldoBody}</div>
          <div className={`${kpiCardBase} ${kpiSaldoPad} flex min-h-0 min-w-0 flex-1 items-center gap-2 sm:gap-3`}>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500 sm:h-4 sm:w-4 dark:text-red-400" />
            <div className="min-w-0 flex-1">
              <p className="text-[8px] uppercase tracking-wider text-muted-foreground sm:text-[9px]">Vencidos</p>
              <p className="break-words text-[11px] font-semibold leading-snug text-foreground sm:text-sm">
                <span className="text-red-600 dark:text-red-400">−</span>
                {R(kpis.vencidos)}
                <span className="text-muted-foreground">
                  {' '}
                  · {kpis.qtdVencidos}{' '}
                  <span className="sm:hidden">lç.</span>
                  <span className="hidden sm:inline">lançamento{kpis.qtdVencidos !== 1 ? 's' : ''}</span>
                </span>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className={`${kpiCardBase} ${kpiSaldoPad}`}>{saldoBody}</div>
      )}

      {kpis.totalTransferencias > 0 &&
      <div className={`${kpiBlock} flex items-center gap-2 sm:gap-3`}>
          <ArrowRightLeft className="h-3.5 w-3.5 flex-none text-muted-foreground sm:h-4 sm:w-4" />
          <div className="min-w-0 flex-1">
            <p className="text-[8px] uppercase tracking-wider text-muted-foreground sm:text-[9px]">Transferências</p>
            <p className="text-xs font-semibold text-foreground sm:text-sm">{R(kpis.totalTransferencias)}</p>
          </div>
        </div>
      }
    </div>);

}
