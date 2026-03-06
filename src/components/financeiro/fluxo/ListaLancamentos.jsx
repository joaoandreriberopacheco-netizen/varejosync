import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowDownLeft, ArrowUpRight, ArrowRightLeft,
  Clock, AlertCircle, ChevronRight, Scale, RefreshCw
} from 'lucide-react';

const R = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

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
  const prev = !pago && l.status !== 'Cancelado';
  const conc = l.status_conciliacao || 'N/A';
  const data = l.data_pagamento || l.data_vencimento;

  let icon, valColor;
  if (isT) {
    icon = <ArrowRightLeft className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />;
    valColor = 'text-gray-500 dark:text-gray-400';
  } else if (isR) {
    icon = <ArrowDownLeft className={`w-3.5 h-3.5 ${pago ? 'text-green-500' : 'text-gray-400'}`} />;
    valColor = pago ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500';
  } else {
    icon = <ArrowUpRight className={`w-3.5 h-3.5 ${pago ? 'text-red-500' : vencido ? 'text-red-400' : 'text-gray-400'}`} />;
    valColor = pago ? 'text-red-500 dark:text-red-400' : vencido ? 'text-red-400 dark:text-red-500' : 'text-gray-400 dark:text-gray-500';
  }

  return (
    <button
      onClick={() => onClick(l)}
      className="w-full flex items-start gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors text-left">
      <span className="bg-gray-100 rounded-xl flex-none w-8 h-8 flex items-center justify-center dark:bg-gray-700">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className={`block text-[0.82rem] font-medium whitespace-normal break-words leading-snug ${prev ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
          {l.descricao}
        </span>
        <span className="flex items-center flex-wrap gap-1 mt-0.5">
          <span className="text-[0.68rem] text-gray-400 dark:text-gray-500">
            {data ? format(new Date(data), 'dd MMM', { locale: ptBR }) : '—'}
            {l.conta_financeira_nome ? ` · ${l.conta_financeira_nome}` : ''}
          </span>
          {l.categoria && (
            <span className="text-[0.6rem] px-1.5 py-0.5 rounded-md font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              {l.categoria}
            </span>
          )}
          <StatusBadge status={l.status} />
          <RecorrenciaBadge l={l} />
          {(l.tags || []).slice(0, 2).map(t => (
            <span key={t} className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-400">{t}</span>
          ))}
        </span>
      </span>
      <span className="flex-none flex flex-col items-end gap-0.5 pl-1">
        <span className={`text-[0.82rem] font-bold whitespace-nowrap ${valColor}`}>
          {isT ? '' : isR ? '+' : '−'}{R(Math.abs(l.valor || 0))}
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
    <div className="w-full">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-1 py-1.5 group">
        <p className="text-[0.62rem] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{label}</p>
        <div className="flex items-center gap-2">
          {totais.r > 0 && <span className="text-[0.62rem] text-gray-500 dark:text-gray-400 font-medium">+{R(totais.r)}</span>}
          {totais.d > 0 && <span className="text-[0.62rem] text-gray-400 dark:text-gray-500 font-medium">−{R(totais.d)}</span>}
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
    <div className="space-y-3">
      {grupos.map(({ k, label, items, totais }) => (
        <Grupo key={k} label={label} items={items} totais={totais} onRow={onRow} />
      ))}
    </div>
  );
}