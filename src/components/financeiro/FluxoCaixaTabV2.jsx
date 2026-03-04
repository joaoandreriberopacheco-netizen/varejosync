import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  format, isWithinInterval, subDays,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  isSameDay, isBefore, isWithinInterval as isInRange,
  eachDayOfInterval, getDay, addMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, X, ArrowDownLeft, ArrowUpRight, ArrowRightLeft,
  Scale, Search, AlertCircle, ChevronDown, SlidersHorizontal,
  Clock, ChevronLeft, ChevronRight
} from 'lucide-react';
import NovoLancamentoDialog from './NovoLancamentoDialog';
import LancamentoDetalheDialog from './LancamentoDetalheDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

// ─── utils ────────────────────────────────────────────────────────────────────
const R = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function dateRange(periodo, cs, ce) {
  const h = new Date();
  if (periodo === 'hoje')  return { s: new Date(h.getFullYear(), h.getMonth(), h.getDate()), e: new Date(h.getFullYear(), h.getMonth(), h.getDate(), 23, 59, 59) };
  if (periodo === 'ontem') { const d = subDays(h, 1); return { s: new Date(d.getFullYear(), d.getMonth(), d.getDate()), e: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59) }; }
  if (periodo === 'semana') return { s: startOfWeek(h, { locale: ptBR }), e: endOfWeek(h, { locale: ptBR }) };
  if (periodo === 'mes')   return { s: startOfMonth(h), e: endOfMonth(h) };
  if (periodo === 'tudo')  return { s: null, e: null };
  if (periodo === 'periodo') return { s: cs ? new Date(cs) : null, e: ce ? new Date(ce + 'T23:59:59') : null };
  return { s: startOfMonth(h), e: endOfMonth(h) };
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, neg, dark }) {
  return (
    <div className={`rounded-2xl p-3 ${dark ? 'bg-gray-900 dark:bg-gray-100' : 'bg-white dark:bg-gray-800 shadow-sm'}`}>
      <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{label}</p>
      <p className={`font-bold leading-tight break-words ${dark ? (neg ? 'text-red-400' : 'text-white dark:text-gray-900') : (neg ? 'text-red-500' : 'text-gray-800 dark:text-white')} text-base`}>
        {value}
      </p>
      {sub && <p className="text-[10px] mt-0.5 text-gray-400 truncate">{sub}</p>}
    </div>
  );
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
        {days.map(d => {
          const isS = rangeStart && isSameDay(d, rangeStart);
          const isE = rangeEnd && isSameDay(d, rangeEnd);
          const in_ = inRange(d);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onDay(d)}
              onMouseEnter={() => onHover(d)}
              className={`
                text-center text-[0.7rem] py-1 rounded-lg transition-colors
                ${isS || isE ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 font-bold' : ''}
                ${in_ && !isS && !isE ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : ''}
                ${!isS && !isE && !in_ ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
              `}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Periodo Picker ───────────────────────────────────────────────────────────
const CHIPS = [
  { v: 'hoje',   l: 'Hoje' },
  { v: 'ontem',  l: 'Ontem' },
  { v: 'semana', l: 'Semana' },
  { v: 'mes',    l: 'Mês' },
  { v: 'tudo',   l: 'Tudo' },
];

function PeriodoPicker({ periodo, onPeriodo, customStart, customEnd, onCustom }) {
  const [showCal, setShowCal] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hover, setHover] = useState(null);
  const scrollRef = useRef(null);

  const hoje = new Date();
  const baseLeft  = addMonths(new Date(hoje.getFullYear(), hoje.getMonth(), 1), offset);
  const baseRight = addMonths(baseLeft, 1);

  const rs = customStart ? new Date(customStart) : null;
  const re = customEnd   ? new Date(customEnd + 'T23:59:59') : null;

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
    : rs ? `${format(rs, 'dd/MM')} – ...`
    : 'Período';

  const scroll = (dir) => { if (scrollRef.current) scrollRef.current.scrollLeft += dir * 90; };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-1.5">
        {/* seta esquerda */}
        <button onClick={() => scroll(-1)} className="flex-none w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* chips */}
        <div ref={scrollRef} className="flex gap-1.5 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none', scrollBehavior: 'smooth' }}>
          {CHIPS.map(c => (
            <button
              key={c.v}
              onClick={() => { onPeriodo(c.v); setShowCal(false); }}
              className={`flex-none px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                ${periodo === c.v ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}
            >
              {c.l}
            </button>
          ))}

          {/* chip período personalizado */}
          <button
            onClick={() => { onPeriodo('periodo'); setShowCal(s => !s); }}
            className={`flex-none flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
              ${periodo === 'periodo' ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}
          >
            {rangeLabel}
            {periodo === 'periodo' && (rs || re) && (
              <span onMouseDown={e => { e.stopPropagation(); onCustom('start',''); onCustom('end',''); onPeriodo('mes'); setShowCal(false); }}>
                <X className="w-3 h-3 ml-0.5" />
              </span>
            )}
          </button>
        </div>

        {/* seta direita */}
        <button onClick={() => scroll(1)} className="flex-none w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* calendário dropdown */}
      {showCal && periodo === 'periodo' && (
        <div
          className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-xl"
          onMouseLeave={() => setHover(null)}
        >
          <div className="flex gap-3">
            <MiniCal base={baseLeft}  rangeStart={rs} rangeEnd={re} hover={hover} onDay={handleDay} onHover={setHover} onPrev={() => setOffset(o => o - 1)} onNext={null} />
            <div className="w-px bg-gray-100 dark:bg-gray-700" />
            <MiniCal base={baseRight} rangeStart={rs} rangeEnd={re} hover={hover} onDay={handleDay} onHover={setHover} onPrev={null} onNext={() => setOffset(o => o + 1)} />
          </div>
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

// ─── Contas Filter ────────────────────────────────────────────────────────────
function ContasFiltro({ contas, sel, onSel }) {
  const todasSel = sel.length === 0 || sel.length === contas.length;
  const toggle = (id) => sel.includes(id) ? onSel(sel.filter(c => c !== id)) : onSel([...sel, id]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
          ${!todasSel ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
          <SlidersHorizontal className="w-3 h-3" />
          {todasSel ? 'Contas' : `${sel.length} conta${sel.length > 1 ? 's' : ''}`}
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

// ─── Lancamento Row ───────────────────────────────────────────────────────────
function LancRow({ l, onClick }) {
  const isR = l.tipo === 'Receita';
  const pago = l.status === 'Pago';
  const prev = !pago && l.status !== 'Cancelado';
  const conc = l.status_conciliacao || 'N/A';
  const data = l.data_pagamento || l.data_vencimento;
  const val  = Math.abs(l.valor || 0);

  return (
    <button
      onClick={() => onClick(l)}
      className="w-full flex items-center gap-2.5 px-3.5 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left overflow-hidden"
    >
      {/* Ícone */}
      <span className={`flex-none w-8 h-8 rounded-xl flex items-center justify-center shrink-0
        ${isR ? (pago ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-700') : (pago ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-gray-700')}`}>
        {isR
          ? <ArrowDownLeft className={`w-3.5 h-3.5 ${pago ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
          : <ArrowUpRight  className={`w-3.5 h-3.5 ${pago ? 'text-red-500 dark:text-red-400'   : 'text-gray-400'}`} />
        }
      </span>

      {/* Descrição — flex-1 com min-w-0 para truncar corretamente */}
      <span className="flex-1 min-w-0 overflow-hidden">
        <span className={`block text-[0.8rem] font-medium leading-snug truncate ${prev ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
          {l.descricao}
        </span>
        <span className="block text-[0.68rem] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
          {data ? format(new Date(data), 'dd MMM', { locale: ptBR }) : '—'}
          {l.conta_financeira_nome ? ` · ${l.conta_financeira_nome}` : ''}
          {prev ? <span className="ml-1 bg-gray-100 dark:bg-gray-700 text-gray-400 rounded px-1 text-[0.6rem]">prev.</span> : null}
        </span>
      </span>

      {/* Valor — shrink-0 para nunca ser comprimido */}
      <span className="shrink-0 flex flex-col items-end gap-0.5 pl-2">
        <span className={`text-[0.82rem] font-bold whitespace-nowrap
          ${isR ? (pago ? 'text-green-600 dark:text-green-400' : 'text-gray-400') : (pago ? 'text-red-500 dark:text-red-400' : 'text-gray-400')}`}>
          {isR ? '+' : '−'}{R(val)}
        </span>
        {conc === 'Pendente'     && <Clock         className="w-2.5 h-2.5 text-amber-400" />}
        {conc === 'Discrepância' && <AlertCircle   className="w-2.5 h-2.5 text-red-400" />}
      </span>
    </button>
  );
}

// ─── Grupo data ───────────────────────────────────────────────────────────────
function Grupo({ label, items, onRow }) {
  return (
    <div className="w-full overflow-hidden">
      <p className="text-[0.62rem] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-1 py-1.5">{label}</p>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
        {items.map(l => <LancRow key={l.id} l={l} onClick={onRow} />)}
      </div>
    </div>
  );
}

// ─── FAB ──────────────────────────────────────────────────────────────────────
const FAB_ITEMS = [
  { tipo: 'Receita',       icon: ArrowDownLeft,  label: 'Receita' },
  { tipo: 'Despesa',       icon: ArrowUpRight,   label: 'Despesa' },
  { tipo: 'Transferência', icon: ArrowRightLeft, label: 'Transferência' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FluxoCaixaTabV2() {
  const [lancs, setLancs]         = useState([]);
  const [contas, setContas]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [periodo, setPeriodo]     = useState('mes');
  const [cs, setCs]               = useState('');   // customStart
  const [ce, setCe]               = useState('');   // customEnd
  const [contasSel, setContasSel] = useState([]);
  const [pendentes, setPendentes] = useState(false);
  const [fabOpen, setFabOpen]     = useState(false);
  const [novoTipo, setNovoTipo]   = useState('Despesa');
  const [showNovo, setShowNovo]   = useState(false);
  const [detalhe, setDetalhe]     = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [ls, cts] = await Promise.all([
      base44.entities.LancamentoFinanceiro.list('-data_vencimento'),
      base44.entities.ContasFinanceiras.filter({ ativo: true }),
    ]);
    setLancs(ls); setContas(cts); setLoading(false);
  };

  const { s: ds, e: de } = useMemo(() => dateRange(periodo, cs, ce), [periodo, cs, ce]);

  const filtrados = useMemo(() => lancs.filter(l => {
    if (l.status === 'Cancelado') return false;
    const dr = l.data_pagamento ? new Date(l.data_pagamento) : l.data_vencimento ? new Date(l.data_vencimento) : null;
    if (ds && de && dr && !isWithinInterval(dr, { start: ds, end: de })) return false;
    if (contasSel.length && !contasSel.includes(l.conta_financeira_id)) return false;
    if (pendentes && l.status_conciliacao !== 'Pendente') return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.descricao||'').toLowerCase().includes(q) || (l.categoria||'').toLowerCase().includes(q) ||
             (l.conta_financeira_nome||'').toLowerCase().includes(q) || (l.referencia_numero||'').toLowerCase().includes(q);
    }
    return true;
  }), [lancs, ds, de, contasSel, pendentes, search]);

  const kpis = useMemo(() => {
    let entrou = 0, saiu = 0, pEntrou = 0, pSaiu = 0;
    filtrados.forEach(l => {
      if (l.status === 'Pago') { if (l.tipo === 'Receita') entrou += l.valor||0; else if (l.tipo === 'Despesa') saiu += l.valor||0; }
      else { if (l.tipo === 'Receita') pEntrou += l.valor||0; else if (l.tipo === 'Despesa') pSaiu += l.valor||0; }
    });
    return { entrou, saiu, saldo: entrou - saiu, pEntrou, pSaiu, saldoPrev: entrou + pEntrou - saiu - pSaiu };
  }, [filtrados]);

  const grupos = useMemo(() => {
    const h = new Date();
    const hStr = format(h, 'yyyy-MM-dd');
    const oStr = format(subDays(h, 1), 'yyyy-MM-dd');
    const map = {};
    filtrados.forEach(l => {
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
      return { k, label, items };
    });
  }, [filtrados]);

  const totalPend = useMemo(() => lancs.filter(l => l.status_conciliacao === 'Pendente').length, [lancs]);

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden overflow-y-visible space-y-3 pb-28" style={{ contain: 'paint' }}>

      {/* KPIs — mobile: coluna, desktop: grid */}
      <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0">
        <KpiCard label="Entrou" value={R(kpis.entrou)} />
        <KpiCard label="Saiu"   value={R(kpis.saiu)} neg={kpis.saiu > 0} />
      </div>
      
      {/* Saldo do período — destaque */}
      <KpiCard
        label="Saldo do período" value={R(kpis.saldo)} neg={kpis.saldo < 0} dark
        sub={kpis.pEntrou > 0 || kpis.pSaiu > 0 ? `Projeção: ${R(kpis.saldoPrev)}` : null}
      />

      {/* Alerta pendentes */}
      {totalPend > 0 && !pendentes && (
        <button onClick={() => setPendentes(true)}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs text-left">
          <Clock className="w-3.5 h-3.5 flex-none" />
          <span className="flex-1 truncate">{totalPend} lançamento{totalPend > 1 ? 's' : ''} aguardando conciliação</span>
          <span className="font-semibold">Ver →</span>
        </button>
      )}

      {/* Busca + Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
        {/* busca */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-50 dark:border-white/5">
          <Search className="w-4 h-4 text-gray-400 flex-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar movimentações..."
            className="flex-1 min-w-0 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 outline-none"
          />
          {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
        </div>

        {/* chips período */}
        <div className="px-2 py-2.5 relative">
          <PeriodoPicker
            periodo={periodo} onPeriodo={setPeriodo}
            customStart={cs} customEnd={ce}
            onCustom={(k, v) => k === 'start' ? setCs(v) : setCe(v)}
          />
        </div>

        {/* filtros secundários */}
        <div className="flex gap-2 px-3 pb-3">
          <ContasFiltro contas={contas} sel={contasSel} onSel={setContasSel} />
          <button
            onClick={() => setPendentes(p => !p)}
            className={`flex-none px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
              ${pendentes ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
            Não conciliados
          </button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : grupos.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm py-16 flex flex-col items-center gap-2">
          <Scale className="w-9 h-9 text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-400">Nenhuma movimentação encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map(({ k, label, items }) => <Grupo key={k} label={label} items={items} onRow={setDetalhe} />)}
        </div>
      )}

      {/* FAB */}
      {fabOpen && <div className="fixed inset-0 z-20" onClick={() => setFabOpen(false)} />}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 flex flex-col items-end gap-2">
        {fabOpen && FAB_ITEMS.map(({ tipo, icon: Icon, label }) => (
          <button key={tipo}
            onClick={() => { setNovoTipo(tipo); setShowNovo(true); setFabOpen(false); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-900 dark:bg-gray-200 text-white dark:text-gray-900 text-sm font-medium shadow-lg whitespace-nowrap active:scale-95 transition-transform">
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
        <button
          onClick={() => setFabOpen(o => !o)}
          className={`w-13 h-13 w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all
            ${fabOpen ? 'bg-gray-500 rotate-45' : 'bg-gray-900 dark:bg-gray-200'}`}>
          <Plus className={`w-6 h-6 ${fabOpen ? 'text-white' : 'text-white dark:text-gray-900'}`} />
        </button>
      </div>

      {/* Dialogs */}
      <NovoLancamentoDialog open={showNovo} tipoInicial={novoTipo} onClose={() => setShowNovo(false)} onSaved={load} />
      {detalhe && <LancamentoDetalheDialog lancamento={detalhe} contas={contas} onClose={() => setDetalhe(null)} onSaved={() => { load(); setDetalhe(null); }} />}
    </div>
  );
}