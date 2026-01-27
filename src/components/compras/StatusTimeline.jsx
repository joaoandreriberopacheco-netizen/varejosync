import React from 'react';
import { Check, FileText, CheckCircle, Send, Package, AlertCircle, Flag } from 'lucide-react';

export default function StatusTimeline({ currentStatus, aprovacaoFinanceira }) {
  const stages = [
    { key: 'Rascunho', label: 'Rascunho', icon: FileText },
    { key: 'Aprovado', label: 'Aprovado', icon: CheckCircle },
    { key: 'Despachado', label: 'Despachado', icon: Send },
    { key: 'Entregue', label: 'Entregue', icon: Package },
    { key: 'Pendência', label: 'Pendência', icon: AlertCircle },
    { key: 'Concluído', label: 'Concluído', icon: Flag }
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
    <div className="flex items-center gap-1 px-2 py-3">
      {stages.map((stage, idx) => {
        const isCompleted = idx <= currentIndex;
        const isActive = idx === currentIndex;
        const Icon = stage.icon;
        
        return (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-gray-700 dark:bg-gray-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isCompleted ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
              </div>
            </div>
            {idx < stages.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-0.5 transition-all ${
                  isCompleted && idx < currentIndex
                    ? 'bg-gray-700 dark:bg-gray-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
                style={{ minWidth: '8px' }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}