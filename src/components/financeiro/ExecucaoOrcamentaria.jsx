import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  format, isWithinInterval, subDays,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  isSameDay, isBefore, eachDayOfInterval, getDay, addMonths } from
'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, X, ArrowDownLeft, ArrowUpRight, ArrowRightLeft,
  Scale, Search, AlertCircle, ChevronDown, SlidersHorizontal,
  Clock, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  BarChart3, Target, Wallet } from
'lucide-react';
import NovoLancamentoDialog from './NovoLancamentoDialog';
import LancamentoDetalheDialog from './LancamentoDetalheDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

// ─── utils ────────────────────────────────────────────────────────────────────
const R = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function dateRange(periodo, cs, ce) {
  const h = new Date();
  if (periodo === 'hoje') return { s: new Date(h.getFullYear(), h.getMonth(), h.getDate()), e: new Date(h.getFullYear(), h.getMonth(), h.getDate(), 23, 59, 59) };
  if (periodo === 'ontem') {const d = subDays(h, 1);return { s: new Date(d.getFullYear(), d.getMonth(), d.getDate()), e: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59) };}
  if (periodo === 'semana') return { s: startOfWeek(h, { locale: ptBR }), e: endOfWeek(h, { locale: ptBR }) };
  if (periodo === 'mes') return { s: startOfMonth(h), e: endOfMonth(h) };
  if (periodo === 'tudo') return { s: null, e: null };
  if (periodo === 'periodo') return { s: cs ? new Date(cs) : null, e: ce ? new Date(ce + 'T23:59:59') : null };
  return { s: startOfMonth(h), e: endOfMonth(h) };
}

