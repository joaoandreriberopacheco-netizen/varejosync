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
  AlertTriangle, Calendar, CheckCircle2, FileText, SlidersHorizontal
} from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Checkbox } from '@/components/ui/checkbox';
import { dataHoje } from '@/components/utils/dateUtils';
import NovoLancamentoDialog from './NovoLancamentoDialog';
import LancamentoDetalheDialog from './LancamentoDetalheDialog';
import PagamentoLoteDialog from './PagamentoLoteDialog';

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
  { v: 'personalizado', l: 'Personalizado' },
];

function periodoRange(p, cs, ce) {
  const h = new Date();
  if (p === 'vencidas') return { s: null, e: startOfDay(h), vencidas: true };
  if (p === 'hoje')     return { s: startOfDay(h), e: endOfDay(h) };
  if (p === 'semana')   return { s: startOfDay(h), e: endOfDay(addDays(h, 7)) };
  if (p === 'mes')      return { s: startOfMonth(h), e: endOfMonth(h) };
  if (p === 'futuras')  return { s: addDays(h, 1), e: null };
  if (p === 'personalizado') return {
    s: cs ? startOfDay(new Date(cs)) : null,
    e: ce ? endOfDay(new Date(ce)) : null,
  };
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
function ContaRow({ l, onPagar, onClick, emSelecao, selecionado, onToggleSelecionado }) {
  const isR = l.tipo === 'Receita';
  const hStr = hojeStr();
  const vStr = getVencimento(l);
  const isVencida = vStr && vStr < hStr;
  const isHoje = vStr === hStr;
  const val = Math.abs(l.valor || 0);
  const frequencia = l.frequencia_recorrencia;

  const isPago = l.status === 'Pago';

  return (
    <button
      onClick={() => !emSelecao && onClick(l)}
      className={`w-full flex items-center gap-2.5 px-4 py-4 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors text-left ${isPago ? 'opacity-60' : ''}`}
    >
      {emSelecao && !isPago && (
        <span className="flex-none pt-1">
          <Checkbox checked={selecionado} onCheckedChange={() => onToggleSelecionado(l.id)} />
        </span>
      )}
      {/* Ícone tipo */}
      <span className="bg-gray-100 dark:bg-gray-700 rounded-xl flex-none w-8 h-8 flex items-center justify-center">
        {isR
          ? <ArrowDownLeft className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          : <ArrowUpRight  className={`w-3.5 h-3.5 ${isVencida ? 'text-red-400' : 'text-gray-400 dark:text-gray-500'}`} />
        }
      </span>

      {/* Descrição */}
      <span className="flex-1 min-w-0">
        <span className="block text-[0.82rem] font-medium leading-snug text-gray-800 dark:text-gray-100 break-words">
          {l.descricao}
          {frequencia && (
            <span className="ml-1.5 text-[0.6rem] bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded px-1.5 py-0.5 font-normal">{frequencia}</span>
          )}
        </span>
        <span className="block text-[0.68rem] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
          {vStr
            ? isVencida ? <span className="text-red-400 dark:text-red-500">Venceu {format(new Date(vStr + 'T12:00:00'), 'dd MMM', { locale: ptBR })}</span>
            : isHoje    ? <span className="text-gray-500 dark:text-gray-400">Vence hoje</span>
            : format(new Date(vStr + 'T12:00:00'), 'dd MMM yyyy', { locale: ptBR })
            : '—'}
          {l.categoria ? ` · ${l.categoria}` : ''}
        </span>
      </span>

      {/* Valor + badge status */}
      <span className="flex-none flex flex-col items-end gap-0.5 pl-1">
        <span className={`text-[0.82rem] font-bold whitespace-nowrap ${isVencida ? 'text-red-400 dark:text-red-500' : 'text-gray-700 dark:text-gray-200'}`}>
          {isR ? '+' : '−'}{R(val)}
        </span>
        {isPago ? (
          <span className="flex items-center gap-0.5 text-[0.6rem] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-md px-2 py-0.5 font-medium">
            <CheckCircle2 className="w-2.5 h-2.5" /> Pago
          </span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onPagar(l); }}
            className="flex items-center gap-0.5 text-[0.6rem] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-0.5 font-medium"
          >
            <CheckCircle2 className="w-2.5 h-2.5" /> Pagar
          </button>
        )}
      </span>
    </button>
  );
}

