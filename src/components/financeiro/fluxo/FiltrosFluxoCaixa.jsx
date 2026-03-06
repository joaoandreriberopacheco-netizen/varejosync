import React, { useState } from 'react';
import {
  Search, X, Wallet, BarChart3, Clock, ChevronDown,
  ChevronLeft, ChevronRight, AlertTriangle, RefreshCw
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  format, isWithinInterval, subDays,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  isSameDay, isBefore, eachDayOfInterval, getDay, addMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
        {onPrev
          ? <button onClick={onPrev} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><ChevronLeft className="w-3.5 h-3.5" /></button>
          : <span className="w-6" />}
        <span className="text-[0.72rem] font-semibold text-gray-700 dark:text-gray-200 capitalize">
          {format(first, 'MMMM yyyy', { locale: ptBR })}
        </span>
        {onNext
          ? <button onClick={onNext} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><ChevronRight className="w-3.5 h-3.5" /></button>
          : <span className="w-6" />}
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
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Período Picker ───────────────────────────────────────────────────────────
const CHIPS = [
  { v: 'hoje', l: 'Hoje' }, { v: 'ontem', l: 'Ontem' },
  { v: 'semana', l: 'Semana' }, { v: 'mes', l: 'Mês' },
  { v: 'tudo', l: 'Tudo' }, { v: 'periodo', l: 'Período' },
];

function PeriodoPicker({ periodo, onPeriodo, customStart, customEnd, onCustom }) {
  const [showCal, setShowCal] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hover, setHover] = useState(null);

  const hoje = new Date();
  const baseLeft = addMonths(new Date(hoje.getFullYear(), hoje.getMonth(), 1), offset);
  const rs = customStart ? new Date(customStart) : null;
  const re = customEnd ? new Date(customEnd + 'T23:59:59') : null;

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

  const chipLabel = (c) => c.v === 'periodo' ? rangeLabel : c.l;
  const row1 = CHIPS.slice(0, 3);
  const row2 = CHIPS.slice(3);

  const renderChip = (c) => (
    <button key={c.v}
      onClick={() => { onPeriodo(c.v); if (c.v === 'periodo') setShowCal(s => !s); else setShowCal(false); }}
      className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
        ${periodo === c.v ? 'bg-gray-500 dark:bg-gray-200 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
      {chipLabel(c)}
      {c.v === 'periodo' && periodo === 'periodo' && (rs || re) && (
        <span onMouseDown={(e) => { e.stopPropagation(); onCustom('start', ''); onCustom('end', ''); onPeriodo('mes'); setShowCal(false); }}>
          <X className="w-3 h-3 ml-0.5" />
        </span>
      )}
    </button>
  );

  return (
    <div className="relative w-full">
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">{row1.map(renderChip)}</div>
        <div className="flex gap-1.5">{row2.map(renderChip)}</div>
      </div>
      {showCal && periodo === 'periodo' && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-xl border border-gray-100 dark:border-gray-700">
          <MiniCal base={baseLeft} rangeStart={rs} rangeEnd={re} hover={hover} onDay={handleDay} onHover={setHover} onPrev={() => setOffset(o => o - 1)} onNext={() => setOffset(o => o + 1)} />
          {rs && re && (
            <div className="mt-2 flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {format(rs, 'dd MMM yyyy', { locale: ptBR })} → {format(re, 'dd MMM yyyy', { locale: ptBR })}
              </span>
              <button onClick={() => setShowCal(false)} className="text-xs font-semibold bg-gray-900 dark:bg-gray-200 text-white dark:text-gray-900 px-3 py-1 rounded-lg">OK</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Filtro Contas ────────────────────────────────────────────────────────────
function ContasFiltro({ contas, sel, onSel }) {
  const todasSel = sel.length === 0 || sel.length === contas.length;
  const toggle = (id) => sel.includes(id) ? onSel(sel.filter(c => c !== id)) : onSel([...sel, id]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
          ${!todasSel ? 'bg-gray-500 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
          <Wallet className="w-3 h-3" />
          {todasSel ? 'Contas' : `${sel.length}×`}
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2 dark:bg-gray-800 dark:border-gray-700" align="start">
        <button onClick={() => onSel([])} className={`w-full text-left px-2 py-1.5 rounded text-xs mb-1 ${todasSel ? 'bg-gray-100 dark:bg-gray-700 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-700'} text-gray-700 dark:text-gray-200`}>
          Todas as contas
        </button>
        {contas.map(c => (
          <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
            <Checkbox checked={sel.includes(c.id)} onCheckedChange={() => toggle(c.id)} className="w-3.5 h-3.5" />
            <span className="w-2 h-2 rounded-full flex-none" style={{ background: c.cor || '#10B981' }} />
            <span className="text-xs truncate text-gray-700 dark:text-gray-200">{c.nome}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ─── Filtro Status ────────────────────────────────────────────────────────────
function StatusFiltro({ sel, onSel }) {
  const ALL = ['Em Aberto', 'Vencido', 'Pago', 'Cancelado'];
  const todasSel = sel.length === 0;
  const toggle = (t) => sel.includes(t) ? onSel(sel.filter(x => x !== t)) : onSel([...sel, t]);
  const label = sel.length === 0 ? 'Status' : sel.length === 1 ? sel[0] : `${sel.length} status`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
          ${!todasSel ? 'bg-gray-500 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
          <RefreshCw className="w-3 h-3" />
          {label}
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2 dark:bg-gray-800 dark:border-gray-700" align="start">
        <button onClick={() => onSel([])} className={`w-full text-left px-2 py-1.5 rounded text-xs mb-1 ${todasSel ? 'bg-gray-100 dark:bg-gray-700 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-700'} text-gray-700 dark:text-gray-200`}>
          Todos
        </button>
        {ALL.map(t => (
          <label key={t} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
            <Checkbox checked={sel.includes(t)} onCheckedChange={() => toggle(t)} className="w-3.5 h-3.5" />
            <span className="text-xs text-gray-700 dark:text-gray-200">{t}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ─── Filtro Tipo ──────────────────────────────────────────────────────────────
function TipoFiltro({ sel, onSel }) {
  const ALL = ['Receita', 'Despesa', 'Transferência'];
  const todasSel = sel.length === 0 || sel.length === ALL.length;
  const toggle = (t) => sel.includes(t) ? onSel(sel.filter(x => x !== t)) : onSel([...sel, t]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
          ${!todasSel ? 'bg-gray-500 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
          <BarChart3 className="w-3 h-3" />
          {todasSel ? 'Tipo' : sel.join(', ')}
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2 dark:bg-gray-800 dark:border-gray-700" align="start">
        {ALL.map(t => (
          <label key={t} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
            <Checkbox checked={sel.length === 0 || sel.includes(t)} onCheckedChange={() => toggle(t)} className="w-3.5 h-3.5" />
            <span className="text-xs text-gray-700 dark:text-gray-200">{t}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ─── Export Principal ─────────────────────────────────────────────────────────
export { PeriodoPicker, ContasFiltro, TipoFiltro, StatusFiltro };

export default function FiltrosFluxoCaixa({
  search, onSearch,
  periodo, onPeriodo, customStart, customEnd, onCustom,
  contas, contasSel, onContasSel,
  tiposSel, onTiposSel,
  statusSel, onStatusSel,
  pendentes, onPendentes,
  totalFiltrados, hasActiveFilters, onLimparFiltros,
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
      {/* Busca */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-50 dark:border-white/5">
        <Search className="w-4 h-4 text-gray-400 flex-none" />
        <input
          value={search} onChange={e => onSearch(e.target.value)}
          placeholder="Buscar lançamento, categoria, tag..."
          className="flex-1 min-w-0 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 outline-none" />
        {search && <button onClick={() => onSearch('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
      </div>

      {/* Período */}
      <div className="px-3 py-2 border-b border-gray-50 dark:border-white/5 relative">
        <PeriodoPicker
          periodo={periodo} onPeriodo={onPeriodo}
          customStart={customStart} customEnd={customEnd}
          onCustom={onCustom} />
      </div>

      {/* Filtros secundários */}
      <div className="px-3 pb-2.5 pt-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <ContasFiltro contas={contas} sel={contasSel} onSel={onContasSel} />
        <TipoFiltro sel={tiposSel} onSel={onTiposSel} />
        <StatusFiltro sel={statusSel} onSel={onStatusSel} />
        <button
          onClick={() => onPendentes(!pendentes)}
          className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
            ${pendentes ? 'bg-gray-500 dark:bg-gray-200 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
          <Clock className="w-3 h-3" /> Conciliação
        </button>
      </div>

      {/* Contagem e limpar */}
      <div className="flex items-center justify-between px-4 pb-2.5">
        <p className="text-[0.65rem] text-gray-400">{totalFiltrados} lançamento{totalFiltrados !== 1 ? 's' : ''}</p>
        {hasActiveFilters && (
          <button onClick={onLimparFiltros} className="text-[0.65rem] text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
            <X className="w-2.5 h-2.5" /> Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}