import React from 'react';
import { CalendarRange, Package2, Waves } from 'lucide-react';
import EventoEmbarquesPanel from '@/components/logistica-sandbox/EventoEmbarquesPanel';

export default function TimelineSidebarCard({ evento }) {
  if (!evento) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm text-sm text-gray-500 dark:text-gray-400">
        Selecione um evento da timeline para ver os detalhes.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400">Selecionado</p>
        <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100 font-glacial">{evento.embarcacao_nome}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Viagem {evento.codigo || 'Sem código'}</p>
      </div>
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 p-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><CalendarRange className="w-4 h-4" /> Linha do tempo da viagem</div>
        <div className="mt-2 text-sm text-gray-900 dark:text-gray-100">Chegada em Manaus: {evento.data_chegada_manaus_formatada || '-'}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Saída de Manaus: {evento.data_saida_manaus_formatada || '-'}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Chegada em Tabatinga (ETA): {evento.data_chegada_destino_formatada || '-'}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Próxima chegada em Manaus: {evento.proxima_chegada_manaus_formatada || '-'}</div>
      </div>
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 p-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Package2 className="w-4 h-4" /> Ocupação projetada</div>
        <div className="mt-2 text-sm text-gray-900 dark:text-gray-100">{evento.ocupacao_percentual_dinamica || 0}% da capacidade</div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">A contagem sobe em 7 partes iguais entre a chegada em Manaus e a saída, e reinicia no próximo ciclo.</p>
      </div>
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 p-3 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Waves className="w-4 h-4" /> Embarques vinculados</div>
        <EventoEmbarquesPanel embarques={evento.embarques_relacionados || []} />
      </div>
    </div>
  );
}