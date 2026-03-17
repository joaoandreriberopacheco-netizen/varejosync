import React from 'react';
import { TrendingUp, TrendingDown, ArrowRightLeft, AlertTriangle } from 'lucide-react';

const R = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function KpiFluxo({ kpis }) {
  const taxa = kpis.entrou > 0 ? (kpis.saiu / kpis.entrou * 100).toFixed(0) : 0;

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3 h-3 text-gray-400" />
            <p className="text-[9px] uppercase tracking-wider text-gray-400">Receitas</p>
          </div>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{R(kpis.entrou)}</p>
          {kpis.pEntrou > 0 && <p className="text-[9px] text-gray-400 mt-1">+{R(kpis.pEntrou)} prev.</p>}
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="w-3 h-3 text-gray-400" />
            <p className="text-[9px] uppercase tracking-wider text-gray-400">Despesas</p>
          </div>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{R(kpis.saiu)}</p>
          {kpis.pSaiu > 0 && <p className="text-[9px] text-gray-400 mt-1">+{R(kpis.pSaiu)} prev.</p>}
        </div>
      </div>

      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-4 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-0.5">Saldo de Execução</p>
            <p className={`text-lg font-bold ${kpis.saldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{R(kpis.saldo)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-gray-400 mb-0.5">Taxa de Gasto</p>
            <p className="text-sm font-bold text-gray-600 dark:text-gray-300">{taxa}%</p>
          </div>
        </div>
        <div className="h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div className="h-full bg-gray-400 dark:bg-gray-400 rounded-full transition-all" style={{ width: `${Math.min(Number(taxa), 100)}%` }} />
        </div>
      </div>

      {kpis.vencidos > 0 && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-none" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-gray-400">Vencidos</p>
            <p className="text-sm font-semibold text-red-500 dark:text-red-400">{R(kpis.vencidos)} · {kpis.qtdVencidos} lançamento{kpis.qtdVencidos !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {kpis.totalTransferencias > 0 && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center gap-3">
          <ArrowRightLeft className="w-4 h-4 text-gray-400 flex-none" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-gray-400">Transferências</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{R(kpis.totalTransferencias)}</p>
          </div>
        </div>
      )}
    </div>
  );
}