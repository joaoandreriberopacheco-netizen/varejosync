import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Package2, Paperclip, Receipt, CircleDollarSign, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BoatTravelDossierDialog from '@/components/logistica-sandbox/BoatTravelDossierDialog';

function InfoBlock({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}

export default function BoatHistoryDetailsDialog({ open, onOpenChange, evento, transportadora, timeline }) {
  const [showDossier, setShowDossier] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setShowDossier(false);
    }
  }, [open]);

  if (!evento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl rounded-[28px] border-0 bg-white dark:bg-gray-900 p-0 overflow-hidden shadow-2xl">
        <div className="p-5 space-y-4">
          <DialogHeader className="text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-xl font-semibold font-glacial text-gray-900 dark:text-gray-100">{evento.titulo}</DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">{evento.codigo} · {evento.data}</p>
              </div>
              <Button type="button" variant="outline" onClick={() => setShowDossier(true)} className="rounded-2xl border-0 bg-gray-100 dark:bg-gray-800 shadow-sm">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir dossiê
              </Button>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoBlock icon={Package2} label="Embarques associados" value={`${evento.embarques?.length || 0} embarque(s)`} />
            <InfoBlock icon={Receipt} label="Valor do frete" value={evento.freteValor} />
            <InfoBlock icon={CircleDollarSign} label="Situação financeira" value={evento.pagamentoLabel} />
            <InfoBlock icon={Paperclip} label="Anexos envolvidos" value={`${evento.anexos?.length || 0} arquivo(s)`} />
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Embarques desta viagem</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Visualização resumida dos embarques relacionados.</p>
            </div>
            <div className="space-y-2">
              {(evento.embarques || []).map((embarque) => (
                <div key={embarque.id} className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{embarque.nome}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{embarque.resumo}</p>
                  </div>
                  <Badge className="border-0 shadow-none bg-white text-gray-700 dark:bg-gray-900 dark:text-gray-200">{embarque.status}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Anexos vinculados</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Itens apenas visuais para consulta rápida.</p>
            </div>
            <div className="space-y-2">
              {(evento.anexos || []).map((anexo) => (
                <div key={anexo.id} className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{anexo.nome}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{anexo.tipo}</p>
                  </div>
                  <Badge className="border-0 shadow-none bg-white text-gray-700 dark:bg-gray-900 dark:text-gray-200">Visual</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
      <BoatTravelDossierDialog
        open={showDossier}
        onOpenChange={setShowDossier}
        evento={evento}
        transportadora={transportadora}
        timeline={timeline}
      />
    </Dialog>
  );
}