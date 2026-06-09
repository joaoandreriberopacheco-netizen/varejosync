import React from 'react';
import { formatarDataCurta } from '@/components/utils/dateUtils';
import { AlertCircle, Clock, Scale } from 'lucide-react';
import {
  P38MobileLine,
  P38StatusLabel,
  p38StatusTone,
  p38AccentKeyFromTone,
} from '@/components/ui/p38-mobile-line';
import { FinanceiroGrupo, FinanceiroListaEstado, formatFinanceiroValor } from './FinanceiroListaShared';

function lancStatusTone(status) {
  if (status === 'Vencido') return 'danger';
  if (status === 'Em Aberto') return 'warning';
  if (status === 'Cancelado') return 'muted';
  return p38StatusTone(status);
}

const LINE_TITLE_CLASS =
  '[&>div>div:first-child]:text-[15px] [&>div>div:first-child]:font-semibold sm:[&>div>div:first-child]:text-base';

function LancRow({ l, onClick, striped }) {
  const isR = l.tipo === 'Receita';
  const isT = l.tipo === 'Transferência';
  const cancelado = l.status === 'Cancelado';
  const conc = l.status_conciliacao || 'N/A';
  const data = l.data_pagamento || l.data_vencimento;

  const accent = cancelado ? 'muted' : isT ? 'muted' : isR ? 'success' : 'danger';

  const valueNode = cancelado ? (
    '—'
  ) : isT ? (
    formatFinanceiroValor(Math.abs(l.valor || 0))
  ) : (
    <>
      <span
        className={
          isR
            ? 'text-[#4A5D23] dark:text-[#a4ce33]'
            : l.status === 'Vencido'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-foreground/85'
        }
      >
        {isR ? '+' : '−'}
      </span>
      {formatFinanceiroValor(Math.abs(l.valor || 0))}
    </>
  );

  return (
    <P38MobileLine
      as="button"
      type="button"
      thinAccent
      striped={striped}
      accent={p38AccentKeyFromTone(accent)}
      onClick={() => onClick(l)}
      className={`w-full text-left ${LINE_TITLE_CLASS} [&>div:last-child]:max-w-[46%] [&>div:first-child]:min-w-0 ${cancelado ? 'opacity-60' : ''}`}
      title={<span className={cancelado ? 'line-through' : undefined}>{l.descricao}</span>}
      subtitle={
        <>
          {data ? formatarDataCurta(data) : '—'}
          {l.conta_financeira_nome ? ` · ${l.conta_financeira_nome}` : ''}
        </>
      }
      meta={
        <>
          {l.categoria && <span>{l.categoria}</span>}
          {l.status && l.status !== 'Pago' && (
            <P38StatusLabel tone={lancStatusTone(l.status)}>{l.status}</P38StatusLabel>
          )}
          {cancelado && <P38StatusLabel tone="muted">Cancelado</P38StatusLabel>}
          {l.is_recorrente && (
            <span>
              {l.frequencia_recorrencia === 'Parcelado'
                ? `${l.parcela_atual}/${l.numero_parcelas_total}`
                : l.frequencia_recorrencia}
            </span>
          )}
          {(l.tags || []).slice(0, 2).map((t) => (
            <span key={t}>{t}</span>
          ))}
        </>
      }
      value={valueNode}
      trailing={
        <>
          {conc === 'Pendente' && <Clock className="h-2.5 w-2.5 text-muted-foreground" />}
          {conc === 'Discrepância' && <AlertCircle className="h-2.5 w-2.5 text-muted-foreground" />}
        </>
      }
    />
  );
}

export default function ListaLancamentos({ grupos, loading, onRow }) {
  return (
    <FinanceiroListaEstado
      loading={loading}
      vazio={!loading && grupos.length === 0}
      vazioMensagem="Nenhum lançamento encontrado"
      vazioIcon={Scale}
    >
      {grupos.map(({ k, label, items, totais }) => (
        <FinanceiroGrupo key={k} label={label} receitas={totais.r} despesas={totais.d}>
          {items.map((l, index) => (
            <LancRow key={l.id} l={l} onClick={onRow} striped={index % 2 === 1} />
          ))}
        </FinanceiroGrupo>
      ))}
    </FinanceiroListaEstado>
  );
}