// ─── Categoria Badge ──────────────────────────────────────────────────────────
// Paleta glacial: apenas tons de cinza, sem cores vibrantes
const CAT_CORES = {
  'Venda de Produto': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
  'Prestação de Serviço': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
  'Compra de Mercadoria': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
  'Salários': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
  'Aluguel': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
  'Impostos': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
  'Utilities': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
  'Marketing': { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' }
};

function CategoriaBadge({ cat }) {
  const c = CAT_CORES[cat];
  if (!c) return null;
  return (
    <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-md font-medium ${c.bg} ${c.text}`}>
      {cat}
    </span>);

}

// ─── KPI Strip ────────────────────────────────────────────────────────────────
function KpiStrip({ kpis }) {
  const taxa = kpis.entrou > 0 ? (kpis.saiu / kpis.entrou * 100).toFixed(0) : 0;

  return (
    <div className="space-y-2.5">
      {/* Linha 1: entrou / saiu */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3 h-3 text-gray-400" />
            <p className="text-[9px] uppercase tracking-wider text-gray-400">Receitas</p>
          </div>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{R(kpis.entrou)}</p>
          {kpis.pEntrou > 0 && <p className="text-[9px] text-gray-400 mt-1">+{R(kpis.pEntrou)} prev.</p>}
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="w-3 h-3 text-gray-400" />
            <p className="text-[9px] uppercase tracking-wider text-gray-400">Despesas</p>
          </div>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{R(kpis.saiu)}</p>
          {kpis.pSaiu > 0 && <p className="text-[9px] text-gray-400 mt-1">+{R(kpis.pSaiu)} prev.</p>}
        </div>
      </div>

      {/* Linha 2: saldo + barra de execução */}
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-4 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-0.5">Saldo de Execução</p>
            <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{R(kpis.saldo)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-gray-400 mb-0.5">Taxa de Gasto</p>
            <p className="text-sm font-bold text-gray-600 dark:text-gray-300">{taxa}%</p>
          </div>
        </div>
        <div className="h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-400 dark:bg-gray-400 rounded-full transition-all"
            style={{ width: `${Math.min(Number(taxa), 100)}%` }} />
        </div>
      </div>

      {/* Transferências */}
      {kpis.totalTransferencias > 0 &&
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 flex items-center gap-3">
          <ArrowRightLeft className="w-4 h-4 text-gray-400 flex-none" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-gray-400">Transferências</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{R(kpis.totalTransferencias)}</p>
          </div>
        </div>
      }
    </div>);
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────
const DIAS_SEMANA = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

function MiniCal({ base, rangeStart, rangeEnd, hover, onDay, onHover, onPrev, onNext }) {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const days = eachDayOfInterval({ start: first, end: endOfMonth(first) });
  const pad = (getDay(first) + 6) % 7;

  const inRange = (d) => {
    const end = rangeEnd || hover;
    if (!rangeStart || !end) return false;
    const [from, to] = isBefore(rangeStart, end) ? [rangeStart, end] : [end, rangeStart];
    return isWithinInterval(d, { start: from, end: to });
  };

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2">
        {onPrev ?
        <button onClick={onPrev} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><ChevronLeft className="w-3.5 h-3.5" /></button> :
        <span className="w-6" />}
        <span className="text-[0.72rem] font-semibold text-gray-700 dark:text-gray-200 capitalize">
          {format(first, 'MMMM yyyy', { locale: ptBR })}
        </span>
        {onNext ?
        <button onClick={onNext} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><ChevronRight className="w-3.5 h-3.5" /></button> :
        <span className="w-6" />}
      </div>
      <div className="grid grid-cols-7 gap-px mb-0.5">
        {DIAS_SEMANA.map((d, i) => <div key={i} className="text-center text-[0.6rem] font-medium text-gray-400 py-0.5">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {Array(pad).fill(null).map((_, i) => <div key={'p' + i} />)}
        {days.map((d) => {
          const isS = rangeStart && isSameDay(d, rangeStart);
          const isE = rangeEnd && isSameDay(d, rangeEnd);
          const in_ = inRange(d);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onDay(d)}
              onMouseEnter={() => onHover(d)}
              className={`text-center text-[0.7rem] py-1 rounded-lg transition-colors
                ${isS || isE ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 font-bold' : ''}
                ${in_ && !isS && !isE ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : ''}
                ${!isS && !isE && !in_ ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
              `}>

              {d.getDate()}
            </button>);

        })}
      </div>
    </div>);

}

// ─── Periodo Picker ───────────────────────────────────────────────────────────
const CHIPS = [
  { v: 'hoje',   l: 'Hoje' },
  { v: 'ontem',  l: 'Ontem' },
  { v: 'semana', l: 'Semana' },
  { v: 'mes',    l: 'Mês' },
  { v: 'tudo',   l: 'Tudo' },
  { v: 'periodo', l: 'Período' },
];

function PeriodoPicker({ periodo, onPeriodo, customStart, customEnd, onCustom }) {
  const [showCal, setShowCal] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hover, setHover] = useState(null);

  const hoje = new Date();
  const baseLeft = addMonths(new Date(hoje.getFullYear(), hoje.getMonth(), 1), offset);
  const rs = customStart ? new Date(customStart) : null;
  const re = customEnd ? new Date(customEnd + 'T23:59:59') : null;

  const idx = CHIPS.findIndex(c => c.v === periodo);
  const current = CHIPS[idx] || CHIPS[0];

  const goPrev = () => {
    const newIdx = (idx - 1 + CHIPS.length) % CHIPS.length;
    const next = CHIPS[newIdx];
    onPeriodo(next.v);
    if (next.v === 'periodo') setShowCal(true);
    else setShowCal(false);
  };

  const goNext = () => {
    const newIdx = (idx + 1) % CHIPS.length;
    const next = CHIPS[newIdx];
    onPeriodo(next.v);
    if (next.v === 'periodo') setShowCal(true);
    else setShowCal(false);
  };

  const handleDay = (d) => {
    if (!rs || (rs && re)) {
      onCustom('start', format(d, 'yyyy-MM-dd'));
      onCustom('end', '');
    } else {
      if (isBefore(d, rs)) { onCustom('end', format(rs, 'yyyy-MM-dd')); onCustom('start', format(d, 'yyyy-MM-dd')); }
      else onCustom('end', format(d, 'yyyy-MM-dd'));
      setHover(null);
    }
  };

  const rangeLabel = rs && re
    ? `${format(rs, 'dd/MM')} – ${format(re, 'dd/MM')}`
    : rs ? `${format(rs, 'dd/MM')} – ...` : 'Período';

  const label = periodo === 'periodo' ? rangeLabel : current.l;

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-2">
        <button
          onClick={goPrev}
          className="flex-none w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 active:scale-95 transition-transform">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => { if (periodo === 'periodo') setShowCal(s => !s); }}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 transition-colors">
          {label}
          {periodo === 'periodo' && (rs || re) && (
            <span onMouseDown={(e) => { e.stopPropagation(); onCustom('start', ''); onCustom('end', ''); onPeriodo('mes'); setShowCal(false); }}>
              <X className="w-3 h-3 ml-0.5" />
            </span>
          )}
        </button>

        <button
          onClick={goNext}
          className="flex-none w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 active:scale-95 transition-transform">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {showCal && periodo === 'periodo' &&
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-xl">
          <MiniCal base={baseLeft} rangeStart={rs} rangeEnd={re} hover={hover} onDay={handleDay} onHover={setHover} onPrev={() => setOffset(o => o - 1)} onNext={() => setOffset(o => o + 1)} />
          {rs && re &&
            <div className="mt-2 flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {format(rs, 'dd MMM yyyy', { locale: ptBR })} → {format(re, 'dd MMM yyyy', { locale: ptBR })}
              </span>
              <button onClick={() => setShowCal(false)} className="text-xs font-semibold bg-gray-900 dark:bg-gray-200 text-white dark:text-gray-900 px-3 py-1 rounded-lg">OK</button>
            </div>
          }
        </div>
      }
    </div>
  );
}

// ─── Contas Filter ────────────────────────────────────────────────────────────
function ContasFiltro({ contas, sel, onSel }) {
  const todasSel = sel.length === 0 || sel.length === contas.length;
  const toggle = (id) => sel.includes(id) ? onSel(sel.filter((c) => c !== id)) : onSel([...sel, id]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
          ${!todasSel ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
          <Wallet className="w-3 h-3" />
          {todasSel ? 'Contas' : `${sel.length}×`}
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2 dark:bg-gray-800 dark:border-gray-700" align="start">
        <button onClick={() => onSel([])} className={`w-full text-left px-2 py-1.5 rounded text-xs mb-1 ${todasSel ? 'bg-gray-100 dark:bg-gray-700 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-700'} text-gray-700 dark:text-gray-200`}>
          Todas as contas
        </button>
        {contas.map((c) =>
        <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
            <Checkbox checked={sel.includes(c.id)} onCheckedChange={() => toggle(c.id)} className="w-3.5 h-3.5" />
            <span className="w-2 h-2 rounded-full flex-none" style={{ background: c.cor || '#10B981' }} />
            <span className="text-xs truncate text-gray-700 dark:text-gray-200">{c.nome}</span>
          </label>
        )}
      </PopoverContent>
    </Popover>);

}

// ─── Tipo Filter ──────────────────────────────────────────────────────────────
function TipoFiltro({ tipos, sel, onSel }) {
  const ALL = ['Receita', 'Despesa', 'Transferência'];
  const todasSel = sel.length === 0 || sel.length === ALL.length;
  const toggle = (t) => sel.includes(t) ? onSel(sel.filter((x) => x !== t)) : onSel([...sel, t]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
          ${!todasSel ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
          <BarChart3 className="w-3 h-3" />
          {todasSel ? 'Tipo' : sel.join(', ')}
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2 dark:bg-gray-800 dark:border-gray-700" align="start">
        {ALL.map((t) =>
        <label key={t} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
            <Checkbox checked={sel.length === 0 || sel.includes(t)} onCheckedChange={() => toggle(t)} className="w-3.5 h-3.5" />
            <span className="text-xs text-gray-700 dark:text-gray-200">{t}</span>
          </label>
        )}
      </PopoverContent>
    </Popover>);

}

// ─── Lancamento Row ───────────────────────────────────────────────────────────
function LancRow({ l, onClick }) {
  const isR = l.tipo === 'Receita';
  const isT = l.tipo === 'Transferência';
  const pago = l.status === 'Pago';
  const prev = !pago && l.status !== 'Cancelado';
  const conc = l.status_conciliacao || 'N/A';
  const data = l.data_pagamento || l.data_vencimento;
  const val = Math.abs(l.valor || 0);

  // Ícone: cor apenas na seta. Valor: verde (receita pago), vermelho (despesa pago), cinza (prev)
  let icon, iconBg, valColor;
  if (isT) {
    icon = <ArrowRightLeft className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />;
    iconBg = 'bg-gray-100 dark:bg-gray-700';
    valColor = 'text-gray-500 dark:text-gray-400';
  } else if (isR) {
    icon = <ArrowDownLeft className={`w-3.5 h-3.5 ${pago ? 'text-green-500' : 'text-gray-400'}`} />;
    iconBg = 'bg-gray-100 dark:bg-gray-700';
    valColor = pago ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500';
  } else {
    icon = <ArrowUpRight className={`w-3.5 h-3.5 ${pago ? 'text-red-500' : 'text-gray-400'}`} />;
    iconBg = 'bg-gray-100 dark:bg-gray-700';
    valColor = pago ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500';
  }

  return (
    <button
      onClick={() => onClick(l)}
      className="w-full flex items-start gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors text-left">

      {/* Ícone */}
      <span className="bg-gray-100 rounded-xl flex-none w-8 h-8 flex items-center justify-center dark:bg-gray-700">{icon}</span>

      {/* Corpo */}
      <span className="flex-1 min-w-0">
        <span className={`block text-[0.82rem] font-medium whitespace-normal break-words leading-snug ${prev ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
          {l.descricao}
        </span>
        <span className="flex items-center flex-wrap gap-1 mt-0.5">
          <span className="text-[0.68rem] text-gray-400 dark:text-gray-500">
            {data ? format(new Date(data), 'dd MMM', { locale: ptBR }) : '—'}
            {l.conta_financeira_nome ? ` · ${l.conta_financeira_nome}` : ''}
          </span>
          {prev && <span className="text-[0.6rem] bg-gray-100 dark:bg-gray-700 text-gray-400 rounded px-1">prev.</span>}
          {l.categoria && <CategoriaBadge cat={l.categoria} />}
        </span>
      </span>

      {/* Valor */}
      <span className="flex-none flex flex-col items-end gap-0.5 pl-1">
        <span className={`text-[0.82rem] font-bold whitespace-nowrap ${valColor}`}>
          {isT ? '' : isR ? '+' : '−'}{R(val)}
        </span>
        {conc === 'Pendente' && <Clock className="w-2.5 h-2.5 text-gray-400" />}
        {conc === 'Discrepância' && <AlertCircle className="w-2.5 h-2.5 text-gray-500" />}
      </span>
    </button>);

}

// ─── Grupo por Data ───────────────────────────────────────────────────────────
function Grupo({ label, items, totais, onRow }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="w-full">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-1 py-1.5 group">

        <p className="text-[0.62rem] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{label}</p>
        <div className="flex items-center gap-2">
          {totais.r > 0 && <span className="text-[0.62rem] text-gray-500 dark:text-gray-400 font-medium">+{R(totais.r)}</span>}
          {totais.d > 0 && <span className="text-[0.62rem] text-gray-400 dark:text-gray-500 font-medium">−{R(totais.d)}</span>}
          <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
      </button>
      {open &&
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-white/5">
          {items.map((l) => <LancRow key={l.id} l={l} onClick={onRow} />)}
        </div>
      }
    </div>);

}

// ─── FAB ──────────────────────────────────────────────────────────────────────
const FAB_ITEMS = [
{ tipo: 'Receita', icon: ArrowDownLeft, label: 'Receita' },
{ tipo: 'Despesa', icon: ArrowUpRight, label: 'Despesa' },
{ tipo: 'Transferência', icon: ArrowRightLeft, label: 'Transferência' }];


// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ExecucaoOrcamentaria() {
  const [lancs, setLancs] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [periodo, setPeriodo] = useState('mes');
  const [cs, setCs] = useState('');
  const [ce, setCe] = useState('');
  const [contasSel, setContasSel] = useState([]);
  const [tiposSel, setTiposSel] = useState([]);
  const [pendentes, setPendentes] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [novoTipo, setNovoTipo] = useState('Despesa');
  const [showNovo, setShowNovo] = useState(false);
  const [detalhe, setDetalhe] = useState(null);

  useEffect(() => {load();}, []);

  const load = async () => {
    setLoading(true);
    const [ls, cts] = await Promise.all([
    base44.entities.LancamentoFinanceiro.list('-data_vencimento'),
    base44.entities.ContasFinanceiras.filter({ ativo: true })]
    );
    setLancs(ls);setContas(cts);setLoading(false);
  };

  const { s: ds, e: de } = useMemo(() => dateRange(periodo, cs, ce), [periodo, cs, ce]);

  const filtrados = useMemo(() => lancs.filter((l) => {
    if (l.status === 'Cancelado') return false;
    const dr = l.data_pagamento ? new Date(l.data_pagamento) : l.data_vencimento ? new Date(l.data_vencimento) : null;
    if (ds && de && dr && !isWithinInterval(dr, { start: ds, end: de })) return false;
    if (contasSel.length && !contasSel.includes(l.conta_financeira_id)) return false;
    if (tiposSel.length && !tiposSel.includes(l.tipo)) return false;
    if (pendentes && l.status_conciliacao !== 'Pendente') return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.descricao || '').toLowerCase().includes(q) ||
      (l.categoria || '').toLowerCase().includes(q) ||
      (l.conta_financeira_nome || '').toLowerCase().includes(q) ||
      (l.referencia_numero || '').toLowerCase().includes(q);
    }
    return true;
  }), [lancs, ds, de, contasSel, tiposSel, pendentes, search]);

  const kpis = useMemo(() => {
    let entrou = 0,saiu = 0,pEntrou = 0,pSaiu = 0,totalTransferencias = 0;
    filtrados.forEach((l) => {
      if (l.tipo === 'Transferência') {totalTransferencias += l.valor || 0;return;}
      if (l.status === 'Pago') {
        if (l.tipo === 'Receita') entrou += l.valor || 0;else
        if (l.tipo === 'Despesa') saiu += l.valor || 0;
      } else {
        if (l.tipo === 'Receita') pEntrou += l.valor || 0;else
        if (l.tipo === 'Despesa') pSaiu += l.valor || 0;
      }
    });
    return { entrou, saiu, saldo: entrou - saiu, pEntrou, pSaiu, saldoPrev: entrou + pEntrou - saiu - pSaiu, totalTransferencias };
  }, [filtrados]);

  const grupos = useMemo(() => {
    const h = new Date();
    const hStr = format(h, 'yyyy-MM-dd');
    const oStr = format(subDays(h, 1), 'yyyy-MM-dd');
    const map = {};
    filtrados.forEach((l) => {
      const dr = l.data_pagamento || l.data_vencimento;
      const k = dr ? format(new Date(dr), 'yyyy-MM-dd') : 'sem-data';
      (map[k] = map[k] || []).push(l);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a)).map(([k, items]) => {
      let label = 'Sem data';
      if (k !== 'sem-data') {
        const d = new Date(k + 'T12:00:00');
        label = k === hStr ? 'Hoje' : k === oStr ? 'Ontem' : format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
        if (k > hStr) label += ' (previsto)';
      }
      const totais = { r: 0, d: 0 };
      items.forEach((l) => {
        if (l.tipo === 'Receita' && l.status === 'Pago') totais.r += l.valor || 0;
        if (l.tipo === 'Despesa' && l.status === 'Pago') totais.d += l.valor || 0;
      });
      return { k, label, items, totais };
    });
  }, [filtrados]);

  const totalPend = useMemo(() => lancs.filter((l) => l.status_conciliacao === 'Pendente').length, [lancs]);

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-4 pb-28">

      {/* Header */}
      <div className="pb-3 mb-1">
        <p className="text-xl font-medium text-gray-800 dark:text-gray-200">Fluxo de Caixa</p>
        <p className="text-xs text-gray-400">Movimentações, receitas e despesas</p>
      </div>

      {/* KPIs */}
      <KpiStrip kpis={kpis} />

      {/* Alerta pendentes */}
      {totalPend > 0 && !pendentes &&
      <button onClick={() => setPendentes(true)}
      className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 text-xs text-left">
          <Clock className="w-3.5 h-3.5 flex-none text-gray-400" />
          <span className="flex-1 min-w-0 truncate">{totalPend} aguardando conciliação</span>
          <span className="font-semibold flex-none text-gray-500">Ver →</span>
        </button>
      }

      {/* Painel de busca e filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Busca */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-50 dark:border-white/5">
          <Search className="w-4 h-4 text-gray-400 flex-none" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lançamento, categoria..."
            className="flex-1 min-w-0 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 outline-none" />

          {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
        </div>

        {/* Período */}
        <div className="px-3 py-2 border-b border-gray-50 dark:border-white/5 relative">
          <PeriodoPicker
            periodo={periodo} onPeriodo={setPeriodo}
            customStart={cs} customEnd={ce}
            onCustom={(k, v) => k === 'start' ? setCs(v) : setCe(v)} />

        </div>

        {/* Filtros secundários */}
        <div className="px-3 pb-2.5 pt-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <ContasFiltro contas={contas} sel={contasSel} onSel={setContasSel} />
          <TipoFiltro tipos={[]} sel={tiposSel} onSel={setTiposSel} />
          <button
            onClick={() => setPendentes((p) => !p)}
            className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
              ${pendentes ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
            <Clock className="w-3 h-3" />
            Pendentes
          </button>
        </div>
      </div>

      {/* Resultado */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[0.65rem] text-gray-400">{filtrados.length} lançamento{filtrados.length !== 1 ? 's' : ''}</p>
        {(tiposSel.length > 0 || contasSel.length > 0 || pendentes || search) &&
        <button onClick={() => {setTiposSel([]);setContasSel([]);setPendentes(false);setSearch('');}}
        className="text-[0.65rem] text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
            <X className="w-2.5 h-2.5" /> Limpar filtros
          </button>
        }
      </div>

      {/* Lista */}
      {loading ?
      <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div> :
      grupos.length === 0 ?
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm py-16 flex flex-col items-center gap-2">
          <Scale className="w-9 h-9 text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-400">Nenhum lançamento encontrado</p>
        </div> :

      <div className="space-y-3">
          {grupos.map(({ k, label, items, totais }) =>
        <Grupo key={k} label={label} items={items} totais={totais} onRow={setDetalhe} />
        )}
        </div>
      }

      {/* FAB */}
      {fabOpen && <div className="fixed inset-0 z-20" onClick={() => setFabOpen(false)} />}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 flex flex-col items-end gap-2">
        {fabOpen && FAB_ITEMS.map(({ tipo, icon: Icon, label }) =>
        <button key={tipo}
        onClick={() => {setNovoTipo(tipo);setShowNovo(true);setFabOpen(false);}}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-900 dark:bg-gray-200 text-white dark:text-gray-900 text-sm font-medium shadow-lg whitespace-nowrap active:scale-95 transition-transform">
            <Icon className="w-4 h-4" />{label}
          </button>
        )}
        <button
          onClick={() => setFabOpen((o) => !o)}
          className={`w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all
            ${fabOpen ? 'bg-gray-500 rotate-45' : 'bg-gray-900 dark:bg-gray-200'}`}>
          <Plus className={`w-6 h-6 ${fabOpen ? 'text-white' : 'text-white dark:text-gray-900'}`} />
        </button>
      </div>

      {/* Dialogs */}
      <NovoLancamentoDialog open={showNovo} tipoInicial={novoTipo} onClose={() => setShowNovo(false)} onSaved={load} />
      {detalhe && <LancamentoDetalheDialog lancamento={detalhe} contas={contas} onClose={() => setDetalhe(null)} onSaved={() => {load();setDetalhe(null);}} />}
    </div>);

}