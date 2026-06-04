import React, { useState } from 'react';
import { Anchor, CalendarClock, ChevronDown, Waves, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function StatusBadge({ status }) {
  const classes = status === 'ativa'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    : 'bg-muted text-foreground/90 dark:bg-muted dark:text-foreground/90';

  return <Badge className={`border-0 shadow-none ${classes}`}>{status === 'ativa' ? 'Ativa' : 'Inativa'}</Badge>;
}

function FreteBadge({ status }) {
  const map = {
    'Pago': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    'Em aberto': 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };
  return <Badge className={`border-0 shadow-none ${map[status] || 'bg-muted text-foreground/90'}`}>{status}</Badge>;
}

export default function BoatExpandedCard({ transportadora }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-3xl bg-card shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full p-4 md:p-5 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center shadow-sm flex-shrink-0">
              <Anchor className="w-5 h-5 text-foreground/90" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground dark:text-foreground font-glacial truncate">{transportadora.nome}</h3>
              <p className="text-sm text-muted-foreground truncate">Próximo ETA: {transportadora.proximo_eta}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={transportadora.status} />
            <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center shadow-sm">
              <ChevronDown className={`w-4 h-4 text-foreground/90 transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 md:px-5 md:pb-5">
          <Tabs defaultValue="timeline" className="space-y-4">
            <TabsList className="w-full h-auto rounded-2xl bg-muted p-1 grid grid-cols-3">
              <TabsTrigger value="timeline" className="rounded-2xl text-xs">Timeline</TabsTrigger>
              <TabsTrigger value="fretes" className="rounded-2xl text-xs">Fretes</TabsTrigger>
              <TabsTrigger value="cadastro" className="rounded-2xl text-xs">Cadastro</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-0">
              <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
                {transportadora.timeline.map((item) => (
                  <div key={item.label} className="snap-start min-w-[220px] rounded-2xl bg-muted/40 dark:bg-muted p-4 shadow-sm">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-lg font-semibold text-foreground dark:text-foreground">{item.data}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="fretes" className="mt-0">
              <div className="space-y-2">
                {transportadora.fretes.map((frete) => (
                  <div key={frete.id} className="rounded-2xl bg-muted/40 dark:bg-muted p-3 shadow-sm flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground dark:text-foreground">{frete.periodo}</p>
                      <p className="text-xs text-muted-foreground">{frete.valor}</p>
                    </div>
                    <FreteBadge status={frete.status} />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="cadastro" className="mt-0">
              <div className="space-y-2">
                <div className="rounded-2xl bg-muted/40 dark:bg-muted p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><FileText className="w-4 h-4" /> Nome</div>
                  <p className="text-sm font-medium text-foreground dark:text-foreground">{transportadora.nome}</p>
                </div>
                <div className="rounded-2xl bg-muted/40 dark:bg-muted p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><CalendarClock className="w-4 h-4" /> Recorrência</div>
                  <p className="text-sm font-medium text-foreground dark:text-foreground">{transportadora.recorrencia}</p>
                </div>
                <div className="rounded-2xl bg-muted/40 dark:bg-muted p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Waves className="w-4 h-4" /> Status</div>
                  <p className="text-sm font-medium text-foreground dark:text-foreground">{transportadora.status === 'ativa' ? 'Ativa' : 'Inativa'}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}