import React from 'react';
import { Anchor, CalendarClock, Waves, FileText, CalendarDays, Package2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

function StatusBadge({ status }) {
  const classes = status === 'ativa'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';

  return <Badge className={`border-0 shadow-none ${classes}`}>{status === 'ativa' ? 'Ativa' : 'Inativa'}</Badge>;
}

function FreteBadge({ status }) {
  const map = {
    'Pago': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    'Em aberto': 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };
  return <Badge className={`border-0 shadow-none ${map[status] || 'bg-gray-100 text-gray-700'}`}>{status}</Badge>;
}

function BoatTimelineItem({ item }) {
  return (
    <div className="relative pl-14">
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
      <div className="absolute left-0 top-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-white dark:bg-gray-800 shadow-sm text-gray-700 dark:text-gray-200 text-xs font-semibold">
        {item.dayLabel}
      </div>
      <div className="pb-5">
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <CalendarDays className="w-3.5 h-3.5" />
                {item.label}
              </div>
              <p className="mt-2 text-base font-semibold text-gray-900 dark:text-gray-100">{item.data}</p>
            </div>
            <Badge className="border-0 shadow-none bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">{item.status}</Badge>
          </div>
          {item.hasLinked && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white dark:bg-gray-900 px-3 py-1.5 shadow-sm text-xs text-gray-600 dark:text-gray-300">
              <Package2 className="w-3.5 h-3.5" />
              {item.linkedCount} embarque{item.linkedCount > 1 ? 's' : ''} vinculado{item.linkedCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BoatDetailsDialog({ open, onOpenChange, transportadora }) {
  if (!transportadora) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-5xl h-[90vh] p-0 overflow-hidden rounded-[28px] border-0 bg-white dark:bg-gray-900 shadow-2xl sm:rounded-[28px]">
        <div className="flex h-full min-h-0 flex-col relative">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800 text-left">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center shadow-sm flex-shrink-0">
                  <Anchor className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 font-glacial truncate">{transportadora.nome}</DialogTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Próximo ETA: {transportadora.proximo_eta}</p>
                </div>
              </div>
              <StatusBadge status={transportadora.status} />
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <Tabs defaultValue="timeline" className="space-y-4">
              <TabsList className="w-full h-auto rounded-2xl bg-gray-100 dark:bg-gray-800 p-1 grid grid-cols-3">
                <TabsTrigger value="timeline" className="rounded-2xl text-xs">Timeline</TabsTrigger>
                <TabsTrigger value="fretes" className="rounded-2xl text-xs">Fretes</TabsTrigger>
                <TabsTrigger value="cadastro" className="rounded-2xl text-xs">Cadastro</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="mt-0">
                <div className="space-y-1 pr-1">
                  {transportadora.timeline.map((item) => (
                    <BoatTimelineItem key={`${item.label}-${item.data}`} item={item} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="fretes" className="mt-0">
                <div className="space-y-3">
                  {transportadora.fretes.map((frete) => (
                    <div key={frete.id} className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{frete.periodo}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{frete.valor}</p>
                      </div>
                      <FreteBadge status={frete.status} />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="cadastro" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2"><FileText className="w-4 h-4" /> Nome</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{transportadora.nome}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2"><CalendarClock className="w-4 h-4" /> Recorrência</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{transportadora.recorrencia}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm md:col-span-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2"><Waves className="w-4 h-4" /> Status</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{transportadora.status === 'ativa' ? 'Ativa' : 'Inativa'}</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}