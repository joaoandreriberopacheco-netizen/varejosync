import React from 'react';
import { Anchor, CalendarClock, Waves, FileText, CalendarDays, Package2, Phone, User, DollarSign, ChevronRight } from 'lucide-react';
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

function ItinerarioEditorCard({ item }) {
  const styles = {
    passada: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    atual: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    futura: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  };

  return (
    <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.etapa}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.data}</p>
      </div>
      <Badge className={`border-0 shadow-none ${styles[item.tipo] || styles.passada}`}>{item.tipo}</Badge>
    </div>
  );
}

function HistoricoStatusIcon({ status }) {
  const colorMap = {
    vinculado: 'text-yellow-500 ring-yellow-400/60',
    atrasado: 'text-red-500 ring-red-400/60',
    pago: 'text-emerald-500 ring-emerald-400/60',
  };

  return (
    <div className={`w-10 h-10 rounded-full bg-white dark:bg-gray-900 shadow-sm flex items-center justify-center ring-2 ${colorMap[status] || 'text-gray-500 ring-gray-300'}`}>
      <DollarSign className="w-4 h-4" />
    </div>
  );
}

function HistoricoCard({ evento }) {
  return (
    <button type="button" className="w-full rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm text-left">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{evento.titulo}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{evento.codigo} · {evento.data}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="border-0 shadow-none bg-white text-gray-700 dark:bg-gray-900 dark:text-gray-200">{evento.cargas} carga(s)</Badge>
            <Badge className="border-0 shadow-none bg-white text-gray-700 dark:bg-gray-900 dark:text-gray-200">{evento.freteValor}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <HistoricoStatusIcon status={evento.financeiroStatus} />
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </button>
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
            <Tabs defaultValue="cadastro" className="space-y-4">
              <TabsList className="w-full h-auto rounded-2xl bg-gray-100 dark:bg-gray-800 p-1 grid grid-cols-3">
                <TabsTrigger value="cadastro" className="rounded-2xl text-xs">Cadastro</TabsTrigger>
                <TabsTrigger value="timeline" className="rounded-2xl text-xs">Timeline</TabsTrigger>
                <TabsTrigger value="historico" className="rounded-2xl text-xs">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="mt-0">
                <div className="space-y-1 pr-1">
                  {transportadora.timeline.map((item) => (
                    <BoatTimelineItem key={`${item.label}-${item.data}`} item={item} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="cadastro" className="mt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2"><FileText className="w-4 h-4" /> Transportadora</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{transportadora.nome}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2"><Waves className="w-4 h-4" /> Status</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{transportadora.status === 'ativa' ? 'Ativa' : 'Inativa'}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2"><User className="w-4 h-4" /> Contato</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{transportadora.contato}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2"><Phone className="w-4 h-4" /> Telefone</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{transportadora.telefone}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 shadow-sm md:col-span-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2"><CalendarClock className="w-4 h-4" /> Itinerário base</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{transportadora.recorrencia}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Controle de itinerário</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ajuste visual de eventos atuais, futuros e passados.</p>
                  </div>
                  {transportadora.itinerario_real.map((item) => (
                    <ItinerarioEditorCard key={item.id} item={item} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="historico" className="mt-0">
                <div className="space-y-3">
                  {transportadora.eventos.map((evento) => (
                    <HistoricoCard key={evento.id} evento={evento} />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}