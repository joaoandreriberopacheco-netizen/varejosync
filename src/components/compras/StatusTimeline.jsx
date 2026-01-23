import React from 'react';
import { Check } from 'lucide-react';

export default function StatusTimeline({ currentStatus, aprovacaoFinanceira }) {
  const stages = [
    { key: 'Rascunho', label: 'Rascunho' },
    { key: 'Enviado', label: 'Enviado' },
    { key: 'Aprovado', label: 'Aprovado' },
    { key: 'Despachado', label: 'Despachado' },
    { key: 'Em Trânsito', label: 'Em Trânsito' },
    { key: 'Concluído', label: 'Concluído' }
  ];

  const getStageIndex = (status, aprovacao) => {
    if (status === 'Cancelado') return -1;
    if (status === 'Rascunho') return 0;
    if (status === 'Enviado') return 1;
    if (aprovacao === 'Aprovado') return 2;
    if (status === 'Despachado') return 3;
    if (status === 'Em Trânsito') return 4;
    if (status === 'Concluído' || status === 'Pendências') return 5;
    return 1;
  };

  const currentIndex = getStageIndex(currentStatus, aprovacaoFinanceira);

  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {stages.map((stage, idx) => {
        const isCompleted = idx <= currentIndex;
        const isActive = idx === currentIndex;
        
        return (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-gray-700 dark:bg-gray-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />
                )}
              </div>
              <span
                className={`text-[9px] mt-1 ${
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
                className={`flex-1 h-0.5 mx-1 transition-all ${
                  isCompleted && idx < currentIndex
                    ? 'bg-gray-700 dark:bg-gray-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
                style={{ minWidth: '20px' }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}