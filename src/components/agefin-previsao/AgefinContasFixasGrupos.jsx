import React from 'react';
import { cn } from '@/lib/utils';
import { P38MobileLineList } from '@/components/ui/p38-mobile-line';
import AgefinPrevisaoModeloRow from '@/components/agefin-previsao/AgefinPrevisaoModeloRow';
import {
  DESCRICAO_FREQUENCIA_SERIE,
  ORDEM_FREQUENCIAS_CONTAS_FIXAS,
} from '@/lib/agefinPrevisaoCalculos';

function chaveDrop(frequencia, centroKey) {
  return `${frequencia}::${centroKey}`;
}

function BlocoCentro({
  dropKey,
  centroLabel,
  series,
  draggingSerieId,
  dropCentroAtual,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'rounded-xl border border-border/60 bg-card/40',
        dropCentroAtual === dropKey && draggingSerieId ? 'ring-2 ring-primary/50 border-primary/50' : '',
      )}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <div>
          <p className="text-xs font-semibold text-foreground">{centroLabel}</p>
          <p className="text-[11px] text-muted-foreground">{series.length} conta(s)</p>
        </div>
      </div>
      {series.length > 0 ? (
        <P38MobileLineList className="block md:!block rounded-none overflow-hidden">
          {series.map((s, idx) => (
            <div
              key={s.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', s.id);
                onDragStart(s.id);
              }}
              onDragEnd={onDragEnd}
            >
              <AgefinPrevisaoModeloRow
                modelo={s}
                striped={idx % 2 === 1}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          ))}
        </P38MobileLineList>
      ) : (
        <p className="px-3 py-4 text-xs text-muted-foreground">Arraste uma conta para este centro.</p>
      )}
    </div>
  );
}

export default function AgefinContasFixasGrupos({
  agrupamento,
  centrosRegistrados,
  draggingSerieId,
  dropCentroAtual,
  onDragStart,
  onDragEnd,
  onDropCentro,
  onHoverCentro,
  onLeaveCentro,
  onEdit,
  onDelete,
}) {
  const ordemCentros = [...centrosRegistrados, '__sem__'];

  const secoesComContas = ORDEM_FREQUENCIAS_CONTAS_FIXAS.filter((freq) => {
    const porCentro = agrupamento[freq] || {};
    return ordemCentros.some((c) => (porCentro[c || '__sem__'] || []).length > 0);
  });

  if (!secoesComContas.length) {
    return (
      <p className="text-xs text-muted-foreground px-1">
        Nenhuma conta fixa cadastrada. Use o botão + para criar e escolha a recorrência no formulário.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {secoesComContas.map((frequencia) => {
        const porCentro = agrupamento[frequencia] || {};
        const totalSecao = ordemCentros.reduce(
          (n, c) => n + (porCentro[c || '__sem__']?.length || 0),
          0,
        );

        return (
          <section key={frequencia} className="space-y-3">
            <div className="rounded-xl bg-muted/30 px-3 py-2.5 border border-border/40">
              <p className="text-sm font-semibold text-foreground">Recorrência {frequencia}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {DESCRICAO_FREQUENCIA_SERIE[frequencia]}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{totalSecao} conta(s)</p>
            </div>

            <div className="space-y-3">
              {ordemCentros.map((centro) => {
                const chave = centro || '__sem__';
                const series = porCentro[chave] || [];
                if (!series.length) return null;
                const centroLabel = chave === '__sem__' ? 'Sem centro de custo' : centro;
                const dropKey = chaveDrop(frequencia, chave);

                return (
                  <BlocoCentro
                    key={dropKey}
                    dropKey={dropKey}
                    centroLabel={centroLabel}
                    series={series}
                    draggingSerieId={draggingSerieId}
                    dropCentroAtual={dropCentroAtual}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggingSerieId) onHoverCentro(dropKey);
                    }}
                    onDragLeave={onLeaveCentro}
                    onDrop={(e) => {
                      e.preventDefault();
                      const serieId = e.dataTransfer.getData('text/plain');
                      onDropCentro(serieId, chave === '__sem__' ? '' : centro);
                    }}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
