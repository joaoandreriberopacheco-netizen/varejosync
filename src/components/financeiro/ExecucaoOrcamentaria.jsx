import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { format, isWithinInterval, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, X, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Clock, Scale } from 'lucide-react';
import NovoLancamentoDialog from './NovoLancamentoDialog';
import LancamentoDetalheDialog from './LancamentoDetalheDialog';
import FiltrosFluxoCaixa from './fluxo/FiltrosFluxoCaixa';
import KpiFluxo from './fluxo/KpiFluxo';
import ListaLancamentos from './fluxo/ListaLancamentos';
import ContasAbertas from './ContasAbertas';

// ─── utils ────────────────────────────────────────────────────────────────────
function dateRange(periodo, cs, ce) {
  const h = new Date();
  if (periodo === 'hoje') return { s: new Date(h.getFullYear(), h.getMonth(), h.getDate()), e: new Date(h.getFullYear(), h.getMonth(), h.getDate(), 23, 59, 59) };
  if (periodo === 'ontem') { const d = subDays(h, 1); return { s: new Date(d.getFullYear(), d.getMonth(), d.getDate()), e: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59) }; }
  if (periodo === 'semana') { const { startOfWeek, endOfWeek } = require('date-fns'); return { s: startOfWeek(h, { locale: ptBR }), e: endOfWeek(h, { locale: ptBR }) }; }
  if (periodo === 'mes') return { s: startOfMonth(h), e: endOfMonth(h) };
  if (periodo === 'tudo') return { s: null, e: null };
  if (periodo === 'periodo') return { s: cs ? new Date(cs) : null, e: ce ? new Date(ce + 'T23:59:59') : null };
  return { s: startOfMonth(h), e: endOfMonth(h) };
}

