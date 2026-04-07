import React from 'react';
import { format } from 'date-fns';

export default function AgendaCalendarView({ groupedDates = [] }) {
  if (!groupedDates.length) {
    return <div className="rounded-3xl bg-white dark:bg-gray-800 p-5 shadow-sm text-sm text-gray-500 dark:text-gray-400">Nenhum evento encontrado no período.</div>;
  }

  return (
    <div className="space-y-4">
      {groupedDates.map((group) => (
        <div key={group.key} className="rounded-3xl bg-white dark:bg-gray-800 p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shadow-sm text-sm font-semibold text-gray-800 dark:text-gray-100">
              {format(new Date(`${group.key}T00:00:00`), 'd')}
            </div>
            <div>
              <p className="font-glacial text-lg text-gray-900 dark:text-gray-100">{group.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{group.eventos.length} evento(s)</p>
            </div>
          </div>
          <div className="space-y-2">
            {group.eventos.map((evento) => (
              <div key={evento.id} className="rounded-2xl bg-gray-50 dark:bg-gray-700 px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{evento.embarcacao_nome}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{evento.nome || `${evento.embarcacao_nome} · ETA ${evento.data_chegada_destino_formatada}`}</p>
                  </div>
                  <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                    <p>Saída Manaus</p>
                    <p className="text-gray-900 dark:text-gray-100">{evento.data_saida_manaus_formatada}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}