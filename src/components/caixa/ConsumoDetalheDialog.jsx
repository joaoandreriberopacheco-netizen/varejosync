import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Calendar, UserRound, MapPin, Package, Paperclip, ExternalLink, Link as LinkIcon, Building2, X } from 'lucide-react';

const formatCurrency = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function Info({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[24px] bg-muted/40 p-4 shadow-sm dark:bg-muted">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />{label}
      </div>
      <p className="text-sm font-medium text-foreground">{value || '—'}</p>
    </div>
  );
}

export default function ConsumoDetalheDialog({ open, onOpenChange, consumo, anexos = [] }) {
  if (!open || !consumo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-0 bg-card p-0 shadow-2xl dark:bg-background">
        <div className="relative flex max-h-[88vh] flex-col overflow-hidden rounded-[32px]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-sm dark:bg-muted dark:text-foreground/90"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 md:p-6">
            <div>
              <p className="text-lg font-semibold text-foreground">{consumo.numero || 'Consumo Interno'}</p>
              <p className="text-sm text-muted-foreground">Detalhes completos da operação.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Info icon={MapPin} label="Destinação" value={consumo.destinacao} />
              <Info icon={Building2} label="Interveniente" value={consumo.interveniente_nome || consumo.interveniente || '—'} />
              <Info icon={UserRound} label="Recebeu" value={consumo.responsavel_recebimento} />
              <Info icon={UserRound} label="Registrado por" value={consumo.usuario_solicitante_nome || consumo.created_by} />
              <Info icon={Calendar} label="Confirmado em" value={consumo.data_confirmacao ? new Date(consumo.data_confirmacao).toLocaleString('pt-BR') : '—'} />
              <Info icon={Package} label="Total" value={formatCurrency(consumo.valor_total)} />
            </div>

            <div className="rounded-[24px] bg-muted/40 p-4 shadow-sm dark:bg-muted">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Itens</p>
                <p className="text-sm text-muted-foreground">{(consumo.itens || []).length}</p>
              </div>
              <div className="space-y-2">
                {(consumo.itens || []).map((item, index) => (
                  <div key={index} className="flex items-center justify-between rounded-2xl bg-card px-3 py-2 shadow-sm dark:bg-background">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.produto_nome}</p>
                      <p className="text-xs text-muted-foreground">{item.quantidade} {item.unidade_medida || 'UN'}</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground/90">{formatCurrency(item.subtotal)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] bg-muted/40 p-4 shadow-sm dark:bg-muted">
              <div className="mb-3 flex items-center justify-between">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground"><Paperclip className="h-4 w-4" />Anexos</p>
                <p className="text-sm text-muted-foreground">{anexos.length}</p>
              </div>
              <div className="space-y-2">
                {anexos.length === 0 ? (
                  <div className="rounded-2xl bg-card px-3 py-3 text-sm text-muted-foreground shadow-sm dark:bg-background dark:text-muted-foreground">
                    Nenhum anexo salvo.
                  </div>
                ) : anexos.map((anexo) => (
                  <a
                    key={anexo.id}
                    href={anexo.url_drive}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-2xl bg-card px-3 py-3 shadow-sm transition-colors hover:bg-muted dark:bg-muted dark:hover:bg-background"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{anexo.nome_arquivo || 'Anexo'}</p>
                      <p className="truncate text-xs text-muted-foreground">{anexo.descricao || anexo.tipo_documento || 'Arquivo salvo'}</p>
                      <p className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[11px] text-muted-foreground">
                        <LinkIcon className="h-3 w-3 flex-shrink-0" />
                        {anexo.url_drive || 'Link indisponível'}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
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