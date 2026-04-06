import React from 'react';
import { TrendingUp, TrendingDown, ArrowRightLeft, AlertTriangle } from 'lucide-react';

const R = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function KpiFluxo({ kpis }) {
  const taxa = kpis.entrou > 0 ? (kpis.saiu / kpis.entrou * 100).toFixed(0) : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#F7F7F5] dark:bg-slate-900 p-4 rounded-[24px] border-0">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[16px] bg-white dark:bg-slate-800">
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Receitas</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white leading-none">{R(kpis.entrou)}</p>
          {kpis.pEntrou > 0 && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">+{R(kpis.pEntrou)} previsto</p>}
        </div>
        <div className="bg-[#F7F7F5] dark:bg-slate-900 p-4 rounded-[24px] border-0">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[16px] bg-white dark:bg-slate-800">
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Despesas</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white leading-none">{R(kpis.saiu)}</p>
          {kpis.pSaiu > 0 && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">+{R(kpis.pSaiu)} previsto</p>}
        </div>
      </div>

      <div className="bg-[#F7F7F5] dark:bg-slate-900 px-4 py-4 rounded-[24px] border-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400 mb-1">Saldo de Execução</p>
            <p className={`text-[28px] leading-none font-semibold ${kpis.saldo >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-500 dark:text-red-400'}`}>{R(kpis.saldo)}</p>
          </div>
          <div className="text-right pt-1">
            <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500 mb-1">Taxa de Gasto</p>
            <p className="text-base font-semibold text-gray-700 dark:text-gray-200">{taxa}%</p>
          </div>
        </div>
        <div className="h-2 bg-white dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-slate-300 dark:bg-slate-600 rounded-full transition-all" style={{ width: `${Math.min(Number(taxa), 100)}%` }} />
        </div>
      </div>

      {kpis.vencidos > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm border border-gray-100/60 dark:border-white/5 p-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-none" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Vencidos</p>
            <p className="text-sm font-semibold text-red-500 dark:text-red-400">{R(kpis.vencidos)} · {kpis.qtdVencidos} lançamento{kpis.qtdVencidos !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {kpis.totalTransferencias > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm border border-gray-100/60 dark:border-white/5 p-4 flex items-center gap-3">
          <ArrowRightLeft className="w-4 h-4 text-slate-500 flex-none" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Transferências</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{R(kpis.totalTransferencias)}</p>
          </div>
        </div>
      )}
    </div>
  );
}