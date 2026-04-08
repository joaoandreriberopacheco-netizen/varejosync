import React from 'react';
import { CalendarClock, ShipWheel } from 'lucide-react';
import { getLinkedIndicatorStyle } from '@/components/logistica-sandbox/fluvialDataUtils';

export default function TimelineDayGroup({ label, dayNumber, eventos = [], isToday = false, onSelect, viewModeLabel, selectedEventoId = null }) {
  return (
    <div className="relative pl-12">
      <div className="absolute left-[18px] top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
      <div className={`absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-2xl shadow-sm text-sm font-semibold ${
        isToday 
          ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500 dark:ring-emerald-400' 
          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'
      }`}>
        {dayNumber}
      </div>
      <div className="pb-6">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-glacial">{label}</p>
          {isToday && <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">Hoje</span>}
        </div>
        <div className="space-y-2">
          {!eventos.length && isToday ? (
            <div className="rounded-2xl bg-white/70 px-4 py-3 text-xs text-gray-500 shadow-sm dark:bg-gray-800/70 dark:text-gray-400">
              Nenhuma viagem neste dia.
            </div>
          ) : null}
          {eventos.map((evento) => {
            const isSelected = selectedEventoId === evento.id;
            const comprasAtivas = evento.total_embarques_ativos || 0;
            const comprasConcluidas = evento.total_embarques_concluidos || 0;
            const totalCompras = (evento.embarques_relacionados || []).length;

            return (
            <button
              key={evento.id}
              onClick={() => onSelect(evento)}
              className={`relative w-full text-left rounded-2xl bg-white dark:bg-gray-800 px-4 py-4 shadow-sm transition-all ${isSelected ? 'ring-2 ring-gray-300 dark:ring-gray-500 shadow-md' : 'ring-1 ring-transparent hover:ring-gray-200 dark:hover:ring-gray-700'}`}
            >
              {(comprasAtivas > 0 || comprasConcluidas > 0) ? (
                <div className="absolute -right-1 -top-1 flex items-center gap-1">
                  {comprasConcluidas > 0 ? <div className={`min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-bold flex items-center justify-center shadow-sm ${getLinkedIndicatorStyle('finalizado').badge}`}>{comprasConcluidas}</div> : null}
                  {comprasAtivas > 0 ? <div className={`min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-bold flex items-center justify-center shadow-sm ${getLinkedIndicatorStyle('ativo').badge}`}>{comprasAtivas}</div> : null}
                </div>
              ) : null}
              <div className="space-y-2 pr-4">
                <div className="flex items-start gap-2 min-w-0">
                  <ShipWheel className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
                  <span className="text-sm leading-snug text-gray-900 dark:text-gray-100 font-medium break-words">{evento.embarcacao_nome}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400">
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
                    <p className="mt-1 text-xs text-gray-900 dark:text-gray-100">{evento.visualizacao_data_formatada}</p>
                  </div>
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