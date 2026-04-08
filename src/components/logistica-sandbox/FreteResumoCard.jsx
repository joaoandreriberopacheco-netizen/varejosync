import React from 'react';
import { DollarSign } from 'lucide-react';

function getStatusAggregado(eventos) {
  if (eventos.length === 0) return { label: 'Sem fretes', color: '#d1d5db', bgClass: 'bg-gray-50 dark:bg-gray-700' };
  
  const temAtrasada = eventos.some(e => {
    if (!e.lancamento_financeiro_id) return false;
    if (e.lancamento_financeiro_status === 'Pago') return false;
    if (!e.lancamento_financeiro_data_vencimento) return false;
    return new Date(e.lancamento_financeiro_data_vencimento) < new Date();
  });
  
  if (temAtrasada) return { label: 'Atrasada', color: '#ff5a7f', bgClass: 'bg-red-50 dark:bg-red-900/20' };
  
  const todosVinculados = eventos.every(e => e.lancamento_financeiro_id);
  const todosPagos = eventos.every(e => e.lancamento_financeiro_status === 'Pago');
  
  if (todosPagos) return { label: 'Tudo Pago', color: '#7c8a0f', bgClass: 'bg-green-50 dark:bg-green-900/20' };
  if (todosVinculados) return { label: 'Vinculadas', color: '#84cc16', bgClass: 'bg-lime-50 dark:bg-lime-900/20' };
  
  return { label: 'Parcial', color: '#f59e0b', bgClass: 'bg-amber-50 dark:bg-amber-900/20' };
}

export default function FreteResumoCard({ eventos = [] }) {
  const totalFretes = eventos.reduce((sum, evento) => sum + (evento.lancamento_financeiro_valor || 0), 0);
  const { label, color, bgClass } = getStatusAggregado(eventos);
  
  return (
    <div className="rounded-3xl bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${bgClass}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 6v12" />
              <path d="M9 9h6a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-6" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide block">Total de fretes</span>
            <span className="text-xs text-gray-500 dark:text-gray-500">{label}</span>
          </div>
        </div>
      </div>
      <p className="text-2xl font-bold text-center text-gray-900 dark:text-white">
        {(totalFretes || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
    </div>
  );
}