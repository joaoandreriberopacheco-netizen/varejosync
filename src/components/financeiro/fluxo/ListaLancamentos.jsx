import React, { useState } from 'react';
import { formatarDataCurta } from '@/components/utils/dateUtils';
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, AlertCircle, ChevronRight, Clock, Scale, X } from 'lucide-react';

const R = (v) => `R$ ${(Math.round((v || 0) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    'Vencido': 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400',
    'Em Aberto': 'bg-gray-100 dark:bg-gray-700 text-gray-400',
    'Pago': 'bg-gray-100 dark:bg-gray-700 text-gray-500',
    'Cancelado': 'bg-gray-100 dark:bg-gray-700 text-gray-300',
  };
  if (!status || status === 'Pago') return null;
  return (
    <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-md font-medium ${map[status] || ''}`}>
      {status}
    </span>
  );
}

// ─── Recorrência Badge ────────────────────────────────────────────────────────
function RecorrenciaBadge({ l }) {
  if (!l.is_recorrente) return null;
  const label = l.frequencia_recorrencia === 'Parcelado'
    ? `${l.parcela_atual}/${l.numero_parcelas_total}`
    : l.frequencia_recorrencia;
  return (
    <span className="text-[0.6rem] px-1.5 py-0.5 rounded-md font-medium bg-gray-100 dark:bg-gray-700 text-gray-400">
      {label}
    </span>
  );
}

// ─── Lançamento Row ───────────────────────────────────────────────────────────
function LancRow({ l, onClick }) {
  const isR = l.tipo === 'Receita';
  const isT = l.tipo === 'Transferência';
  const pago = l.status === 'Pago';
  const vencido = l.status === 'Vencido';
  const cancelado = l.status === 'Cancelado';
  const prev = !pago && !cancelado;
  const conc = l.status_conciliacao || 'N/A';
  const data = l.data_pagamento || l.data_vencimento;

  let icon, valColor;
  if (isT) {
    icon = <ArrowRightLeft className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />;
    valColor = 'text-gray-500 dark:text-gray-400';
  } else if (isR) {
    icon = <ArrowDownLeft className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />;
    valColor = 'text-gray-700 dark:text-gray-200';
  } else {
    icon = <ArrowUpRight className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />;
    valColor = 'text-gray-700 dark:text-gray-200';
  }

  if (cancelado) {
    icon = <X className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />;
    valColor = 'text-gray-400 dark:text-gray-500 line-through';
  }

  return (
    <button
      type="button"
      onClick={() => onClick(l)}
      className={`flex w-full min-w-0 max-w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-white/5 dark:active:bg-white/10 ${cancelado ? 'opacity-60' : ''}`}>
      <span className={`rounded-xl flex-none w-8 h-8 flex items-center justify-center ${cancelado ? 'bg-gray-100 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-700'}`}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className={`block text-[0.82rem] font-medium whitespace-normal break-words leading-snug ${cancelado ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-gray-100'}`}>
          {l.descricao}
        </span>
        <span className="flex items-center flex-wrap gap-1 mt-0.5">
          <span className="text-[0.68rem] text-gray-400 dark:text-gray-500">
            {data ? formatarDataCurta(data) : '—'}
            {l.conta_financeira_nome ? ` · ${l.conta_financeira_nome}` : ''}
          </span>
          {l.categoria && (
            <span className="text-[0.6rem] px-1.5 py-0.5 rounded-md font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              {l.categoria}
            </span>
          )}
          <StatusBadge status={l.status} />
          {cancelado && <span className="text-[0.6rem] px-1.5 py-0.5 rounded-md font-medium bg-gray-100 dark:bg-gray-700 text-gray-400">Cancelado</span>}
          <RecorrenciaBadge l={l} />
          {(l.tags || []).slice(0, 2).map(t => (
            <span key={t} className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-400">{t}</span>
          ))}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5 pl-1">
        <span className={`text-[0.82rem] font-bold tabular-nums whitespace-nowrap ${valColor}`}>
          {cancelado ? '—' : isT ? R(Math.abs(l.valor || 0)) : <><span className={isR ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}>{isR ? '+' : '−'}</span>{R(Math.abs(l.valor || 0))}</>}
        </span>
        {conc === 'Pendente' && <Clock className="w-2.5 h-2.5 text-gray-400" />}
        {conc === 'Discrepância' && <AlertCircle className="w-2.5 h-2.5 text-gray-500" />}
      </span>
    </button>
  );
}

// ─── Grupo por Data ───────────────────────────────────────────────────────────
function Grupo({ label, items, totais, onRow }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="w-full min-w-0">
      <button type="button" onClick={() => setOpen(o => !o)} className="group flex w-full min-w-0 items-center justify-between gap-2 px-1 py-1.5">
        <p className="min-w-0 flex-1 truncate text-left text-[0.62rem] font-semibold uppercase tracking-wide text-gray-400 sm:tracking-widest dark:text-gray-500">{label}</p>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {totais.r > 0 && <span className="text-[0.62rem] text-gray-500 dark:text-gray-400 font-medium">+{R(totais.r)}</span>}
          {totais.d > 0 && <span className="text-[0.62rem] text-gray-400 dark:text-gray-500 font-medium">−{R(totais.d)}</span>}
          <span className={`text-[0.62rem] font-bold ${(totais.r || 0) - (totais.d || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {(totais.r || 0) - (totais.d || 0) >= 0 ? '+' : '−'}{R(Math.abs((totais.r || 0) - (totais.d || 0)))}
          </span>
          <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-white/5">
          {items.map(l => <LancRow key={l.id} l={l} onClick={onRow} />)}
        </div>
      )}
    </div>
  );
}

// ─── Export Principal ─────────────────────────────────────────────────────────
export default function ListaLancamentos({ grupos, loading, onRow }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  if (grupos.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm py-16 flex flex-col items-center gap-2">
        <Scale className="w-9 h-9 text-gray-200 dark:text-gray-700" />
        <p className="text-sm text-gray-400">Nenhum lançamento encontrado</p>
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