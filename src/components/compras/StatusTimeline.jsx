import React from 'react';
import { Check, FileText, CheckCircle, Send, Package, AlertCircle, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function StatusTimeline({ currentStatus, aprovacaoFinanceira, pedido }) {
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

  const getStageDate = (stageIdx) => {
    if (!pedido) return null;
    
    switch(stageIdx) {
      case 0: // Rascunho
        return pedido.created_date;
      case 1: // Aprovado
        return pedido.data_aprovacao_financeira;
      case 2: // Despachado
        return pedido.data_despacho;
      case 3: // Entregue
        return pedido.data_chegada;
      case 5: // Concluído
        return pedido.data_conclusao;
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM', { locale: ptBR });
    } catch {
      return null;
    }
  };

  return (
    <div className="flex items-center gap-1 px-2 py-4">
      {stages.map((stage, idx) => {
        const isCompleted = idx <= currentIndex;
        const isActive = idx === currentIndex;
        const Icon = stage.icon;
        const stageDate = getStageDate(idx);
        
        return (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center gap-1 min-w-[60px]">
              <div className="text-[10px] text-center text-gray-600 dark:text-gray-400 font-medium h-8 flex items-center justify-center px-1 leading-tight">
                {stage.label}
              </div>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? 'bg-gray-700 dark:bg-gray-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isCompleted ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
              </div>
              {stageDate && isCompleted && (
                <div className="text-[9px] text-gray-500 dark:text-gray-400 font-mono">
                  {formatDate(stageDate)}
                </div>
              )}
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