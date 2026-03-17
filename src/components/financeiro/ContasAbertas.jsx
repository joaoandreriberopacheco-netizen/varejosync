import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  format, isWithinInterval, startOfDay, endOfDay, addDays,
  startOfMonth, endOfMonth, isBefore, isAfter, addMonths,
  eachDayOfInterval, getDay, isSameDay, subDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowDownLeft, ArrowUpRight, Plus, X, Search,
  SlidersHorizontal, ChevronDown, AlertTriangle, Calendar,
  ChevronLeft, ChevronRight, CheckCircle2
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import NovoLancamentoDialog from './NovoLancamentoDialog';
import LancamentoDetalheDialog from './LancamentoDetalheDialog';

// ─── utils ────────────────────────────────────────────────────────────────────
const R = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const hoje = () => new Date();
const hojeStr = () => format(hoje(), 'yyyy-MM-dd');

function getVencimento(l) {
  return l.data_vencimento ? format(new Date(l.data_vencimento + 'T12:00:00'), 'yyyy-MM-dd') : null;
}

// ─── Chips de período ─────────────────────────────────────────────────────────
const PERIODOS = [
  { v: 'vencidas',    l: 'Vencidas' },
  { v: 'hoje',        l: 'Hoje' },
  { v: 'semana',      l: '7 dias' },
  { v: 'mes',         l: 'Mês' },
  { v: 'futuras',     l: 'Futuras' },
  { v: 'todas',       l: 'Todas' },
];

