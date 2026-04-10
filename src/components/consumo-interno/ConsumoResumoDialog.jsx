import React from 'react';
import { Calendar, UserRound, MapPin, X, Tags } from 'lucide-react';

const formatCurrency = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function ConsumoResumoDialog({ open, onOpenChange, consumo }) {
  if (!consumo) return null;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[205] flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center">
      <button type="button" aria-label="Fechar resumo" className="absolute inset-0" onClick={() => onOpenChange(false)} />
      <div className="relative z-10 flex h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl dark:bg-gray-900 md:h-auto md:max-h-[88vh] md:rounded-[32px]">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 md:p-6">
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{consumo.numero || 'Consumo Interno'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Rastreabilidade completa do consumo registrado.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Info icon={MapPin} label="Destinação" value={consumo.destinacao} />
            <Info icon={UserRound} label="Recebeu" value={consumo.responsavel_recebimento} />
            <Info icon={UserRound} label="Registrado por" value={consumo.usuario_solicitante_nome} />
            <Info icon={Calendar} label="Confirmado em" value={consumo.data_confirmacao ? new Date(consumo.data_confirmacao).toLocaleString('pt-BR') : '—'} />
            <Info icon={Tags} label="Tags" value={consumo.tags?.length ? consumo.tags.join(', ') : '—'} />
          </div>

          <div className="rounded-[24px] bg-gray-50 p-4 shadow-sm dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Itens</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(consumo.valor_total)}</p>
            </div>
            <div className="space-y-2">
              {(consumo.itens || []).map((item, index) => (
                <div key={index} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 shadow-sm dark:bg-gray-900">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.produto_nome}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.quantidade} {item.unidade_medida || 'UN'}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(item.subtotal)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: LucideIcon, label, value }) {
  return (
    <div className="rounded-[24px] bg-gray-50 p-4 shadow-sm dark:bg-gray-800">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <LucideIcon className="h-3.5 w-3.5" />{label}
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{value || '—'}</p>
    </div>
  );
}