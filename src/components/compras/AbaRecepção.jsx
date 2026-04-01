import React, { useState } from 'react';
import { Package, Play, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RecepcionarEmbarque from './RecepcionarEmbarque';

export default function AbaRecepção({ pedido }) {
  const [selectedEmbarque, setSelectedEmbarque] = useState(null);

  const embarques = pedido?.embarques_registrados || [];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Recebido OK':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'Com Divergência':
        return <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'Recebido Parcial':
        return <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400 dark:text-gray-500" />;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'Pendente': 'Aguardando Recebimento',
      'Recebido Parcial': 'Recebido Parcial',
      'Recebido OK': 'Recebido OK',
      'Com Divergência': 'Com Divergências'
    };
    return labels[status] || status;
  };

  if (embarques.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-base text-gray-600 dark:text-gray-400 font-medium mb-1">
          Nenhum embarque registrado
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Adicione embarques na aba Logística para iniciar a recepção.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {embarques.map((embarque, idx) => {
        const statusRecebimento = embarque.status_recebimento_embarque || 'Pendente';
        const dataEmbarque = embarque.data_embarque ? new Date(embarque.data_embarque).toLocaleDateString('pt-BR') : '-';
        const eta = embarque.eta ? new Date(embarque.eta).toLocaleDateString('pt-BR') : '-';
        const qtdItens = embarque.itens_embarcados?.length || 0;

        return (
          <button
            key={embarque.id || idx}
            onClick={() => setSelectedEmbarque(embarque)}
            className="w-full text-left bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl p-5 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Cabeçalho */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Embarque #{embarque.id?.slice(-6) || idx + 1}
                  </h3>
                  <div className="flex-1" />
                  {getStatusIcon(statusRecebimento)}
                </div>

                {/* Info grid - 2 colunas */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">Transportadora</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{embarque.transportadora_nome || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">Despacho</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{dataEmbarque}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">ETA</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{eta}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">Itens</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{qtdItens} produto(s)</p>
                  </div>
                </div>

                {/* Status badge */}
                <span className={`inline-block px-3 py-1.5 text-xs font-semibold rounded-full ${
                  statusRecebimento === 'Pendente'
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    : statusRecebimento === 'Recebido OK'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : statusRecebimento === 'Com Divergência'
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                }`}>
                  {getStatusLabel(statusRecebimento)}
                </span>
              </div>

              {/* Ação - Play Icon */}
              <div className="flex items-center justify-center">
                {statusRecebimento === 'Pendente' ? (
                  <div className="w-12 h-12 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center shadow-md hover:shadow-lg transition-shadow">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                    <Play className="w-5 h-5 text-gray-600 dark:text-gray-400 fill-gray-600 dark:fill-gray-400" />
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}

      {selectedEmbarque && (
        <RecepcionarEmbarque
          isOpen={!!selectedEmbarque}
          onClose={() => setSelectedEmbarque(null)}
          embarque={selectedEmbarque}
          pedido={pedido}
          onRecebido={() => window.location.reload()}
        />
      )}
    </div>
  );
}