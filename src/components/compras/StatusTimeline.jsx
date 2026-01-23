import React from 'react';
import { Check } from 'lucide-react';

export default function StatusTimeline({ currentStatus, aprovacaoFinanceira }) {
  const stages = [
    { key: 'Rascunho', label: 'Rascunho' },
    { key: 'Aprovado', label: 'Aprovado' },
    { key: 'Despachado', label: 'Despachado' },
    { key: 'Entregue', label: 'Entregue' },
    { key: 'Pendência', label: 'Pendência' },
    { key: 'Concluído', label: 'Concluído' }
  ];

  const getStageIndex = (status, aprovacao) => {
    if (status === 'Cancelado') return -1;
    if (status === 'Rascunho' || status === 'Enviado') return 0;
    if (aprovacao === 'Aprovado') return 1;
    if (status === 'Despachado') return 2;
    if (status === 'Em Trânsito' || status === 'Aguardando Recepção') return 3;
    if (status === 'Pendências') return 4;
    if (status === 'Concluído') return 5;
    return 0;
  };

  const currentIndex = getStageIndex(currentStatus, aprovacaoFinanceira);

  return (
    <div className="flex items-center gap-0.5 px-3 py-2">
      {stages.map((stage, idx) => {
        const isCompleted = idx <= currentIndex;
        const isActive = idx === currentIndex;
        
        return (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-gray-700 dark:bg-gray-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3 h-3 text-white" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />
                )}
              </div>
              <span
                className={`text-[8px] mt-0.5 ${
                  isActive
                    ? 'font-semibold text-gray-800 dark:text-gray-200'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {stage.label}
              </span>
            </div>
            {idx < stages.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-0.5 transition-all ${
                  isCompleted && idx < currentIndex
                    ? 'bg-gray-700 dark:bg-gray-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
                style={{ minWidth: '12px' }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}