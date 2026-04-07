import React from 'react';
import { Anchor, ArrowRight, BatteryMedium, ShipWheel } from 'lucide-react';

function getMarkerPosition(status) {
  if (status === 'Atracado na Origem') return 'left-[8%]';
  if (status === 'Em Viagem') return 'left-[35%]';
  if (status === 'Atracado no Destino') return 'left-[82%]';
  if (status === 'Retornando') return 'left-[58%]';
  return 'left-[42%]';
}

function getLoadColor(ocupacao) {
  if (ocupacao >= 85) return 'bg-red-500';
  if (ocupacao >= 60) return 'bg-emerald-500';
  return 'bg-gray-400';
}

export default function LogisticaSandboxBoard({ eventos, onSelect }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 font-glacial">Painel visual da rota</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Porto de origem, travessia e porto de destino</p>
        </div>
      </div>
      <div className="relative rounded-3xl bg-gray-50 dark:bg-gray-800/70 p-4 md:p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-900 shadow-sm flex items-center justify-center"><Anchor className="w-5 h-5 text-gray-700 dark:text-gray-200" /></div>
            <span className="text-xs text-gray-600 dark:text-gray-300">Manaus</span>
          </div>
          <div className="flex-1 px-4">
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 relative">
              <div className="absolute inset-y-0 left-0 w-full border-t border-dashed border-gray-400 dark:border-gray-500 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-900 shadow-sm flex items-center justify-center"><Anchor className="w-5 h-5 text-gray-700 dark:text-gray-200" /></div>
            <span className="text-xs text-gray-600 dark:text-gray-300">Tabatinga</span>
          </div>
        </div>
        <div className="space-y-4">
          {eventos.map((evento) => (
            <button
              key={evento.id}
              onClick={() => onSelect(evento)}
              className="w-full text-left rounded-2xl bg-white/90 dark:bg-gray-900/90 shadow-sm p-3 md:p-4"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ShipWheel className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{evento.embarcacao_nome}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{evento.status_operacao}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <BatteryMedium className="w-4 h-4" />
                  <span>{evento.ocupacao_percentual || 0}%</span>
                </div>
              </div>
              <div className="relative h-10 mb-3">
                <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className={`absolute top-1/2 -translate-y-1/2 ${getMarkerPosition(evento.status_operacao)}`}>
                  <div className="w-9 h-9 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div className={`h-full ${getLoadColor(evento.ocupacao_percentual || 0)}`} style={{ width: `${evento.ocupacao_percentual || 0}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                  <span>Chegada: {evento.previsao_chegada || '-'}</span>
                  <span>{evento.dias_atraso ? `+${evento.dias_atraso}d atraso` : 'No prazo'}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}