// ─── Grupo por data de vencimento ─────────────────────────────────────────────
function GrupoContas({ label, items, onPagar, onRow, aReceberDia, aPagarDia, isVencido, emSelecao, selecionados, onToggleSelecionado }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-1 py-1.5">
        <p className={`text-[0.62rem] font-semibold uppercase tracking-widest ${isVencido ? 'text-red-400 dark:text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
          {label}
        </p>
        <div className="flex items-center gap-2">
          {aReceberDia > 0 && <span className="text-[0.62rem] text-gray-500 dark:text-gray-400 font-medium">+{R(aReceberDia)}</span>}
          {aPagarDia   > 0 && <span className="text-[0.62rem] text-gray-400 dark:text-gray-500 font-medium">−{R(aPagarDia)}</span>}
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-white/5">
        {items.map(l => (
          <ContaRow
            key={l.id}
            l={l}
            onPagar={onPagar}
            onClick={onRow}
            emSelecao={emSelecao}
            selecionado={selecionados.includes(l.id)}
            onToggleSelecionado={onToggleSelecionado}
          />
        ))}
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
  const [cs, setCs]               = useState(''); // custom start
  const [ce, setCe]               = useState(''); // custom end
  const [tipoFiltro, setTipoFiltro] = useState('todos'); // 'todos' | 'Receita' | 'Despesa' | 'compras'
  const [contasSel] = useState([]);
  const [search, setSearch]       = useState('');
  const [showNovo, setShowNovo]       = useState(false);
  const [novoTipo, setNovoTipo]       = useState('Despesa');
  const [fabOpen, setFabOpen]         = useState(false);
  const [detalhe, setDetalhe]         = useState(null);
  const [mostrarPagas, setMostrarPagas] = useState(false);
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [modoSelecaoLote, setModoSelecaoLote] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showPagamentoLote, setShowPagamentoLote] = useState(false);
  const [contaLoteId, setContaLoteId] = useState('');
  const [dataPagamentoLote, setDataPagamentoLote] = useState(dataHoje());
  const [processingLote, setProcessingLote] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [ls, cts] = await Promise.all([
      base44.entities.LancamentoFinanceiro.list('-data_vencimento'),
      base44.entities.ContasFinanceiras.filter({ ativo: true }),
    ]);
    setLancs(ls); setContas(cts); setLoading(false);
  };

  // Lançamentos não cancelados (inclui pagas se mostrarPagas ativo)
  const emAberto = useMemo(() =>
    lancs.filter(l => {
      if (l.status === 'Cancelado' || l.tipo === 'Transferência') return false;
      if (!mostrarPagas && l.status === 'Pago') return false;
      return true;
    }),
  [lancs, mostrarPagas]);

  const { s: ds, e: de } = useMemo(() => periodoRange(periodo, cs, ce), [periodo, cs, ce]);

  const filtrados = useMemo(() => emAberto.filter(l => {
    const vStr = getVencimento(l);
    const vDate = vStr ? new Date(vStr + 'T12:00:00') : null;

    // Período
    if (periodo === 'vencidas') {
      if (!vStr || vStr >= hojeStr()) return false;
    } else if (periodo === 'mes') {
      // mês corrente: inclui vencidas do mês + a vencer no mês
      if (!vStr || !isWithinInterval(new Date(vStr + 'T12:00:00'), { start: ds, end: de })) return false;
    } else if (ds && de && vDate) {
      if (!isWithinInterval(vDate, { start: ds, end: de })) return false;
    } else if (ds && !de && vDate) {
      if (isBefore(vDate, ds)) return false;
    }

    // Filtro tipo / compras
    if (tipoFiltro === 'compras') {
      if (l.referencia_tipo !== 'PedidoCompra' && !l.is_custo_mercadoria) return false;
    } else if (tipoFiltro !== 'todos' && l.tipo !== tipoFiltro) return false;

    if (contasSel.length && l.conta_financeira_id && !contasSel.includes(l.conta_financeira_id)) return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.descricao || '').toLowerCase().includes(q) ||
             (l.categoria || '').toLowerCase().includes(q) ||
             (l.terceiro_nome || '').toLowerCase().includes(q);
    }
    return true;
  }), [emAberto, periodo, ds, de, tipoFiltro, contasSel, search, cs, ce]);

  const kpis = useMemo(() => {
    let aReceber = 0, aPagar = 0, qtdReceber = 0, qtdPagar = 0, vencidas = 0;
    const hStr = hojeStr();
    // KPIs consideram apenas Em Aberto/Vencido (não as pagas)
    filtrados.filter(l => l.status !== 'Pago').forEach(l => {
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

  const handleToggleSelecionado = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const lancamentosSelecionados = filtrados.filter((l) => selectedIds.includes(l.id) && l.status !== 'Pago');

  const handleConfirmarPagamentoLote = async () => {
    const conta = contas.find((c) => c.id === contaLoteId);
    if (!conta || !dataPagamentoLote || lancamentosSelecionados.length === 0) return;

    setProcessingLote(true);
    try {
      let deltaConta = 0;

      for (const lancamento of lancamentosSelecionados) {
        await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
          status: 'Pago',
          data_pagamento: dataPagamentoLote,
          status_conciliacao: 'Pendente',
          conta_financeira_id: conta.id,
          conta_financeira_nome: conta.nome,
        });

        deltaConta += lancamento.tipo === 'Receita'
          ? (lancamento.valor || 0)
          : -(lancamento.valor || 0);
      }

      await base44.entities.ContasFinanceiras.update(conta.id, {
        saldo_atual: (conta.saldo_atual || 0) + deltaConta,
      });

      setShowPagamentoLote(false);
      setModoSelecaoLote(false);
      setSelectedIds([]);
      setContaLoteId('');
      setDataPagamentoLote(dataHoje());
      await load();
    } finally {
      setProcessingLote(false);
    }
  };

  const handleGerarRelatorio = async () => {
    setGerandoRelatorio(true);
    try {
      const filtrosDesc = [
        PERIODOS.find(p => p.v === periodo)?.l || periodo,
        tipoFiltro !== 'todos' ? tipoFiltro : null,
        search || null,
        cs && ce ? `${cs} a ${ce}` : null,
      ].filter(Boolean).join(' · ');

      const response = await base44.functions.invoke('gerarRelatorioContasAbertas', {
        lancamentos: filtrados,
        filtros_desc: filtrosDesc,
        kpis,
      });
      if (!response?.data) throw new Error('Resposta inválida');
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ContasAbertas_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
    setGerandoRelatorio(false);
  };

  const FAB_ITEMS = [
    { tipo: 'Receita', icon: ArrowDownLeft, label: 'A Receber', action: () => { setNovoTipo('Receita'); setShowNovo(true); setFabOpen(false); } },
    { tipo: 'Despesa', icon: ArrowUpRight,  label: 'A Pagar',   action: () => { setNovoTipo('Despesa'); setShowNovo(true); setFabOpen(false); } },
    { tipo: 'Relatorio', icon: FileText,    label: gerandoRelatorio ? 'Gerando...' : 'Relatório', action: () => { setFabOpen(false); handleGerarRelatorio(); } },
  ];

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden space-y-3 pb-28">

      {/* KPIs */}
      <KpiAbertas kpis={kpis} />

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm p-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 h-12 flex-1 rounded-2xl bg-gray-100 dark:bg-slate-800">
            <Search className="w-4 h-4 text-gray-400 flex-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 min-w-0 bg-transparent text-sm text-gray-700 dark:text-gray-100 placeholder:text-gray-400 outline-none"
            />
            {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
          </div>

          <button
            onClick={() => setShowFilters(true)}
            className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-700 dark:text-gray-200 shadow-sm relative"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {(periodo !== 'mes' || tipoFiltro !== 'todos' || mostrarPagas || cs || ce) && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-slate-900 dark:bg-white text-[10px] text-white dark:text-slate-900 flex items-center justify-center">•</span>
            )}
          </button>
        </div>

        <div className="pt-2 px-1 flex items-center justify-between gap-2">
          <p className="text-[0.7rem] text-gray-500 dark:text-gray-400">{filtrados.length} lançamento{filtrados.length !== 1 ? 's' : ''}</p>
          <div className="flex flex-wrap justify-end gap-1.5">
            <button
              onClick={() => {
                setModoSelecaoLote((prev) => !prev);
                setSelectedIds([]);
              }}
              className={`px-2 py-1 rounded-full text-[10px] transition-colors ${modoSelecaoLote ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-300'}`}
            >
              {modoSelecaoLote ? 'Cancelar lote' : 'Pagar em lote'}
            </button>
            <span className="px-2 py-1 rounded-full text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-300">{PERIODOS.find(p => p.v === periodo)?.l || 'Período'}</span>
            {tipoFiltro !== 'todos' && <span className="px-2 py-1 rounded-full text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-300">{tipoFiltro === 'Receita' ? 'A Receber' : tipoFiltro === 'Despesa' ? 'A Pagar' : 'Compras'}</span>}
            {mostrarPagas && <span className="px-2 py-1 rounded-full text-[10px] bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">Pagas</span>}
          </div>
        </div>
      </div>

      <Drawer open={showFilters} onOpenChange={setShowFilters}>
        <DrawerContent className="border-0 rounded-t-[28px] bg-white dark:bg-slate-900 px-4 pb-6">
          <DrawerHeader className="px-0 pb-2 text-left">
            <DrawerTitle className="font-glacial text-gray-900 dark:text-white">Filtros</DrawerTitle>
          </DrawerHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wide">Período</label>
              <div className="flex flex-wrap gap-2">
                {PERIODOS.map(p => (
                  <button key={p.v} onClick={() => setPeriodo(p.v)} className={`px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${periodo === p.v ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-300'}`}>
                    {p.l}
                  </button>
                ))}
              </div>
            </div>

            {periodo === 'personalizado' && (
              <div className="flex gap-2">
                <input type="date" value={cs} onChange={e => setCs(e.target.value)} className="flex-1 min-w-0 bg-gray-100 dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-100 rounded-2xl px-3 py-3 outline-none border-0" />
                <input type="date" value={ce} onChange={e => setCe(e.target.value)} className="flex-1 min-w-0 bg-gray-100 dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-100 rounded-2xl px-3 py-3 outline-none border-0" />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wide">Tipo</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { v: 'todos', l: 'Todos' },
                  { v: 'Receita', l: 'A Receber' },
                  { v: 'Despesa', l: 'A Pagar' },
                  { v: 'compras', l: 'Compras' },
                ].map(({ v, l }) => (
                  <button key={v} onClick={() => setTipoFiltro(v)} className={`px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${tipoFiltro === v ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-300'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wide">Exibição</label>
              <button onClick={() => setMostrarPagas(p => !p)} className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${mostrarPagas ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-300'}`}>
                <CheckCircle2 className="w-3 h-3" /> Pagas
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setPeriodo('mes');
                  setTipoFiltro('todos');
                  setMostrarPagas(false);
                  setCs('');
                  setCe('');
                }}
                className="flex-1 h-11 rounded-2xl bg-gray-100 dark:bg-slate-800 text-sm text-gray-600 dark:text-gray-300"
              >
                Limpar
              </button>
              <button onClick={() => setShowFilters(false)} className="flex-1 h-11 rounded-2xl bg-slate-900 dark:bg-slate-200 text-sm text-white dark:text-slate-900">
                Aplicar
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {modoSelecaoLote && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Pagamento em lote</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{lancamentosSelecionados.length} item(ns) selecionado(s)</p>
            </div>
            <button
              onClick={() => setShowPagamentoLote(true)}
              disabled={lancamentosSelecionados.length === 0}
              className="px-4 h-10 rounded-2xl bg-emerald-600 text-white text-sm font-medium disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

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
              emSelecao={modoSelecaoLote}
              selecionados={selectedIds}
              onToggleSelecionado={handleToggleSelecionado}
            />
          ))}
        </div>
      )}

      {/* FAB */}
      {fabOpen && <div className="fixed inset-0 z-20" onClick={() => setFabOpen(false)} />}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 flex flex-col items-end gap-2">
        {fabOpen && FAB_ITEMS.map(({ tipo, icon: Icon, label, action }) => (
          <button key={tipo}
            onClick={action}
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
      <PagamentoLoteDialog
        open={showPagamentoLote}
        onOpenChange={setShowPagamentoLote}
        contas={contas}
        contaId={contaLoteId}
        setContaId={setContaLoteId}
        dataPagamento={dataPagamentoLote}
        setDataPagamento={setDataPagamentoLote}
        selecionados={lancamentosSelecionados}
        onConfirm={handleConfirmarPagamentoLote}
        loading={processingLote}
      />
    </div>
  );
}