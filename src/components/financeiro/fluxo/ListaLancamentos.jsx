import React, { useState } from 'react';
import { formatarDataCurta } from '@/components/utils/dateUtils';
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, AlertCircle, ChevronRight, Clock, Scale, X } from 'lucide-react';
import {
  P38MobileLine,
  P38MobileLineList,
  P38StatusLabel,
  p38StatusTone,
  p38AccentKeyFromTone,
} from '@/components/ui/p38-mobile-line';

const R = (v) => `R$ ${(Math.round((v || 0) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function lancStatusTone(status) {
  if (status === 'Vencido') return 'danger';
  if (status === 'Em Aberto') return 'warning';
  if (status === 'Cancelado') return 'muted';
  return p38StatusTone(status);
}

function LancRow({ l, onClick, striped }) {
  const isR = l.tipo === 'Receita';
  const isT = l.tipo === 'Transferência';
  const pago = l.status === 'Pago';
  const cancelado = l.status === 'Cancelado';
  const conc = l.status_conciliacao || 'N/A';
  const data = l.data_pagamento || l.data_vencimento;
  const showMeta = !!(
    l.categoria ||
    (l.status && l.status !== 'Pago') ||
    cancelado ||
    l.is_recorrente ||
    ((l.tags || []).length > 0)
  );

  const accent = cancelado
    ? 'muted'
    : isT
      ? 'muted'
      : isR
        ? 'success'
        : 'danger';

  const valueNode = cancelado ? (
    '—'
  ) : isT ? (
    R(Math.abs(l.valor || 0))
  ) : (
    <>
      <span className={isR ? 'text-[#4A5D23] dark:text-[#a4ce33]' : 'text-red-600 dark:text-red-400'}>
        {isR ? '+' : '−'}
      </span>
      {R(Math.abs(l.valor || 0))}
    </>
  );

  return (
    <P38MobileLine
      as="button"
      type="button"
      striped={striped}
      accent={p38AccentKeyFromTone(accent)}
      onClick={() => onClick(l)}
      className={`w-full text-left ${cancelado ? 'opacity-60' : ''}`}
      title={<span className={cancelado ? 'line-through' : undefined}>{l.descricao}</span>}
      subtitle={
        <>
          {data ? formatarDataCurta(data) : '—'}
          {l.conta_financeira_nome ? ` · ${l.conta_financeira_nome}` : ''}
        </>
      }
      meta={
        showMeta ? (
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
        ) : null
      }
      value={valueNode}
      trailing={
        <>
          {conc === 'Pendente' && <Clock className="w-2.5 h-2.5 text-muted-foreground" />}
          {conc === 'Discrepância' && <AlertCircle className="w-2.5 h-2.5 text-muted-foreground" />}
        </>
      }
    />
  );
}

function Grupo({ label, items, totais, onRow }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="w-full min-w-0">
      <button type="button" onClick={() => setOpen(o => !o)} className="group flex w-full min-w-0 items-center justify-between gap-2 px-1 py-1.5">
        <p className="min-w-0 flex-1 truncate text-left text-[0.62rem] font-semibold uppercase tracking-wide text-muted-foreground sm:tracking-widest">{label}</p>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {totais.r > 0 && <span className="text-[0.62rem] text-muted-foreground font-medium">+{R(totais.r)}</span>}
          {totais.d > 0 && <span className="text-[0.62rem] text-muted-foreground font-medium">−{R(totais.d)}</span>}
          <span className={`text-[0.62rem] font-bold ${(totais.r || 0) - (totais.d || 0) >= 0 ? 'text-[#4A5D23] dark:text-[#a4ce33]' : 'text-red-500 dark:text-red-400'}`}>
            {(totais.r || 0) - (totais.d || 0) >= 0 ? '+' : '−'}{R(Math.abs((totais.r || 0) - (totais.d || 0)))}
          </span>
          <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
      </button>
      {open && (
        <P38MobileLineList>
          {items.map((l, index) => (
            <LancRow key={l.id} l={l} onClick={onRow} striped={index % 2 === 1} />
          ))}
        </P38MobileLineList>
      )}
    </div>
  );
}

export default function ListaLancamentos({ grupos, loading, onRow }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (grupos.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl py-16 flex flex-col items-center gap-2">
        <Scale className="w-9 h-9 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nenhum lançamento encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full max-w-full space-y-3 overflow-x-hidden">
      {grupos.map(({ k, label, items, totais }) => (
        <Grupo key={k} label={label} items={items} totais={totais} onRow={onRow} />
      ))}
    </div>
  );
}
