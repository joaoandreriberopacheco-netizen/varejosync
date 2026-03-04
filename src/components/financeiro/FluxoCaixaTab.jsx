import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { format, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, X, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Scale, Search, AlertCircle } from 'lucide-react';
import FiltrosFluxo, { getDateRange } from './FiltrosFluxo';
import LancamentoItem from './LancamentoItem';
import NovoLancamentoDialog from './NovoLancamentoDialog';
import LancamentoDetalheDialog from './LancamentoDetalheDialog';

const fmt = (v) =>
  `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, isNegative, isHighlight }) {
  return (
    <div className={`rounded-2xl px-3 py-3 min-w-0 overflow-hidden ${
      isHighlight ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-800/60 shadow-sm'
    }`}>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-0.5 truncate">{label}</p>
      <p className={`text-base font-semibold truncate ${
        isNegative ? 'text-red-500 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'
      }`}>
        {value}
      </p>
    </div>
  );
}

// ─── Group Header ─────────────────────────────────────────────────────────────
function GroupHeader({ label, children }) {
  return (
    <div className="min-w-0">
      <div className="px-1 py-2">
        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">{label}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-gray-700/50">
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FluxoCaixaTab() {
  const [lancamentos, setLancamentos] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [periodo, setPeriodo] = useState('mes');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [contasSelecionadas, setContasSelecionadas] = useState([]);
  const [apenasPendentes, setApenasPendentes] = useState(false);
  const [showNovo, setShowNovo] = useState(false);
  const [novoTipo, setNovoTipo] = useState('Despesa');
  const [fabOpen, setFabOpen] = useState(false);
  const [lancamentoDetalhe, setLancamentoDetalhe] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [lancs, cts] = await Promise.all([
      base44.entities.LancamentoFinanceiro.list('-data_vencimento'),
      base44.entities.ContasFinanceiras.filter({ ativo: true }),
    ]);
    setLancamentos(lancs);
    setContas(cts);
    setLoading(false);
  };

  const { start: dateStart, end: dateEnd } = useMemo(
    () => getDateRange(periodo, customStart, customEnd),
    [periodo, customStart, customEnd]
  );

  const filtrados = useMemo(() => {
    return lancamentos.filter(l => {
      const dataRef = l.data_pagamento ? new Date(l.data_pagamento) : l.data_vencimento ? new Date(l.data_vencimento) : null;
      if (dateStart && dateEnd && dataRef) {
        if (!isWithinInterval(dataRef, { start: dateStart, end: dateEnd })) return false;
      }
      if (contasSelecionadas.length > 0 && !contasSelecionadas.includes(l.conta_financeira_id)) return false;
      if (apenasPendentes && l.status_conciliacao !== 'Pendente') return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(l.descricao || '').toLowerCase().includes(q) &&
            !(l.categoria || '').toLowerCase().includes(q) &&
            !(l.conta_financeira_nome || '').toLowerCase().includes(q) &&
            !(l.referencia_numero || '').toLowerCase().includes(q)) return false;
      }
      if (l.status === 'Cancelado') return false;
      return true;
    });
  }, [lancamentos, dateStart, dateEnd, contasSelecionadas, apenasPendentes, search]);

  const kpis = useMemo(() => {
    const r = { entrou: 0, saiu: 0 };
    const p = { entrou: 0, saiu: 0 };
    filtrados.forEach(l => {
      const isPago = l.status === 'Pago';
      if (l.tipo === 'Receita') { if (isPago) r.entrou += l.valor || 0; else p.entrou += l.valor || 0; }
      else if (l.tipo === 'Despesa') { if (isPago) r.saiu += l.valor || 0; else p.saiu += l.valor || 0; }
    });
    return {
      realizado: r,
      previsto: p,
      saldoRealizado: r.entrou - r.saiu,
      saldoPrevisto: (r.entrou + p.entrou) - (r.saiu + p.saiu),
    };
  }, [filtrados]);

  const grupos = useMemo(() => {
    const hoje = new Date();
    const hojeStr = format(hoje, 'yyyy-MM-dd');
    const mapa = {};
    filtrados.forEach(l => {
      const dataRef = l.data_pagamento || l.data_vencimento;
      const key = dataRef ? format(new Date(dataRef), 'yyyy-MM-dd') : 'sem-data';
      if (!mapa[key]) mapa[key] = [];
      mapa[key].push(l);
    });
    return Object.entries(mapa)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, items]) => {
        let label;
        if (dateKey === 'sem-data') {
          label = 'Sem data';
        } else {
          const d = new Date(dateKey + 'T12:00:00');
          const isFuture = dateKey > hojeStr;
          if (dateKey === hojeStr) label = 'Hoje';
          else if (dateKey === format(new Date(hoje.getTime() - 86400000), 'yyyy-MM-dd')) label = 'Ontem';
          else label = format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
          if (isFuture) label = `${label} (previsto)`;
        }
        return { dateKey, label, items };
      });
  }, [filtrados]);

  const totalPendentes = lancamentos.filter(l => l.status_conciliacao === 'Pendente').length;

  const FAB_OPCOES = [
    { tipo: 'Receita', icon: ArrowDownLeft, label: 'Receita' },
    { tipo: 'Despesa', icon: ArrowUpRight, label: 'Despesa' },
    { tipo: 'Transferência', icon: ArrowRightLeft, label: 'Transferência' },
  ];

  return (
    // Container raiz: nunca deixa nada vazar
    <div className="w-full min-w-0 overflow-x-hidden space-y-3 pb-24">

      {/* ── KPIs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 w-full min-w-0">
        <KpiCard label="Entrou" value={fmt(kpis.realizado.entrou)} />
        <KpiCard label="Saiu" value={fmt(kpis.realizado.saiu)} isNegative={kpis.realizado.saiu > 0} />
        <div className="col-span-2">
          <KpiCard
            label="Saldo do período"
            value={fmt(kpis.saldoRealizado)}
            isNegative={kpis.saldoRealizado < 0}
            isHighlight
          />
        </div>
      </div>

      {/* ── Projeção ─────────────────────────────────────── */}
      {(kpis.previsto.entrou > 0 || kpis.previsto.saiu > 0) && (
        <div className="w-full min-w-0 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-2.5 space-y-1">
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Projeção prevista</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 min-w-0">
            <span className="text-xs text-green-600 dark:text-green-400 truncate">+{fmt(kpis.previsto.entrou)}</span>
            <span className="text-xs text-red-500 dark:text-red-400 truncate">-{fmt(kpis.previsto.saiu)}</span>
            <span className={`text-xs font-semibold truncate ${kpis.saldoPrevisto < 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
              = {fmt(kpis.saldoPrevisto)}
            </span>
          </div>
        </div>
      )}

      {/* ── Alerta conciliação ───────────────────────────── */}
      {totalPendentes > 0 && !apenasPendentes && (
        <button
          onClick={() => setApenasPendentes(true)}
          className="w-full min-w-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs text-left"
        >
          <AlertCircle className="w-3.5 h-3.5 flex-none text-gray-400" />
          <span className="flex-1 truncate">{totalPendentes} lançamento{totalPendentes > 1 ? 's' : ''} aguardando conciliação</span>
          <span className="flex-none font-medium text-gray-400">Ver →</span>
        </button>
      )}

      {/* ── Busca + Filtros ──────────────────────────────── */}
      <div className="w-full min-w-0 bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Campo de busca */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-50 dark:border-gray-700/50">
          <Search className="w-4 h-4 text-gray-400 flex-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar movimentações..."
            className="flex-1 min-w-0 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="flex-none">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
        {/* Filtros */}
        <div className="px-3 py-2">
          <FiltrosFluxo
            periodo={periodo}
            onPeriodoChange={setPeriodo}
            customStart={customStart}
            customEnd={customEnd}
            onCustomChange={(k, v) => k === 'start' ? setCustomStart(v) : setCustomEnd(v)}
            contas={contas}
            contasSelecionadas={contasSelecionadas}
            onContasChange={setContasSelecionadas}
            apenasPendentes={apenasPendentes}
            onPendentesChange={setApenasPendentes}
          />
        </div>
      </div>

      {/* ── Lista ────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : grupos.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <Scale className="w-10 h-10 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhuma movimentação encontrada</p>
          <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">Use o botão + para registrar</p>
        </div>
      ) : (
        <div className="space-y-3 min-w-0">
          {grupos.map(({ dateKey, label, items }) => (
            <GroupHeader key={dateKey} label={label}>
              {items.map(l => (
                <LancamentoItem key={l.id} lancamento={l} onClick={setLancamentoDetalhe} />
              ))}
            </GroupHeader>
          ))}
        </div>
      )}

      {/* ── FAB ─────────────────────────────────────────── */}
      {fabOpen && <div className="fixed inset-0 z-20" onClick={() => setFabOpen(false)} />}

      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 flex flex-col items-end gap-2">
        {fabOpen && FAB_OPCOES.map(({ tipo, icon: Icon, label }) => (
          <button
            key={tipo}
            onClick={() => { setNovoTipo(tipo); setShowNovo(true); setFabOpen(false); }}
            className="flex items-center gap-2.5 pl-4 pr-5 py-2.5 rounded-full shadow-lg bg-gray-700 dark:bg-gray-600 text-white text-sm font-medium active:scale-95 transition-transform whitespace-nowrap"
          >
            <Icon className="w-4 h-4 flex-none" />
            {label}
          </button>
        ))}
        <button
          onClick={() => setFabOpen(o => !o)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${
            fabOpen ? 'bg-gray-500 dark:bg-gray-500 rotate-45' : 'bg-gray-800 dark:bg-gray-200'
          }`}
        >
          <Plus className={`w-6 h-6 ${fabOpen ? 'text-white' : 'text-white dark:text-gray-900'}`} />
        </button>
      </div>

      {/* ── Dialogs ─────────────────────────────────────── */}
      <NovoLancamentoDialog
        open={showNovo}
        tipoInicial={novoTipo}
        onClose={() => setShowNovo(false)}
        onSaved={loadData}
      />
      {lancamentoDetalhe && (
        <LancamentoDetalheDialog
          lancamento={lancamentoDetalhe}
          contas={contas}
          onClose={() => setLancamentoDetalhe(null)}
          onSaved={() => { loadData(); setLancamentoDetalhe(null); }}
        />
      )}
    </div>
  );
}