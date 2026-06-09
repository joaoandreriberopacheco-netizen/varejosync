import React, { useState } from 'react';
import {
  Search, X, Wallet, BarChart3, Clock, ChevronDown,
  ChevronLeft, ChevronRight, SlidersHorizontal, Layers, RefreshCw
} from 'lucide-react';
import { dataHoje } from '@/components/utils/dateUtils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  format, isWithinInterval, subDays,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  isSameDay, isBefore, eachDayOfInterval, getDay, addMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── P38 tokens (alinhado a p38ThemeSurfaces / Relatório de Margem) ───────────
const P38_CHIP_ACTIVE =
  'bg-[#4a5240] text-white dark:bg-[#a4ce33] dark:text-[#1f1d22]';
const P38_CHIP_INACTIVE =
  'bg-secondary/80 text-muted-foreground dark:bg-[#26262e] dark:text-foreground/80 hover:bg-secondary dark:hover:bg-[#383e47]';
const P38_SEARCH =
  'p38-search-field border-0 shadow-none focus-visible:ring-1 focus-visible:ring-border/60';
const P38_POPOVER =
  'border border-border/40 dark:border-white/10 shadow-xl rounded-2xl bg-card dark:bg-[#2d333b]';
const P38_CAL_SELECTED =
  'bg-[#4a5240] text-white dark:bg-[#a4ce33] dark:text-[#1f1d22] font-bold';
