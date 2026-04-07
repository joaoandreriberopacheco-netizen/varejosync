import React from 'react';
import { CalendarRange, Link2, Package2, Waves } from 'lucide-react';

export default function LogisticaSandboxSidebar({ evento }) {
  if (!evento) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm p-5 text-sm text-gray-500 dark:text-gray-400">
        Selecione uma embarcação para ver a previsão, capacidade e chave de conexão futura.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm p-5 space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400">Selecionado</p>
        <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100 font-glacial">{evento.embarcacao_nome}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{evento.rota_nome}</p>
      </div>
      <div className="grid gap-3">
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><CalendarRange className="w-4 h-4" /> Cronologia</div>
          <div className="mt-2 text-sm text-gray-900 dark:text-gray-100">Saída Manaus: {evento.data_saida_manaus_formatada || '-'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">ETA destino: {evento.data_chegada_destino_formatada || evento.previsao_chegada || '-'}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Retorno origem: {evento.data_retorno_origem_formatada || evento.previsao_retorno || '-'}</div>
        </div>
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Package2 className="w-4 h-4" /> Ocupação</div>
          <div className="mt-2 text-sm text-gray-900 dark:text-gray-100">{evento.ocupacao_percentual || 0}% da capacidade</div>
        </div>
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Waves className="w-4 h-4" /> Status</div>
          <div className="mt-2 text-sm text-gray-900 dark:text-gray-100">{evento.status_operacao}</div>
        </div>
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Link2 className="w-4 h-4" /> Chave</div>
          <div className="mt-2 text-sm text-gray-900 dark:text-gray-100 break-all">{evento.chave_relacional_futura || 'evento_logistico_id'}</div>
        </div>
      </div>
    </div>
  );
}