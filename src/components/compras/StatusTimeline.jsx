import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, Send, Package, AlertCircle, Flag, XCircle, CheckCheck } from 'lucide-react';
import { format, differenceInDays, differenceInHours } from 'date-fns';

export default function StatusTimeline({ currentStatus, dataAprovacao, dataEmissao, dataTransicoes, isMobile = false }) {
  const [elapsed, setElapsed] = useState('');

  // Cronômetro progressivo: conta a partir da aprovação financeira até a conclusão
  useEffect(() => {
    if (!dataAprovacao || currentStatus === 'Concluído' || currentStatus === 'Cancelado') {
      setElapsed('');
      return;
    }

    const calcElapsed = () => {
      const inicio = new Date(dataAprovacao);
      const agora = new Date();
      const dias = differenceInDays(agora, inicio);
      const horas = differenceInHours(agora, inicio) % 24;
      if (dias > 0) setElapsed(`${dias}d ${horas}h`);
      else setElapsed(`${horas}h`);
    };

    calcElapsed();
    const interval = setInterval(calcElapsed, 60000); // atualiza a cada minuto
    return () => clearInterval(interval);
  }, [dataAprovacao, currentStatus]);

  const stages = [
    { key: 'Rascunho',            label: 'Rascunho',       icon: FileText    },
    { key: 'Aguardando Liberação', label: 'Ag. Liberação', icon: Clock       },
    { key: 'Aprovado',            label: 'Aprovado',       icon: CheckCircle },
    { key: 'Despachado',          label: 'Despachado',     icon: Send        },
    { key: 'Em Recepção',         label: 'Em Recepção',    icon: Package     },
    { key: 'Pendência',           label: 'Pendência',      icon: AlertCircle },
    { key: 'Concluído',           label: 'Concluído',      icon: Flag        },
  ];

  const getStageIndex = (status) => {
    const map = {
      'Rascunho':            0,
      'Devolvido':           0, // volta ao início visualmente
      'Aguardando Liberação':1,
      'Aprovado':            2,
      'Despachado':          3,
      'Em Recepção':         4,
      'Pendência':           5,
      'Concluído':           6,
      'Cancelado':           -1,
    };
    return map[status] ?? 0;
  };

  const isCancelled = currentStatus === 'Cancelado';
  const isDevolvido = currentStatus === 'Devolvido';
  const currentIndex = getStageIndex(currentStatus);

  // Encontra a data de uma etapa específica nas transições
  const getDataTransicao = (stageKey) => {
    if (!dataTransicoes || !dataTransicoes.length) return null;
    const t = dataTransicoes.find(tr => tr.status_novo === stageKey);
    return t ? t.data_transicao : null;
  };

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <span className="text-xs text-red-500 font-medium">Pedido Cancelado</span>
      </div>
    );
  }

  // Retorna as classes de cor para cada bolinha com base no estado
  const getBubbleClasses = (stage, idx, isCompleted, isActive, isPendencia) => {
    if (isPendencia) {
      return 'bg-orange-500 text-white ring-2 ring-offset-1 ring-orange-400';
    }
    if (stage.key === 'Aguardando Liberação' && isActive) {
      return 'bg-amber-500 text-white ring-2 ring-offset-1 ring-amber-400';
    }
    if (stage.key === 'Aprovado' && isCompleted) {
      return isActive
        ? 'bg-emerald-600 text-white ring-2 ring-offset-1 ring-emerald-400'
        : 'bg-emerald-600 text-white';
    }
    if (stage.key === 'Concluído' && isCompleted) {
      return isActive
        ? 'bg-emerald-700 text-white ring-2 ring-offset-1 ring-emerald-500'
        : 'bg-emerald-700 text-white';
    }
    if (isCompleted) {
      return isActive
        ? 'bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900 ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-500'
        : 'bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900';
    }
    return 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600';
  };

  // Cor da linha de conexão entre etapas
  const getLineClass = (idx) => {
    if (idx < currentIndex) {
      // Linha até "Aprovado" fica verde
      if (idx >= 1 && currentIndex >= 2) return 'bg-emerald-500';
      return 'bg-gray-700 dark:bg-gray-300';
    }
    return 'bg-gray-100 dark:bg-gray-800';
  };

  return (
    <div className="flex flex-col gap-1 px-1 py-0.5">
      {/* Cronômetro progressivo */}
      {elapsed && (
        <div className="flex items-center justify-end gap-1 px-1">
          <Clock className="w-3 h-3 text-gray-400" />
          <span className="text-[10px] text-gray-400 font-mono">{elapsed} em andamento</span>
        </div>
      )}

      <div className="flex items-center gap-1">
        {stages.map((stage, idx) => {
          const isCompleted = idx <= currentIndex;
          const isActive = idx === currentIndex;
          const isPendencia = stage.key === 'Pendência' && currentStatus === 'Pendência';
          const Icon = stage.icon;
          const dataStage = getDataTransicao(stage.key) || (idx === 0 ? dataEmissao : null);

          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center gap-0.5 min-w-0">
                {!isMobile && (
                  <div className={`text-[9px] font-medium text-center leading-tight max-w-[54px] truncate ${
                    isActive
                      ? stage.key === 'Aguardando Liberação' ? 'text-amber-600 dark:text-amber-400'
                      : stage.key === 'Aprovado' || stage.key === 'Concluído' ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-700 dark:text-gray-200'
                      : 'text-gray-400 dark:text-gray-600'
                  }`}>
                    {stage.label}
                  </div>
                )}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${getBubbleClasses(stage, idx, isCompleted, isActive, isPendencia)}`}
                  title={stage.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                {isActive && dataStage && (
                  <div className="text-[9px] text-gray-400 dark:text-gray-500 text-center leading-tight mt-0.5 max-w-[54px]">
                    {format(new Date(dataStage), 'dd/MM HH:mm')}
                  </div>
                )}
                {isDevolvido && idx === 0 && (
                  <div className="text-[9px] text-orange-500 text-center font-medium leading-tight max-w-[54px]">
                    Devolvido
                  </div>
                )}
              </div>
              {idx < stages.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-0.5 transition-all ${getLineClass(idx)}`}
                  style={{ minWidth: '6px' }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}