const FAB_ITEMS = [
  { tipo: 'Receita', icon: ArrowDownLeft, label: 'Receita' },
  { tipo: 'Despesa', icon: ArrowUpRight, label: 'Despesa' },
  { tipo: 'Transferência', icon: ArrowRightLeft, label: 'Transf.' },
];

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
  const [statusSel, setStatusSel] = useState([]);
  const [pendentes, setPendentes] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [novoTipo, setNovoTipo] = useState('Despesa');
  const [showNovo, setShowNovo] = useState(false);
  const [detalhe, setDetalhe] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [ls, cts] = await Promise.all([
      base44.entities.LancamentoFinanceiro.list('-data_vencimento'),
      base44.entities.ContasFinanceiras.filter({ ativo: true }),
    ]);
    setLancs(ls);
    setContas(cts);
    setLoading(false);
  };

  const { s: ds, e: de } = useMemo(() => {
    const h = new Date();
    if (periodo === 'hoje') return { s: new Date(h.getFullYear(), h.getMonth(), h.getDate()), e: new Date(h.getFullYear(), h.getMonth(), h.getDate(), 23, 59, 59) };
    if (periodo === 'ontem') { const d = subDays(h, 1); return { s: new Date(d.getFullYear(), d.getMonth(), d.getDate()), e: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59) }; }
    if (periodo === 'semana') {
      const dow = h.getDay();
      const start = new Date(h); start.setDate(h.getDate() - ((dow + 6) % 7)); start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
      return { s: start, e: end };
    }
    if (periodo === 'mes') return { s: startOfMonth(h), e: endOfMonth(h) };
    if (periodo === 'tudo') return { s: null, e: null };
    if (periodo === 'periodo') return { s: cs ? new Date(cs) : null, e: ce ? new Date(ce + 'T23:59:59') : null };
    return { s: startOfMonth(h), e: endOfMonth(h) };
  }, [periodo, cs, ce]);

  const filtrados = useMemo(() => lancs.filter(l => {
    if (l.status === 'Cancelado' && !statusSel.includes('Cancelado')) return false;
    const dr = l.data_pagamento ? new Date(l.data_pagamento) : l.data_vencimento ? new Date(l.data_vencimento) : null;
    if (ds && de && dr && !isWithinInterval(dr, { start: ds, end: de })) return false;
    if (contasSel.length && !contasSel.includes(l.conta_financeira_id)) return false;
    if (tiposSel.length && !tiposSel.includes(l.tipo)) return false;
    if (statusSel.length && !statusSel.includes(l.status)) return false;
    if (pendentes && l.status_conciliacao !== 'Pendente') return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.descricao || '').toLowerCase().includes(q) ||
        (l.categoria || '').toLowerCase().includes(q) ||
        (l.conta_financeira_nome || '').toLowerCase().includes(q) ||
        (l.referencia_numero || '').toLowerCase().includes(q) ||
        (l.tags || []).some(t => t.toLowerCase().includes(q));
    }
    return true;
  }), [lancs, ds, de, contasSel, tiposSel, statusSel, pendentes, search]);

  const kpis = useMemo(() => {
    let entrou = 0, saiu = 0, pEntrou = 0, pSaiu = 0, totalTransferencias = 0, vencidos = 0, qtdVencidos = 0;
    filtrados.forEach(l => {
      if (l.tipo === 'Transferência') { totalTransferencias += l.valor || 0; return; }
      if (l.status === 'Vencido') { vencidos += l.valor || 0; qtdVencidos++; }
      if (l.status === 'Pago') {
        if (l.tipo === 'Receita') entrou += l.valor || 0;
        else if (l.tipo === 'Despesa') saiu += l.valor || 0;
      } else {
        if (l.tipo === 'Receita') pEntrou += l.valor || 0;
        else if (l.tipo === 'Despesa') pSaiu += l.valor || 0;
      }
    });
    return { entrou, saiu, saldo: entrou - saiu, pEntrou, pSaiu, saldoPrev: entrou + pEntrou - saiu - pSaiu, totalTransferencias, vencidos, qtdVencidos };
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
      const totais = { r: 0, d: 0 };
      items.forEach(l => {
        if (l.tipo === 'Receita' && l.status === 'Pago') totais.r += l.valor || 0;
        if (l.tipo === 'Despesa' && l.status === 'Pago') totais.d += l.valor || 0;
      });
      return { k, label, items, totais };
    });
  }, [filtrados]);

  const totalPend = useMemo(() => lancs.filter(l => l.status_conciliacao === 'Pendente').length, [lancs]);
  const hasActiveFilters = tiposSel.length > 0 || contasSel.length > 0 || statusSel.length > 0 || pendentes || !!search;

  const [aba, setAba] = useState('fluxo'); // 'fluxo' | 'contas'

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-4 pb-28">
      {/* Header + tabs */}
      <div className="pb-1">
        <p className="text-xl font-medium text-gray-800 dark:text-gray-200 font-glacial mb-3">Financeiro</p>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1">
          <button onClick={() => setAba('fluxo')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${aba === 'fluxo' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400'}`}>
            Fluxo de Caixa
          </button>
          <button onClick={() => setAba('contas')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${aba === 'contas' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400'}`}>
            Contas Abertas
          </button>
        </div>
      </div>

      {aba === 'contas' && <ContasAbertas />}

      {aba === 'fluxo' && (
        <>
          {/* KPIs */}
          <KpiFluxo kpis={kpis} />

          {/* Alerta conciliação pendente */}
          {totalPend > 0 && !pendentes && (
            <button onClick={() => setPendentes(true)}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 text-xs text-left">
              <Clock className="w-3.5 h-3.5 flex-none text-gray-400" />
              <span className="flex-1 min-w-0 truncate">{totalPend} aguardando conciliação</span>
              <span className="font-semibold flex-none text-gray-500">Ver →</span>
            </button>
          )}

          {/* Filtros */}
          <FiltrosFluxoCaixa
            search={search} onSearch={setSearch}
            periodo={periodo} onPeriodo={setPeriodo}
            customStart={cs} customEnd={ce}
            onCustom={(k, v) => k === 'start' ? setCs(v) : setCe(v)}
            contas={contas} contasSel={contasSel} onContasSel={setContasSel}
            tiposSel={tiposSel} onTiposSel={setTiposSel}
            statusSel={statusSel} onStatusSel={setStatusSel}
            pendentes={pendentes} onPendentes={setPendentes}
            totalFiltrados={filtrados.length}
            hasActiveFilters={hasActiveFilters}
            onLimparFiltros={() => { setTiposSel([]); setContasSel([]); setStatusSel([]); setPendentes(false); setSearch(''); }}
          />

          {/* Lista */}
          <ListaLancamentos grupos={grupos} loading={loading} onRow={setDetalhe} />

          {/* FAB */}
          {fabOpen && <div className="fixed inset-0 z-20" onClick={() => setFabOpen(false)} />}
          <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 flex flex-col items-end gap-2">
            {fabOpen && FAB_ITEMS.map(({ tipo, icon: Icon, label }) => (
              <button key={tipo}
                onClick={() => { setNovoTipo(tipo); setShowNovo(true); setFabOpen(false); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-500 dark:bg-gray-200 text-white dark:text-gray-900 text-sm font-medium shadow-lg whitespace-nowrap active:scale-95 transition-transform">
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
            <button
              onClick={() => setFabOpen(o => !o)}
              className={`w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all ${fabOpen ? 'bg-gray-400 rotate-45' : 'bg-gray-500 dark:bg-gray-200'}`}>
              <Plus className={`w-6 h-6 ${fabOpen ? 'text-white' : 'text-white dark:text-gray-900'}`} />
            </button>
          </div>

          {/* Dialogs */}
          <NovoLancamentoDialog open={showNovo} tipoInicial={novoTipo} onClose={() => setShowNovo(false)} onSaved={load} />
          {detalhe && <LancamentoDetalheDialog lancamento={detalhe} contas={contas} onClose={() => setDetalhe(null)} onSaved={() => { load(); setDetalhe(null); }} />}
        </>
      )}
    </div>
  );
}