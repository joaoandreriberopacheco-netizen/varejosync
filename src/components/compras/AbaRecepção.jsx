import React, { useState } from 'react';
import { Package, ChevronRight, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nenhum embarque registrado. Adicione embarques na aba Logística.
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
          <div
            key={embarque.id || idx}
            className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
            onClick={() => setSelectedEmbarque(embarque)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Embarque #{embarque.id?.slice(-6) || idx + 1}
                  </h3>
                  {getStatusIcon(statusRecebimento)}
                </div>

                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Transportadora:</span>
                    <span className="text-gray-900 dark:text-white font-medium">{embarque.transportadora_nome || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Despacho:</span>
                    <span className="text-gray-900 dark:text-white font-medium">{dataEmbarque}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ETA:</span>
                    <span className="text-gray-900 dark:text-white font-medium">{eta}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Itens:</span>
                    <span className="text-gray-900 dark:text-white font-medium">{qtdItens} produto(s)</span>
                  </div>
                </div>

                <div className="mt-2">
                  <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {getStatusLabel(statusRecebimento)}
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0">
                {statusRecebimento === 'Pendente' ? (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEmbarque(embarque);
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white h-9"
                  >
                    Receber
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEmbarque(embarque);
                    }}
                    className="border-0 h-9"
                  >
                    Editar
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
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