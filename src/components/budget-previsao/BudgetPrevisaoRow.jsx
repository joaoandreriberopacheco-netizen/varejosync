import React from 'react';
import {
  P38MobileLine,
  P38StatusLabel,
  p38AccentKeyFromTone,
} from '@/components/ui/p38-mobile-line';
import { formatFinanceiroValor } from '@/components/financeiro/fluxo/FinanceiroListaShared';
import {
  STATUS_CONSUMO,
  STATUS_CONSUMO_LABELS,
  formatCompetenciaLabel,
} from '@/lib/budgetCalculos';

const LINE_TITLE_CLASS =
  '[&>div>div:first-child]:text-[15px] [&>div>div:first-child]:font-semibold sm:[&>div>div:first-child]:text-base';

function toneFromStatus(status) {
  if (status === STATUS_CONSUMO.ACIMA) return 'danger';
  if (status === STATUS_CONSUMO.ATENCAO) return 'warning';
  return 'success';
}

export default function BudgetPrevisaoRow({ visao, onClick, striped }) {
  if (!visao) return null;
  const { modelo, orcado, realizado, consumo, status, estimativaResumo, metaDiaria, realizadoHoje } = visao;
  const centro = String(modelo?.centro_custo || '').trim();

  const meta = (
    <>
      <span>{modelo?.categoria_nome || 'Sem categoria'}</span>
      <P38StatusLabel tone={toneFromStatus(status)}>
        {STATUS_CONSUMO_LABELS[status] || status}
      </P38StatusLabel>
      {centro ? <span>{centro}</span> : null}
      <span className="text-muted-foreground">{estimativaResumo}</span>
    </>
  );

  const showHoje = modelo?.modo_estimativa === 'por_dia' || modelo?.usa_dias_uteis;

  return (
    <P38MobileLine
      as="button"
      type="button"
      thinAccent
      striped={striped}
      accent={p38AccentKeyFromTone(toneFromStatus(status))}
      onClick={() => onClick?.(visao)}
      className={`w-full text-left ${LINE_TITLE_CLASS} max-md:!py-3.5 max-md:min-h-[58px]`}
      title={modelo?.nome}
      subtitle={formatCompetenciaLabel(visao.competencia)}
      meta={meta}
      value={
        <>
          <span className="text-muted-foreground text-xs block">Realizado</span>
          {formatFinanceiroValor(realizado)}
        </>
      }
      valueSub={
        <>
          <span className="text-foreground/70">
            Orçado {formatFinanceiroValor(orcado)} · {Math.round(consumo)}%
          </span>
          {showHoje && metaDiaria > 0 ? (
            <span className="text-muted-foreground">
              Hoje {formatFinanceiroValor(realizadoHoje)} / {formatFinanceiroValor(metaDiaria)}
            </span>
          ) : null}
        </>
      }
    />
  );
}
