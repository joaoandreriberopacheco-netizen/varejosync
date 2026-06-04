import React from 'react';
import { CalendarRange, Package2, ShipWheel, Waves } from 'lucide-react';
import EventoEmbarquesPanel from '@/components/logistica-sandbox/EventoEmbarquesPanel';

export default function TimelineSidebarCard({ evento }) {
  if (!evento) {
    return (
      <div className="bg-card rounded-3xl p-5 shadow-sm text-sm text-muted-foreground">
        Selecione um evento da timeline para ver os detalhes.
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl p-5 shadow-sm space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Selecionado</p>
        <h3 className="mt-1 text-lg font-semibold text-foreground dark:text-gray-100 font-glacial">{evento.transportadora_nome || evento.embarcacao_nome}</h3>
        <p className="text-sm text-muted-foreground">Viagem {evento.codigo || 'Sem código'}</p>
      </div>
      <div className="rounded-2xl bg-muted/40 dark:bg-muted p-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarRange className="w-4 h-4" /> Cabeçalho da viagem</div>
        <div className="mt-2 text-sm text-foreground dark:text-gray-100 flex items-center gap-2"><ShipWheel className="w-4 h-4" /> ETA: {evento.data_chegada_destino_formatada || '-'}</div>
        <div className="text-xs text-muted-foreground mt-1">Código: {evento.codigo || '-'}</div>
        <div className="mt-2 text-sm text-foreground dark:text-gray-100">Chegada em Manaus: {evento.data_chegada_manaus_formatada || '-'}</div>
        <div className="text-xs text-muted-foreground mt-1">Saída de Manaus: {evento.data_saida_manaus_formatada || '-'}</div>
        <div className="text-xs text-muted-foreground">Chegada em Tabatinga (ETA): {evento.data_chegada_destino_formatada || '-'}</div>
        <div className="text-xs text-muted-foreground">Próxima chegada em Manaus: {evento.proxima_chegada_manaus_formatada || '-'}</div>
      </div>
      <div className="rounded-2xl bg-muted/40 dark:bg-muted p-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Package2 className="w-4 h-4" /> Ocupação projetada</div>
        <div className="mt-2 text-sm text-foreground dark:text-gray-100">{evento.ocupacao_percentual_dinamica || 0}% da capacidade</div>
        <p className="mt-1 text-xs text-muted-foreground">A contagem sobe em 7 partes iguais entre a chegada em Manaus e a saída, e reinicia no próximo ciclo.</p>
      </div>
      <div className="rounded-2xl bg-muted/40 dark:bg-muted p-3 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Waves className="w-4 h-4" /> Embarques vinculados</div>
        <p className="text-xs text-muted-foreground">
          {(evento.embarques_relacionados || []).length > 0
            ? `Esta viagem possui ${(evento.embarques_relacionados || []).length} pedido(s) vinculado(s).`
            : 'Esta viagem não possui pedidos vinculados.'}
        </p>
        <EventoEmbarquesPanel embarques={evento.embarques_relacionados || []} />
      </div>
    </div>
  );
}