const P38_CAL_IN_RANGE =
  'bg-[#4a5240]/15 text-foreground/90 dark:bg-[#a4ce33]/15 dark:text-foreground';

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
          ? <button type="button" onClick={onPrev} className="p-1 rounded-lg hover:bg-secondary/80 dark:hover:bg-[#383e47] text-muted-foreground"><ChevronLeft className="w-3.5 h-3.5" /></button>
          : <span className="w-6" />}
        <span className="text-[0.72rem] font-semibold text-foreground/90 capitalize">
          {format(first, 'MMMM yyyy', { locale: ptBR })}
        </span>
        {onNext
          ? <button type="button" onClick={onNext} className="p-1 rounded-lg hover:bg-secondary/80 dark:hover:bg-[#383e47] text-muted-foreground"><ChevronRight className="w-3.5 h-3.5" /></button>
          : <span className="w-6" />}
      </div>
      <div className="grid grid-cols-7 gap-px mb-0.5">
        {DIAS_SEMANA.map((d, i) => <div key={i} className="text-center text-[0.6rem] font-medium text-muted-foreground py-0.5">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {Array(pad).fill(null).map((_, i) => <div key={'p' + i} />)}
        {days.map((d) => {
          const isS = rangeStart && isSameDay(d, rangeStart);
          const isE = rangeEnd && isSameDay(d, rangeEnd);
          const in_ = inRange(d);
          return (
            <button
              type="button"
              key={d.toISOString()}
              onClick={() => onDay(d)}
              onMouseEnter={() => onHover(d)}
              className={`text-center text-[0.7rem] py-1 rounded-lg transition-colors
                ${isS || isE ? P38_CAL_SELECTED : ''}
                ${in_ && !isS && !isE ? P38_CAL_IN_RANGE : ''}
                ${!isS && !isE && !in_ ? 'text-muted-foreground hover:bg-secondary/80 dark:hover:bg-[#383e47]' : ''}
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

function PeriodoPicker({ periodo, onPeriodo, customStart, customEnd, onCustom, inline = false }) {
  const [showCal, setShowCal] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hover, setHover] = useState(null);

  const hoje = new Date(`${dataHoje()}T12:00:00Z`);
  const baseLeft = addMonths(new Date(hoje.getFullYear(), hoje.getMonth(), 1), offset);
  const rs = customStart ? new Date(`${customStart}T12:00:00Z`) : null;
  const re = customEnd ? new Date(`${customEnd}T12:00:00Z`) : null;

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

  const renderChip = (c) => (
    <button
      type="button"
      key={c.v}
      onClick={() => { onPeriodo(c.v); if (c.v === 'periodo') setShowCal(s => !s); else setShowCal(false); }}
      className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
        ${periodo === c.v ? P38_CHIP_ACTIVE : P38_CHIP_INACTIVE}`}
    >
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
      {inline ? (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
          {CHIPS.map(renderChip)}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">{CHIPS.slice(0, 2).map(renderChip)}</div>
          <div className="flex gap-1.5">{CHIPS.slice(2, 4).map(renderChip)}</div>
          <div className="flex gap-1.5">{CHIPS.slice(4).map(renderChip)}</div>
        </div>
      )}
      {showCal && periodo === 'periodo' && (
        <div className={`absolute left-0 z-50 mt-2 rounded-2xl p-3 ${P38_POPOVER} ${inline ? 'w-[min(320px,100%)]' : 'right-0'}`}>
          <MiniCal base={baseLeft} rangeStart={rs} rangeEnd={re} hover={hover} onDay={handleDay} onHover={setHover} onPrev={() => setOffset(o => o - 1)} onNext={() => setOffset(o => o + 1)} />
          {rs && re && (
            <div className="mt-2 flex items-center justify-between rounded-xl bg-secondary/60 dark:bg-[#26262e] px-3 py-2">
              <span className="text-xs text-muted-foreground">
                {format(rs, 'dd MMM yyyy', { locale: ptBR })} → {format(re, 'dd MMM yyyy', { locale: ptBR })}
              </span>
              <button type="button" onClick={() => setShowCal(false)} className={`text-xs font-semibold px-3 py-1 rounded-lg ${P38_CHIP_ACTIVE}`}>OK</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Filtro Contas ────────────────────────────────────────────────────────────
function ContasFiltro({ contas, sel, onSel }) {
  const allIds = contas.map(c => c.id);
  const todasSel = contas.length > 0 && sel.length === contas.length;
  const toggle = (id) => sel.includes(id) ? onSel(sel.filter(c => c !== id)) : onSel([...sel, id]);
  const handleTodas = () => onSel(todasSel ? [] : allIds);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all shadow-sm
          ${!todasSel ? P38_CHIP_ACTIVE : P38_CHIP_INACTIVE}`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>{todasSel ? 'Todas as contas' : `${sel.length} selecionada${sel.length > 1 ? 's' : ''}`}</span>
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent className={`w-64 p-2.5 ${P38_POPOVER}`} align="start">
        <div className="mb-2 px-2 pt-1">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Contas financeiras</p>
        </div>
        <button
          type="button"
          onClick={handleTodas}
          className={`w-full text-left px-3 py-2 rounded-2xl text-xs mb-1.5 transition-colors ${todasSel
            ? `${P38_CHIP_ACTIVE} font-medium`
            : 'text-muted-foreground hover:bg-secondary/80 dark:hover:bg-[#383e47]'}`}
        >
          Todas as contas
        </button>
        <div className="space-y-1">
          {contas.map(c => (
            <label
              key={c.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all ${sel.includes(c.id)
                ? 'bg-secondary/80 dark:bg-[#383e47] shadow-sm'
                : 'hover:bg-secondary/60 dark:hover:bg-[#383e47]/60'}`}
            >
              <Checkbox checked={sel.includes(c.id)} onCheckedChange={() => toggle(c.id)} className="w-4 h-4" />
              <span className="w-2.5 h-2.5 rounded-full flex-none shadow-sm" style={{ background: c.cor || '#a4ce33' }} />
              <span className="text-xs truncate text-foreground/90">{c.nome}</span>
            </label>
          ))}
        </div>
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
        <button
          type="button"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
          ${!todasSel ? P38_CHIP_ACTIVE : P38_CHIP_INACTIVE}`}
        >
          <RefreshCw className="w-3 h-3" />
          {label}
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className={`w-44 p-2 ${P38_POPOVER}`} align="start">
        <button type="button" onClick={() => onSel([])} className={`w-full text-left px-2 py-1.5 rounded text-xs mb-1 ${todasSel ? `${P38_CHIP_ACTIVE} font-medium` : 'hover:bg-secondary/80 dark:hover:bg-[#383e47]'} text-foreground/90`}>
          Todos
        </button>
        {ALL.map(t => (
          <label key={t} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/80 dark:hover:bg-[#383e47] cursor-pointer">
            <Checkbox checked={sel.includes(t)} onCheckedChange={() => toggle(t)} className="w-3.5 h-3.5" />
            <span className="text-xs text-foreground/90">{t}</span>
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
        <button
          type="button"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
          ${!todasSel ? P38_CHIP_ACTIVE : P38_CHIP_INACTIVE}`}
        >
          <BarChart3 className="w-3 h-3" />
          {todasSel ? 'Tipo' : sel.join(', ')}
          <ChevronDown className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className={`w-44 p-2 ${P38_POPOVER}`} align="start">
        {ALL.map(t => (
          <label key={t} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/80 dark:hover:bg-[#383e47] cursor-pointer">
            <Checkbox checked={sel.length === 0 || sel.includes(t)} onCheckedChange={() => toggle(t)} className="w-3.5 h-3.5" />
            <span className="text-xs text-foreground/90">{t}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function CmvFiltro({ cmvOnly, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!cmvOnly)}
      className={`flex-none flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${cmvOnly ? P38_CHIP_ACTIVE : P38_CHIP_INACTIVE}`}
    >
      <Layers className="w-3 h-3" /> CMV
    </button>
  );
}

function ConciliacaoLoteFiltro({ contas, onOpenConciliacao }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={`flex-none flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${P38_CHIP_INACTIVE}`}>
          <Clock className="w-3 h-3" /> Conciliar em lote
        </button>
      </PopoverTrigger>
      <PopoverContent className={`w-56 p-2 ${P38_POPOVER}`} align="start">
        <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">Escolha a conta</p>
        <button
          type="button"
          onClick={() => onOpenConciliacao?.(null)}
          className="w-full text-left px-2 py-2 rounded text-xs hover:bg-secondary/80 dark:hover:bg-[#383e47] text-foreground/90"
        >
          Todas as contas
        </button>
        {contas.map(c => (
          <button
            type="button"
            key={c.id}
            onClick={() => onOpenConciliacao?.(c)}
            className="w-full text-left px-2 py-2 rounded text-xs hover:bg-secondary/80 dark:hover:bg-[#383e47] text-foreground/90"
          >
            {c.nome}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function PendentesFiltro({ pendentes, onPendentes }) {
  return (
    <button
      type="button"
      onClick={() => onPendentes(!pendentes)}
      className={`flex-none flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${pendentes ? P38_CHIP_ACTIVE : P38_CHIP_INACTIVE}`}
    >
      <Clock className="w-3 h-3" /> Conciliação
    </button>
  );
}

// ─── Painel de filtros (compartilhado mobile drawer + desktop inline) ─────────
function FiltrosFluxoPainel({
  periodo, onPeriodo, customStart, customEnd, onCustom,
  contas, contasSel, onContasSel,
  tiposSel, onTiposSel,
  statusSel, onStatusSel,
  pendentes, onPendentes,
  cmvOnly, onCmvOnly,
  onOpenConciliacao,
  onLimparFiltros,
  onClose,
  inline = false,
  showActions = false,
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Período</label>
        <PeriodoPicker
          periodo={periodo}
          onPeriodo={onPeriodo}
          customStart={customStart}
          customEnd={customEnd}
          onCustom={onCustom}
          inline={inline}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <ContasFiltro contas={contas} sel={contasSel} onSel={onContasSel} />
        <TipoFiltro sel={tiposSel} onSel={onTiposSel} />
        <StatusFiltro sel={statusSel} onSel={onStatusSel} />
        <CmvFiltro cmvOnly={cmvOnly} onToggle={onCmvOnly} />
        <PendentesFiltro pendentes={pendentes} onPendentes={onPendentes} />
        <ConciliacaoLoteFiltro contas={contas} onOpenConciliacao={onOpenConciliacao} />
      </div>

      {showActions && (
        <div className="flex gap-2 pt-2 md:hidden">
          <button type="button" onClick={onLimparFiltros} className={`flex-1 h-11 rounded-2xl text-sm ${P38_CHIP_INACTIVE}`}>
            Limpar
          </button>
          <button type="button" onClick={onClose} className={`flex-1 h-11 rounded-2xl text-sm ${P38_CHIP_ACTIVE}`}>
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Export Principal ─────────────────────────────────────────────────────────
export { PeriodoPicker, ContasFiltro, TipoFiltro, StatusFiltro, CmvFiltro, ConciliacaoLoteFiltro };

export default function FiltrosFluxoCaixa({
  search, onSearch,
  periodo, onPeriodo, customStart, customEnd, onCustom,
  contas, contasSel, onContasSel,
  tiposSel, onTiposSel,
  statusSel, onStatusSel,
  pendentes, onPendentes,
  cmvOnly, onCmvOnly,
  onOpenConciliacao,
  totalFiltrados, hasActiveFilters, onLimparFiltros,
}) {
  const [open, setOpen] = useState(false);

  const painelProps = {
    periodo, onPeriodo, customStart, customEnd, onCustom,
    contas, contasSel, onContasSel,
    tiposSel, onTiposSel,
    statusSel, onStatusSel,
    pendentes, onPendentes,
    cmvOnly, onCmvOnly,
    onOpenConciliacao,
    onLimparFiltros,
    onClose: () => setOpen(false),
  };

  return (
    <>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <div className={`flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[14px] px-2.5 sm:h-12 sm:rounded-[16px] sm:px-3 ${P38_SEARCH}`}>
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
            <input
              autoComplete="off"
              value={search}
              onChange={e => onSearch(e.target.value)}
              placeholder="Buscar lançamento, categoria, tag..."
              className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
            />
            {search && (
              <button type="button" onClick={() => onSearch('')}>
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Botão filtros — só mobile */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-foreground sm:h-12 sm:w-12 sm:rounded-[16px] md:hidden ${P38_SEARCH}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {hasActiveFilters && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#4a5240] dark:bg-[#a4ce33] text-[10px] text-white dark:text-[#1f1d22] flex items-center justify-center">•</span>
            )}
          </button>
        </div>

        {/* Filtros inline — desktop */}
        <div className="hidden md:block mt-3 pt-3 border-t border-border/40 dark:border-white/10">
          <FiltrosFluxoPainel {...painelProps} inline showActions={false} />
        </div>

        <div className="mt-2.5 flex items-center justify-between border-t border-border/40 px-1.5 pt-2.5 dark:border-white/10">
          <p className="text-[11px] text-muted-foreground">{totalFiltrados} lançamento{totalFiltrados !== 1 ? 's' : ''}</p>
          {hasActiveFilters && (
            <button type="button" onClick={onLimparFiltros} className="text-[11px] text-muted-foreground hover:text-foreground/90 flex items-center gap-1">
              <X className="w-3 h-3" /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Drawer — só mobile */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="border-0 rounded-t-[28px] bg-card dark:bg-[#2d333b] px-4 pb-6 md:hidden">
          <DrawerHeader className="px-0 pb-2 text-left">
            <DrawerTitle className="font-glacial text-foreground">Filtros</DrawerTitle>
          </DrawerHeader>
          <FiltrosFluxoPainel {...painelProps} inline={false} showActions />
        </DrawerContent>
      </Drawer>
    </>
  );
}
