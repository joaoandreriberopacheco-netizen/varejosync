import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { format, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, X, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Scale, Search, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import FiltrosFluxo, { getDateRange } from './FiltrosFluxo';
import LancamentoItem from './LancamentoItem';
import NovoLancamentoDialog from './NovoLancamentoDialog';
import LancamentoDetalheDialog from './LancamentoDetalheDialog';

const formatCurrency = (v) =>
  `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function KpiCard({ label, value, isNegative, isHighlight }) {
  return (
    <div className={`flex-1 min-w-0 px-3 py-3 rounded-2xl ${isHighlight ? 'bg-gray-800 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'} shadow-sm`}>
      <p className={`text-[11px] mb-1 truncate ${isHighlight ? 'text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>{label}</p>
      <p className={`text-sm font-semibold leading-snug break-all ${
        isHighlight
          ? (isNegative ? 'text-red-400' : 'text-green-400')
          : (isNegative ? 'text-red-500 dark:text-red-400' : 'text-gray-800 dark:text-gray-100')
      }`}>
        {value}
      </p>
    </div>
  );
}

function GroupHeader({ label, children }) {
  return (
    <div>
      <div className="px-4 py-2 sticky top-0 bg-gray-50 dark:bg-gray-900 z-10">
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-gray-700/50">
        {children}
      </div>
    </div>
  );
}

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [lancs, contas] = await Promise.all([
      base44.entities.LancamentoFinanceiro.list('-data_vencimento'),
      base44.entities.ContasFinanceiras.filter({ ativo: true }),
    ]);
    setLancamentos(lancs);
    setContas(contas);
    setLoading(false);
  };

  // --- Filtragem ---
  const { start: dateStart, end: dateEnd } = useMemo(
    () => getDateRange(periodo, customStart, customEnd),
    [periodo, customStart, customEnd]
  );

  const filtrados = useMemo(() => {
    return lancamentos.filter(l => {
      // Filtro por data (considera data_pagamento OU data_vencimento)
      const dataRef = l.data_pagamento ? new Date(l.data_pagamento) : l.data_vencimento ? new Date(l.data_vencimento) : null;
      if (dateStart && dateEnd && dataRef) {
        if (!isWithinInterval(dataRef, { start: dateStart, end: dateEnd })) return false;
      }

      // Filtro por conta
      if (contasSelecionadas.length > 0 && !contasSelecionadas.includes(l.conta_financeira_id)) return false;

      // Filtro pendentes de conciliação
      if (apenasPendentes && l.status_conciliacao !== 'Pendente') return false;

      // Filtro por busca
      if (search) {
        const q = search.toLowerCase();
        if (!(l.descricao || '').toLowerCase().includes(q) &&
            !(l.categoria || '').toLowerCase().includes(q) &&
            !(l.conta_financeira_nome || '').toLowerCase().includes(q) &&
            !(l.referencia_numero || '').toLowerCase().includes(q)) {
          return false;
        }
      }

      // Ignora cancelados
      if (l.status === 'Cancelado') return false;

      return true;
    });
  }, [lancamentos, dateStart, dateEnd, contasSelecionadas, apenasPendentes, search]);

  // --- KPIs ---
  const kpis = useMemo(() => {
    const realizado = { entrou: 0, saiu: 0 };
    const previsto = { entrou: 0, saiu: 0 };

    filtrados.forEach(l => {
      const isPago = l.status === 'Pago';
      if (l.tipo === 'Receita') {
        if (isPago) realizado.entrou += l.valor || 0;
        else previsto.entrou += l.valor || 0;
      } else if (l.tipo === 'Despesa') {
        if (isPago) realizado.saiu += l.valor || 0;
        else previsto.saiu += l.valor || 0;
      }
    });

    const saldoRealizado = realizado.entrou - realizado.saiu;
    const saldoPrevisto = (realizado.entrou + previsto.entrou) - (realizado.saiu + previsto.saiu);

    return { realizado, previsto, saldoRealizado, saldoPrevisto };
  }, [filtrados]);

  // --- Agrupamento por data ---
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
          const isPast = dateKey < hojeStr;
          const isFuture = dateKey > hojeStr;
          if (dateKey === hojeStr) label = 'Hoje';
          else if (dateKey === format(new Date(hoje.getTime() - 86400000), 'yyyy-MM-dd')) label = 'Ontem';
          else label = format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
          if (isFuture) label = `📅 ${label} (previsto)`;
        }
        return { dateKey, label, items };
      });
  }, [filtrados]);

  const totalPendentes = lancamentos.filter(l => l.status_conciliacao === 'Pendente').length;

  return (
    <div className="relative space-y-4 pb-24">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <KpiCard label="Entrou" value={formatCurrency(kpis.realizado.entrou)} />
        <KpiCard label="Saiu" value={formatCurrency(kpis.realizado.saiu)} isNegative={kpis.realizado.saiu > 0} />
        <KpiCard
          label="Saldo"
          value={formatCurrency(kpis.saldoRealizado)}
          isNegative={kpis.saldoRealizado < 0}
          isHighlight
        />
      </div>

      {/* Previsão linha */}
      {(kpis.previsto.entrou > 0 || kpis.previsto.saiu > 0) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-600 dark:text-gray-300">Projeção:</span>
          <span className="text-green-600 dark:text-green-400">+{formatCurrency(kpis.previsto.entrou)}</span>
          <span className="text-red-500 dark:text-red-400">-{formatCurrency(kpis.previsto.saiu)}</span>
          <span className={`font-semibold ml-auto ${kpis.saldoPrevisto < 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
            Prev: {formatCurrency(kpis.saldoPrevisto)}
          </span>
        </div>
      )}

      {/* Alerta pendentes */}
      {totalPendentes > 0 && !apenasPendentes && (
        <button
          onClick={() => setApenasPendentes(true)}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs"
        >
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          <span>{totalPendentes} lançamento{totalPendentes > 1 ? 's' : ''} aguardando conciliação</span>
          <span className="ml-auto font-medium text-gray-500">Ver →</span>
        </button>
      )}

      {/* Filtros */}
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

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar movimentações..."
          className="pl-9 bg-white dark:bg-gray-800 border-0 shadow-sm dark:text-gray-200 dark:placeholder:text-gray-500"
        />
      </div>

      {/* Lista agrupada */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : grupos.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <Scale className="w-12 h-12 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhuma movimentação encontrada</p>
          <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">Use o botão + para registrar movimentações</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map(({ dateKey, label, items }) => (
            <GroupHeader key={dateKey} label={label}>
              {items.map(l => (
                <LancamentoItem key={l.id} lancamento={l} onClick={setLancamentoDetalhe} />
              ))}
            </GroupHeader>
          ))}
        </div>
      )}

      {/* FAB Speed Dial */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 flex flex-col items-end gap-3">
        {/* Opções expandidas */}
        {fabOpen && (
          <div className="flex flex-col items-end gap-2">
            {[
              { tipo: 'Receita', icon: ArrowDownLeft, bg: 'bg-gray-700 dark:bg-gray-600', label: 'Receita' },
              { tipo: 'Despesa', icon: ArrowUpRight, bg: 'bg-gray-500 dark:bg-gray-500', label: 'Despesa' },
              { tipo: 'Transferência', icon: ArrowRightLeft, bg: 'bg-gray-400 dark:bg-gray-400', label: 'Transferência' },
            ].map(({ tipo, icon: Icon, bg, label }) => (
              <button
                key={tipo}
                onClick={() => { setNovoTipo(tipo); setShowNovo(true); setFabOpen(false); }}
                className={`flex items-center gap-3 px-5 py-3 rounded-full shadow-lg text-white text-sm font-medium ${bg} active:scale-95 transition-all`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Botão principal */}
        <button
          onClick={() => setFabOpen(o => !o)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${
            fabOpen
              ? 'bg-gray-600 dark:bg-gray-500 text-white rotate-45'
              : 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
          }`}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Overlay para fechar FAB */}
      {fabOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setFabOpen(false)} />
      )}

      {/* Dialog */}
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