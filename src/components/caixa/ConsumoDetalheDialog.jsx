import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Calendar, UserRound, MapPin, Package, Paperclip, ExternalLink, Link as LinkIcon, Building2, X } from 'lucide-react';

const formatCurrency = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function Info({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[24px] bg-gray-50 p-4 shadow-sm dark:bg-gray-800">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <Icon className="h-3.5 w-3.5" />{label}
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{value || '—'}</p>
    </div>
  );
}

export default function ConsumoDetalheDialog({ open, onOpenChange, consumo, anexos = [] }) {
  if (!open || !consumo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-0 bg-white p-0 shadow-2xl dark:bg-gray-900">
        <div className="relative flex max-h-[88vh] flex-col overflow-hidden rounded-[32px]">
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Detalhes completos da operação.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Info icon={MapPin} label="Destinação" value={consumo.destinacao} />
              <Info icon={Building2} label="Interveniente" value={consumo.interveniente_nome || consumo.interveniente || '—'} />
              <Info icon={UserRound} label="Recebeu" value={consumo.responsavel_recebimento} />
              <Info icon={UserRound} label="Registrado por" value={consumo.usuario_solicitante_nome || consumo.created_by} />
              <Info icon={Calendar} label="Confirmado em" value={consumo.data_confirmacao ? new Date(consumo.data_confirmacao).toLocaleString('pt-BR') : '—'} />
              <Info icon={Package} label="Total" value={formatCurrency(consumo.valor_total)} />
            </div>

            <div className="rounded-[24px] bg-gray-50 p-4 shadow-sm dark:bg-gray-800">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Itens</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{(consumo.itens || []).length}</p>
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

            <div className="rounded-[24px] bg-gray-50 p-4 shadow-sm dark:bg-gray-800">
              <div className="mb-3 flex items-center justify-between">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><Paperclip className="h-4 w-4" />Anexos</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{anexos.length}</p>
              </div>
              <div className="space-y-2">
                {anexos.length === 0 ? (
                  <div className="rounded-2xl bg-white px-3 py-3 text-sm text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400">
                    Nenhum anexo salvo.
                  </div>
                ) : anexos.map((anexo) => (
                  <a
                    key={anexo.id}
                    href={anexo.url_drive}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-2xl bg-white px-3 py-3 shadow-sm transition-colors hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-950"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{anexo.nome_arquivo || 'Anexo'}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{anexo.descricao || anexo.tipo_documento || 'Arquivo salvo'}</p>
                      <p className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[11px] text-gray-400 dark:text-gray-500">
                        <LinkIcon className="h-3 w-3 flex-shrink-0" />
                        {anexo.url_drive || 'Link indisponível'}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}