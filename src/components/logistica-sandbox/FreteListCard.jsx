import React from 'react';
import { DollarSign, ShipWheel } from 'lucide-react';

function getContaStatusStyle(temConta, status, estaAtrazo) {
  // Sem conta vinculada - cinza claro desaturado
  if (!temConta) {
    return {
      bgClass: 'bg-gray-50 dark:bg-gray-800',
      strokeColor: '#d1d5db' // cinza-300
    };
  }

  // Com atraso - flamingo (rosa coral)
  if (estaAtrazo) {
    return {
      bgClass: 'bg-red-50 dark:bg-red-900/20',
      strokeColor: '#ff5a7f' // flamingo
    };
  }

  // Pago - verde oliva
  if (status === 'Pago') {
    return {
      bgClass: 'bg-green-50 dark:bg-green-900/20',
      strokeColor: '#7c8a0f' // verde oliva
    };
  }

  // Pendente - verde lima (vinculada mas não paga)
  return {
    bgClass: 'bg-lime-50 dark:bg-lime-900/20',
    strokeColor: '#84cc16' // verde lima
  };
}

export default function FreteListCard({ evento, onSelect }) {
  const temContaFrete = evento.tem_conta_frete;
  const statusConta = evento.conta_frete_status;
  // Verificar se está atrasada comparando data_vencimento com hoje
  const estaAtrasada = temContaFrete && 
    statusConta !== 'Pago' && 
    evento.conta_frete?.data_vencimento && 
    new Date(evento.conta_frete.data_vencimento) < new Date();
  
  const { bgClass, strokeColor } = getContaStatusStyle(temContaFrete, statusConta, estaAtrasada);

  return (
    <button onClick={() => onSelect(evento)} className="w-full text-left bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm active:scale-[0.99] transition-transform">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <ShipWheel className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{evento.embarcacao_nome}</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{evento.codigo || 'Sem código'}</p>
          <div className="flex flex-wrap gap-x-2 gap-y-1 mt-3 text-[11px] text-gray-500 dark:text-gray-400">
            <span>{evento.total_embarques_relacionados || 0} embarques</span>
            <span>{evento.total_fornecedores_relacionados || 0} fornecedores</span>
            <span>{(evento.valor_total_carga || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${bgClass}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 6v12" />
              <path d="M9 9h6a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-6" />
            </svg>
          </div>
        </div>
        </div>
        </button>
        );
        }