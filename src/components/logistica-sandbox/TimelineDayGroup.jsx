import React from 'react';
import { CalendarClock, ShipWheel } from 'lucide-react';

export default function TimelineDayGroup({ label, dayNumber, eventos = [], isToday = false, onSelect, viewModeLabel, selectedEventoId = null }) {
  return (
    <div className="relative pl-12">
      <div className="absolute left-[18px] top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
      <div className="absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-white dark:bg-gray-800 shadow-sm text-gray-700 dark:text-gray-200 text-sm font-semibold">
        {dayNumber}
      </div>
      <div className="pb-6">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-glacial">{label}</p>
          {isToday && <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">Hoje</span>}
        </div>
        <div className="space-y-2">
          {eventos.map((evento) => {
            const isSelected = selectedEventoId === evento.id;
            const comprasAtivas = evento.total_embarques_ativos || 0;
            const comprasConcluidas = evento.total_embarques_concluidos || 0;
            const totalCompras = (evento.embarques_relacionados || []).length;

            return (
            <button
              key={evento.id}
              onClick={() => onSelect(evento)}
              className={`relative w-full text-left rounded-2xl bg-white dark:bg-gray-800 px-4 py-3.5 shadow-sm transition-all ${isSelected ? 'ring-2 ring-gray-300 dark:ring-gray-500 shadow-md' : 'ring-1 ring-transparent hover:ring-gray-200 dark:hover:ring-gray-700'}`}
            >
              {(comprasAtivas > 0 || comprasConcluidas > 0) ? (
                <div className="absolute -right-1 -top-1 flex items-center gap-1">
                  {comprasConcluidas > 0 ? <div className="min-w-[22px] h-[22px] px-1 rounded-full bg-gray-300 text-gray-900 text-[11px] font-bold flex items-center justify-center shadow-sm">{comprasConcluidas}</div> : null}
                  {comprasAtivas > 0 ? <div className="min-w-[22px] h-[22px] px-1 rounded-full bg-lime-300 text-gray-900 text-[11px] font-bold flex items-center justify-center shadow-sm">{comprasAtivas}</div> : null}
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0 pr-4">
                    <ShipWheel className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-900 dark:text-gray-100 font-medium truncate">{evento.embarcacao_nome}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    {evento.codigo && <span>{evento.codigo}</span>}
                    <span>{evento.ocupacao_percentual_dinamica || 0}%</span>
                    {totalCompras > 0 ? <span>{totalCompras} compra{totalCompras > 1 ? 's' : ''}</span> : null}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 justify-end text-[11px] text-gray-500 dark:text-gray-400">
                    <CalendarClock className="w-3.5 h-3.5" />
                    <span>{viewModeLabel}</span>
                  </div>
                  <p className="text-xs text-gray-900 dark:text-gray-100 mt-1">{evento.visualizacao_data_formatada}</p>
                </div>
              </div>
            </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}