function periodoRange(p) {
  const h = new Date();
  const hStr = hojeStr();
  if (p === 'vencidas') return { s: null, e: startOfDay(h), vencidas: true };
  if (p === 'hoje')     return { s: startOfDay(h), e: endOfDay(h) };
  if (p === 'semana')   return { s: startOfDay(h), e: endOfDay(addDays(h, 7)) };
  if (p === 'mes')      return { s: startOfDay(h), e: endOfMonth(h) };
  if (p === 'futuras')  return { s: addDays(h, 1), e: null };
  return { s: null, e: null }; // todas
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────
function KpiAbertas({ kpis }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-3">
          <p className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">A Receber</p>
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{R(kpis.aReceber)}</p>
          {kpis.qtdReceber > 0 && <p className="text-[9px] text-gray-400 dark:text-gray-500">{kpis.qtdReceber} lançamento{kpis.qtdReceber !== 1 ? 's' : ''}</p>}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-3">
          <p className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">A Pagar</p>
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{R(kpis.aPagar)}</p>
          {kpis.qtdPagar > 0 && <p className="text-[9px] text-gray-400 dark:text-gray-500">{kpis.qtdPagar} lançamento{kpis.qtdPagar !== 1 ? 's' : ''}</p>}
        </div>
      </div>

      {/* Saldo projetado */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-3 flex items-center justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">Saldo Projetado</p>
          <p className={`text-base font-bold ${kpis.saldoProjetado >= 0 ? 'text-gray-800 dark:text-gray-100' : 'text-red-500 dark:text-red-400'}`}>
            {R(kpis.saldoProjetado)}
          </p>
        </div>
        {kpis.vencidas > 0 && (
          <div className="flex items-center gap-1.5 text-right">
            <AlertTriangle className="w-3.5 h-3.5 text-gray-400 flex-none" />
            <div>
              <p className="text-[9px] text-gray-400 dark:text-gray-500">Vencidas</p>
              <p className="text-xs font-semibold text-red-500 dark:text-red-400">{R(kpis.vencidas)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// (ContasFiltro removido — seleção de conta apenas na efetivação)

// ─── Linha de lançamento em aberto ────────────────────────────────────────────
function ContaRow({ l, onPagar, onClick }) {
  const isR = l.tipo === 'Receita';
  const hStr = hojeStr();
  const vStr = getVencimento(l);
  const isVencida = vStr && vStr < hStr;
  const isHoje = vStr === hStr;
  const val = Math.abs(l.valor || 0);
  const frequencia = l.frequencia_recorrencia;

  return (
    <button
      onClick={() => onClick(l)}
      className="w-full flex items-center gap-2.5 px-3.5 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left overflow-hidden"
    >
      {/* Ícone tipo */}
      <span className={`flex-none w-8 h-8 rounded-xl flex items-center justify-center shrink-0
        ${isR ? 'bg-green-50 dark:bg-green-900/20' : isVencida ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
        {isR
          ? <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" />
          : <ArrowUpRight  className={`w-3.5 h-3.5 ${isVencida ? 'text-red-400' : 'text-gray-400'}`} />
        }
      </span>

      {/* Descrição */}
      <span className="flex-1 min-w-0 overflow-hidden">
        <span className="block text-[0.8rem] font-medium leading-snug text-gray-800 dark:text-gray-100 break-words">
          {l.descricao}
          {frequencia && (
            <span className="ml-1.5 text-[0.6rem] bg-gray-100 dark:bg-gray-700 text-gray-400 rounded px-1.5 py-0.5 font-normal">{frequencia}</span>
          )}
        </span>
        <span className="block text-[0.68rem] text-gray-400 mt-0.5 truncate">
          {vStr
            ? isVencida ? <span className="text-red-400">Venceu {format(new Date(vStr + 'T12:00:00'), 'dd MMM', { locale: ptBR })}</span>
            : isHoje    ? <span className="text-amber-500">Vence hoje</span>
            : format(new Date(vStr + 'T12:00:00'), 'dd MMM yyyy', { locale: ptBR })
            : '—'}
          {l.conta_financeira_nome ? ` · ${l.conta_financeira_nome}` : ''}
          {l.categoria ? ` · ${l.categoria}` : ''}
        </span>
      </span>

      {/* Valor + botão pagar rápido */}
      <span className="shrink-0 flex flex-col items-end gap-1 pl-2">
        <span className={`text-[0.82rem] font-bold whitespace-nowrap
          ${isR ? 'text-green-600 dark:text-green-400' : isVencida ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
          {isR ? '+' : '−'}{R(val)}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onPagar(l); }}
          className="flex items-center gap-0.5 text-[0.6rem] text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 font-medium"
        >
          <CheckCircle2 className="w-2.5 h-2.5" /> Pagar
        </button>
      </span>
    </button>
  );
}

// ─── Grupo por data de vencimento ─────────────────────────────────────────────
function GrupoContas({ label, items, onPagar, onRow, aReceberDia, aPagarDia, isVencido }) {
  return (
    <div className="w-full overflow-hidden">
      <div className="flex items-center justify-between px-1 py-1.5">
        <p className={`text-[0.62rem] font-semibold uppercase tracking-widest ${isVencido ? 'text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
          {label}
        </p>
        <div className="flex items-center gap-2">
          {aReceberDia > 0 && <span className="text-[0.62rem] text-green-600 dark:text-green-400">+{R(aReceberDia)}</span>}
          {aPagarDia   > 0 && <span className="text-[0.62rem] text-red-400">−{R(aPagarDia)}</span>}
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
        {items.map(l => <ContaRow key={l.id} l={l} onPagar={onPagar} onClick={onRow} />)}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ContasAbertas() {
  const [lancs, setLancs]         = useState([]);
  const [contas, setContas]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [periodo, setPeriodo]     = useState('mes');
  const [tipoFiltro, setTipoFiltro] = useState('todos'); // 'todos' | 'Receita' | 'Despesa'
  const [contasSel, setContasSel] = useState([]);
  const [search, setSearch]       = useState('');
  const [showNovo, setShowNovo]   = useState(false);
  const [novoTipo, setNovoTipo]   = useState('Despesa');
  const [fabOpen, setFabOpen]     = useState(false);
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

  // Apenas lançamentos NÃO pagos e não cancelados
  const emAberto = useMemo(() =>
    lancs.filter(l => l.status !== 'Pago' && l.status !== 'Cancelado' && l.tipo !== 'Transferência'),
  [lancs]);

  const { s: ds, e: de, vencidas: soVencidas } = useMemo(() => periodoRange(periodo), [periodo]);

  const filtrados = useMemo(() => emAberto.filter(l => {
    const vStr = getVencimento(l);
    const vDate = vStr ? new Date(vStr + 'T12:00:00') : null;

    // Período
    if (periodo === 'vencidas') {
      if (!vStr || vStr >= hojeStr()) return false;
    } else if (ds && de && vDate) {
      if (!isWithinInterval(vDate, { start: ds, end: de })) return false;
    } else if (ds && !de && vDate) {
      if (isBefore(vDate, ds)) return false;
    }

    if (tipoFiltro !== 'todos' && l.tipo !== tipoFiltro) return false;
    if (contasSel.length && l.conta_financeira_id && !contasSel.includes(l.conta_financeira_id)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.descricao || '').toLowerCase().includes(q) ||
             (l.categoria || '').toLowerCase().includes(q) ||
             (l.terceiro_nome || '').toLowerCase().includes(q);
    }
    return true;
  }), [emAberto, periodo, ds, de, tipoFiltro, contasSel, search]);

  const kpis = useMemo(() => {
    let aReceber = 0, aPagar = 0, qtdReceber = 0, qtdPagar = 0, vencidas = 0;
    const hStr = hojeStr();
    filtrados.forEach(l => {
      const vStr = getVencimento(l);
      if (l.tipo === 'Receita') { aReceber += l.valor || 0; qtdReceber++; }
      else { aPagar += l.valor || 0; qtdPagar++; }
      if (vStr && vStr < hStr) vencidas += l.valor || 0;
    });
    return { aReceber, aPagar, saldoProjetado: aReceber - aPagar, qtdReceber, qtdPagar, vencidas };
  }, [filtrados]);

  const grupos = useMemo(() => {
    const hStr = hojeStr();
    const oStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const map = {};
    filtrados.forEach(l => {
      const k = getVencimento(l) || 'sem-data';
      (map[k] = map[k] || []).push(l);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, items]) => {
        const isVencido = k !== 'sem-data' && k < hStr;
        let label = 'Sem vencimento';
        if (k !== 'sem-data') {
          const d = new Date(k + 'T12:00:00');
          label = k === hStr ? 'Hoje' : k === oStr ? 'Ontem' :
            isVencido ? `Venceu ${format(d, "dd 'de' MMMM", { locale: ptBR })}` :
            format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
        }
        const aReceberDia = items.filter(l => l.tipo === 'Receita').reduce((s, l) => s + (l.valor || 0), 0);
        const aPagarDia   = items.filter(l => l.tipo === 'Despesa').reduce((s, l) => s + (l.valor || 0), 0);
        return { k, label, items, aReceberDia, aPagarDia, isVencido };
      });
  }, [filtrados]);

  // Marcar como pago rapidamente (abre detalhe pre-configurado)
  const handlePagarRapido = (l) => setDetalhe(l);

  const FAB_ITEMS = [
    { tipo: 'Receita', icon: ArrowDownLeft, label: 'A Receber' },
    { tipo: 'Despesa', icon: ArrowUpRight,  label: 'A Pagar' },
  ];

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-3 pb-28">

      {/* KPIs */}
      <KpiAbertas kpis={kpis} />

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
        {/* Busca */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-50 dark:border-white/5">
          <Search className="w-4 h-4 text-gray-400 flex-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="flex-1 min-w-0 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 outline-none"
          />
          {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
        </div>

        {/* Chips período */}
        <div className="px-3 py-2 border-b border-gray-50 dark:border-white/5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <div className="flex gap-1.5">
            {PERIODOS.map(p => (
              <button key={p.v} onClick={() => setPeriodo(p.v)}
                className={`flex-none px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                  ${periodo === p.v ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
                {p.l}
              </button>
            ))}
          </div>
        </div>

        {/* Tipo + Contas */}
        <div className="px-3 pb-2.5 pt-2 flex gap-2 flex-wrap">
          {['todos', 'Receita', 'Despesa'].map(t => (
            <button key={t} onClick={() => setTipoFiltro(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors
                ${tipoFiltro === t ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'}`}>
              {t === 'todos' ? 'Todos' : t === 'Receita' ? 'A Receber' : 'A Pagar'}
            </button>
          ))}
          <ContasFiltro contas={contas} sel={contasSel} onSel={setContasSel} />
        </div>

        <div className="px-3 pb-2">
          <p className="text-[0.65rem] text-gray-400">{filtrados.length} lançamento{filtrados.length !== 1 ? 's' : ''} em aberto</p>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : grupos.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm py-16 flex flex-col items-center gap-2">
          <Calendar className="w-9 h-9 text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-400">Nenhuma conta em aberto</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grupos.map(({ k, label, items, aReceberDia, aPagarDia, isVencido }) => (
            <GrupoContas key={k} label={label} items={items}
              onPagar={handlePagarRapido} onRow={setDetalhe}
              aReceberDia={aReceberDia} aPagarDia={aPagarDia}
              isVencido={isVencido}
            />
          ))}
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
          className={`w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all ${fabOpen ? 'bg-gray-400 rotate-45' : 'bg-gray-900 dark:bg-gray-200'}`}>
          <Plus className={`w-6 h-6 ${fabOpen ? 'text-white' : 'text-white dark:text-gray-900'}`} />
        </button>
      </div>

      {/* Dialogs */}
      <NovoLancamentoDialog open={showNovo} tipoInicial={novoTipo} onClose={() => setShowNovo(false)} onSaved={load} />
      {detalhe && <LancamentoDetalheDialog lancamento={detalhe} contas={contas} onClose={() => setDetalhe(null)} onSaved={() => { load(); setDetalhe(null); }} />}
    </div>
  );
}