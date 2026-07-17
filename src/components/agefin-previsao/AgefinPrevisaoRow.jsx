import React from 'react';
import {
  P38MobileLine,
  P38StatusLabel,
  p38AccentKeyFromTone,
} from '@/components/ui/p38-mobile-line';
import { formatFinanceiroValor } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import {
  formatCicloAgefinCompetencia,
  isCompetenciaPlanejamento,
  statusCompetenciaEfetivo,
  tagFrequenciaSerie,
  valorEfetivoCompetencia,
  SITUACAO_SERIE,
} from '@/lib/agefinPrevisaoCalculos';

const LINE_TITLE_CLASS =
  '[&>div>div:first-child]:text-[15px] [&>div>div:first-child]:font-semibold sm:[&>div>div:first-child]:text-base';

function rowAccent(competencia, modelo) {
  if (isCompetenciaPlanejamento(competencia)) return 'info';
  if (competencia.origem_boleto === 'pdf') return 'success';
  if ((modelo?.situacao || '') === SITUACAO_SERIE.ENCERRADA) return 'muted';
  return 'warning';
}

const ORIGEM_LABELS = {
  pdf: 'Boleto PDF',
  auto: 'Previsto auto',
};

export default function AgefinPrevisaoRow({ competencia, modelo, onClick, striped }) {
  const valor = valorEfetivoCompetencia(competencia, modelo);
  const statusEfetivo = statusCompetenciaEfetivo(competencia);
  const planejamento = isCompetenciaPlanejamento(competencia);
  const dia = modelo?.dia_vencimento || competencia.dia_vencimento || 10;
  const tagFreq = tagFrequenciaSerie(modelo || competencia);

  const meta = (
    <>
      {competencia.terceiro_nome && <span>{competencia.terceiro_nome}</span>}
      {tagFreq && <P38StatusLabel tone="muted">{tagFreq}</P38StatusLabel>}
      {planejamento ? (
        <P38StatusLabel tone="info">Planejamento</P38StatusLabel>
      ) : (
        <P38StatusLabel tone={statusEfetivo === 'fechado' ? 'success' : 'warning'}>
          {statusEfetivo === 'fechado' ? 'Fechada' : 'Em aberto'}
        </P38StatusLabel>
      )}
      {competencia.origem_boleto && (
        <P38StatusLabel tone={competencia.origem_boleto === 'pdf' ? 'success' : 'muted'}>
          {ORIGEM_LABELS[competencia.origem_boleto] || competencia.origem_boleto}
        </P38StatusLabel>
      )}
      {modelo?.centro_custo && <span>CC {modelo.centro_custo}</span>}
    </>
  );

  return (
    <P38MobileLine
      as="button"
      type="button"
      thinAccent
      striped={striped}
      accent={p38AccentKeyFromTone(rowAccent(competencia, modelo))}
      onClick={() => onClick?.(competencia)}
      className={`w-full text-left ${LINE_TITLE_CLASS} max-md:!py-3.5 max-md:min-h-[58px] ${planejamento ? 'opacity-95' : ''}`}
      title={competencia.serie_nome}
      subtitle={formatCicloAgefinCompetencia(competencia.competencia, dia)}
      meta={meta}
      value={
        <>
          <span className="text-foreground/85">−</span>
          {formatFinanceiroValor(valor)}
        </>
      }
    />
  );
}
