import React from 'react';
import { CalendarClock, CheckCircle2, Clock3, Paperclip } from 'lucide-react';

export default function FreteStatusReport({ eventos = [] }) {
  if (!eventos.length) {
    return <div className="rounded-3xl bg-white dark:bg-gray-800 p-5 shadow-sm text-sm text-gray-500 dark:text-gray-400">Nenhum evento com frete no período selecionado.</div>;
  }

  return (
    <div className="space-y-3">
      {eventos.map((evento) => {
        const agendado = evento.conta_frete_status === 'Agendado' || evento.conta_frete_status === 'Pago';
        return (
          <div key={evento.id} className="rounded-3xl bg-white dark:bg-gray-800 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{evento.embarcacao_nome}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{evento.nome || evento.codigo}</p>
              </div>
              <div className={`text-xs px-2 py-1 rounded-full shadow-sm ${agendado ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                {evento.conta_frete_status || 'Não gerado'}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 px-3 py-2 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><CalendarClock className="w-3.5 h-3.5" /> ETA</div>
                <p className="mt-1 text-gray-900 dark:text-gray-100">{evento.data_chegada_destino_formatada || '-'}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 px-3 py-2 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">{agendado ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock3 className="w-3.5 h-3.5" />} Conta a pagar</div>
                <p className="mt-1 text-gray-900 dark:text-gray-100">{evento.conta_frete_titulo || 'Frete ainda não vinculado'}</p>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{evento.conta_frete_data || 'Sem data agendada'}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 px-3 py-2 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><Paperclip className="w-3.5 h-3.5" /> Anexo</div>
                <p className="mt-1 text-gray-900 dark:text-gray-100 break-all">{evento.anexo_frete_url || 'Sem anexo'}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}