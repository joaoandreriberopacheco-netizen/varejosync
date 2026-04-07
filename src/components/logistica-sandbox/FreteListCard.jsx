import React from 'react';
import { CircleDollarSign, Package, ShipWheel } from 'lucide-react';

export default function FreteListCard({ evento, onSelect }) {
  return (
    <button onClick={() => onSelect(evento)} className="w-full text-left bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm active:scale-[0.99] transition-transform">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <ShipWheel className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{evento.embarcacao_nome}</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{evento.codigo || 'Sem código'}</p>
          <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-gray-500 dark:text-gray-400">
            <span>{evento.total_embarques_relacionados || 0} embarques</span>
            <span>{evento.total_fornecedores_relacionados || 0} fornecedores</span>
            <span>{(evento.valor_total_carga || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm ${evento.tem_conta_frete ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
            <CircleDollarSign className="w-4 h-4" />
          </div>
          {evento.tem_embarques_relacionados && (
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 shadow-sm">
              <Package className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}