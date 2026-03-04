import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { format, isWithinInterval, startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search, AlertCircle, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Scale } from 'lucide-react';
import LancamentoItem from './LancamentoItem';
import NovoLancamentoDialog from './NovoLancamentoDialog';
import LancamentoDetalheDialog from './LancamentoDetalheDialog';

const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const PERIODOS = [
  { label: 'Hoje', value: 'hoje' },
  { label: 'Ontem', value: 'ontem' },
  { label: 'Semana', value: 'semana' },
  { label: 'Mês', value: 'mes' },
  { label: 'Tudo', value: 'tudo' },
];

function getRange(periodo) {
  const hoje = new Date();
  const d = (y, m, day, h = 0, mi = 0, s = 0) => new Date(y, m, day, h, mi, s);
  switch (periodo) {
    case 'hoje': return { start: d(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()), end: d(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59) };
    case 'ontem': { const o = subDays(hoje, 1); return { start: d(o.getFullYear(), o.getMonth(), o.getDate()), end: d(o.getFullYear(), o.getMonth(), o.getDate(), 23, 59, 59) }; }
    case 'semana': return { start: startOfWeek(hoje, { locale: ptBR }), end: endOfWeek(hoje, { locale: ptBR }) };
    case 'tudo': return { start: null, end: null };
    default: return { start: startOfMonth(hoje), end: endOfMonth(hoje) };
  }
}

export { getRange as getDateRange };

export default function FluxoCaixaTab() {
  const [lancamentos, setLancamentos] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [periodo, setPeriodo] = useState('mes');
  const [showNovo, setShowNovo] = useState(false);
  const [novoTipo, setNovoTipo] = useState('Despesa');
  const [fabOpen, setFabOpen] = useState(false);
  const [detalhe, setDetalhe] = useState(null);

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

  const { start, end } = useMemo(() => getRange(periodo), [periodo]);

  const filtrados = useMemo(() => {
    return lancamentos.filter(l => {
      if (l.status === 'Cancelado') return false;
      const dataRef = l.data_pagamento ? new Date(l.data_pagamento) : l.data_vencimento ? new Date(l.data_vencimento) : null;
      if (start && end && dataRef && !isWithinInterval(dataRef, { start, end })) return false;
      if (search) {
        const q = search.toLowerCase();
        return (l.descricao || '').toLowerCase().includes(q) ||
          (l.conta_financeira_nome || '').toLowerCase().includes(q) ||
          (l.referencia_numero || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [lancamentos, start, end, search]);

  const kpis = useMemo(() => {
    let entrou = 0, saiu = 0;
    filtrados.forEach(l => {
      if (l.status !== 'Pago') return;
      if (l.tipo === 'Receita') entrou += l.valor || 0;
      else if (l.tipo === 'Despesa') saiu += l.valor || 0;
    });
    return { entrou, saiu, saldo: entrou - saiu };
  }, [filtrados]);

  const grupos = useMemo(() => {
    const hoje = format(new Date(), 'yyyy-MM-dd');
    const ontem = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const mapa = {};
    filtrados.forEach(l => {
      const dataRef = l.data_pagamento || l.data_vencimento;
      const key = dataRef ? format(new Date(dataRef), 'yyyy-MM-dd') : 'sem-data';
      if (!mapa[key]) mapa[key] = [];
      mapa[key].push(l);
    });
    return Object.entries(mapa)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => {
        let label = key === 'sem-data' ? 'Sem data'
          : key === hoje ? 'Hoje'
          : key === ontem ? 'Ontem'
          : format(new Date(key + 'T12:00:00'), "d 'de' MMMM", { locale: ptBR });
        if (key > hoje) label = `${label} (previsto)`;
        return { key, label, items };
      });
  }, [filtrados]);

  const totalPendentes = useMemo(() => lancamentos.filter(l => l.status_conciliacao === 'Pendente').length, [lancamentos]);

  return (
    <div className="w-full min-w-0">

      {/* KPIs — 3 cards fixos */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm overflow-hidden">
          <p className="text-[10px] text-gray-400 mb-1 truncate">Entrou</p>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{fmt(kpis.entrou)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm overflow-hidden">
          <p className="text-[10px] text-gray-400 mb-1 truncate">Saiu</p>
          <p className="text-sm font-semibold text-red-500 dark:text-red-400 truncate">{fmt(kpis.saiu)}</p>
        </div>
        <div className={`rounded-2xl p-3 shadow-sm overflow-hidden ${kpis.saldo < 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
          <p className="text-[10px] text-gray-400 mb-1 truncate">Saldo</p>
          <p className={`text-sm font-semibold truncate ${kpis.saldo < 0 ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'}`}>{fmt(kpis.saldo)}</p>
        </div>
      </div>

      {/* Alerta pendentes */}
      {totalPendentes > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
          <span className="truncate">{totalPendentes} aguardando conciliação</span>
        </div>
      )}

      {/* Busca */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full pl-9 pr-4 h-10 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 shadow-sm outline-none border-0"
          style={{ fontSize: 16 }}
        />
      </div>

      {/* Filtros de período — scroll horizontal */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {PERIODOS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriodo(p.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              periodo === p.value
                ? 'bg-gray-800 dark:bg-gray-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : grupos.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <Scale className="w-10 h-10 mx-auto mb-2 text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-400">Nenhuma movimentação</p>
        </div>
      ) : (
        <div className="space-y-4 pb-24">
          {grupos.map(({ key, label, items }) => (
            <div key={key}>
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-1.5">{label}</p>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-gray-700/50">
                {items.map(l => (
                  <LancamentoItem key={l.id} lancamento={l} onClick={setDetalhe} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 flex flex-col items-end gap-2">
        {fabOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setFabOpen(false)} />
            <div className="relative z-30 flex flex-col items-end gap-2">
              {[
                { tipo: 'Receita', icon: ArrowDownLeft, label: 'Receita' },
                { tipo: 'Despesa', icon: ArrowUpRight, label: 'Despesa' },
                { tipo: 'Transferência', icon: ArrowRightLeft, label: 'Transferência' },
              ].map(({ tipo, icon: Icon, label }) => (
                <button
                  key={tipo}
                  onClick={() => { setNovoTipo(tipo); setShowNovo(true); setFabOpen(false); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg bg-gray-800 dark:bg-gray-700 text-white text-sm font-medium active:scale-95 transition-all"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
        <button
          onClick={() => setFabOpen(o => !o)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 bg-gray-800 dark:bg-gray-700 text-white ${fabOpen ? 'rotate-45' : ''}`}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <NovoLancamentoDialog
        open={showNovo}
        tipoInicial={novoTipo}
        onClose={() => setShowNovo(false)}
        onSaved={loadData}
      />

      {detalhe && (
        <LancamentoDetalheDialog
          lancamento={detalhe}
          contas={contas}
          onClose={() => setDetalhe(null)}
          onSaved={() => { loadData(); setDetalhe(null); }}
        />
      )}
    </div>
  );
}