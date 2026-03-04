import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { format, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, X, ArrowDownLeft, ArrowUpRight, ArrowRightLeft,
  Scale, Search, AlertCircle, ChevronDown, SlidersHorizontal,
  Clock, CheckCircle2
} from 'lucide-react';
import NovoLancamentoDialog from './NovoLancamentoDialog';
import LancamentoDetalheDialog from './LancamentoDetalheDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function getDateRange(periodo, customStart, customEnd) {
  const hoje = new Date();
  switch (periodo) {
    case 'hoje': return {
      start: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()),
      end: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59)
    };
    case 'ontem': {
      const d = subDays(hoje, 1);
      return {
        start: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
      };
    }
    case 'semana': return { start: startOfWeek(hoje, { locale: ptBR }), end: endOfWeek(hoje, { locale: ptBR }) };
    case 'mes': return { start: startOfMonth(hoje), end: endOfMonth(hoje) };
    case 'tudo': return { start: null, end: null };
    case 'periodo': return {
      start: customStart ? new Date(customStart) : null,
      end: customEnd ? new Date(customEnd + 'T23:59:59') : null
    };
    default: return { start: startOfMonth(hoje), end: endOfMonth(hoje) };
  }
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, isNegative, accent }) {
  return (
    <div className={`rounded-2xl px-4 py-3 min-w-0 overflow-hidden ${accent ? 'bg-gray-800 dark:bg-gray-100' : 'bg-white dark:bg-gray-800 shadow-sm'}`}>
      <p className={`text-[10px] uppercase tracking-wide mb-1 truncate ${accent ? 'text-gray-400 dark:text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>{label}</p>
      <p className={`text-lg font-semibold truncate leading-tight ${
        accent
          ? (isNegative ? 'text-red-400' : 'text-white dark:text-gray-900')
          : (isNegative ? 'text-red-500 dark:text-red-400' : 'text-gray-800 dark:text-gray-100')
      }`}>{value}</p>
      {sub && <p className={`text-[11px] mt-0.5 truncate ${accent ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>{sub}</p>}
    </div>
  );
}

// ─── LancamentoItem ───────────────────────────────────────────────────────────
function LancamentoItem({ lancamento, onClick }) {
  const isReceita = lancamento.tipo === 'Receita';
  const isPago = lancamento.status === 'Pago';
  const isPrevisto = !isPago && lancamento.status !== 'Cancelado';
  const concStatus = lancamento.status_conciliacao || 'N/A';
  const dataRef = lancamento.data_pagamento || lancamento.data_vencimento;

  return (
    <button
      onClick={() => onClick && onClick(lancamento)}
      className="w-full min-w-0 flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left active:scale-[0.99]"
    >
      {/* Ícone */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none ${
        isReceita
          ? isPago ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-700'
          : isPago ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-gray-700'
      }`}>
        {isReceita
          ? <ArrowDownLeft className={`w-4 h-4 ${isPago ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
          : <ArrowUpRight className={`w-4 h-4 ${isPago ? 'text-red-500 dark:text-red-400' : 'text-gray-400'}`} />
        }
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className={`text-sm font-medium truncate flex-1 min-w-0 ${isPrevisto ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
            {lancamento.descricao}
          </p>
          {isPrevisto && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-400 flex-none">prev.</span>
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
          {dataRef ? format(new Date(dataRef), 'dd MMM', { locale: ptBR }) : '—'}
          {lancamento.conta_financeira_nome ? ` · ${lancamento.conta_financeira_nome}` : ''}
        </p>
      </div>

      {/* Valor + conciliação */}
      <div className="flex flex-col items-end gap-1 flex-none">
        <p className={`text-sm font-semibold ${
          isReceita
            ? isPago ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
            : isPago ? 'text-red-500 dark:text-red-400' : 'text-gray-400'
        }`}>
          {isReceita ? '+' : '-'}{`R$ ${Math.abs(lancamento.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
        </p>
        {concStatus === 'Pendente' && <Clock className="w-3 h-3 text-amber-500" />}
        {concStatus === 'Discrepância' && <AlertCircle className="w-3 h-3 text-red-500" />}
      </div>
    </button>
  );
}

// ─── GroupHeader ──────────────────────────────────────────────────────────────
function GroupHeader({ label, items, onLancamentoClick }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 py-2 truncate">{label}</p>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-white/5">
        {items.map(l => (
          <LancamentoItem key={l.id} lancamento={l} onClick={onLancamentoClick} />
        ))}
      </div>
    </div>
  );
}

// ─── Filtros ──────────────────────────────────────────────────────────────────
const PERIODOS = [
  { label: 'Hoje', value: 'hoje' },
  { label: 'Ontem', value: 'ontem' },
  { label: 'Semana', value: 'semana' },
  { label: 'Mês', value: 'mes' },
  { label: 'Tudo', value: 'tudo' },
  { label: 'Período', value: 'periodo' },
];

function Filtros({ periodo, onPeriodo, customStart, customEnd, onCustom, contas, contasSel, onContas, pendentes, onPendentes }) {
  const [openContas, setOpenContas] = useState(false);
  const todasSel = contasSel.length === 0 || contasSel.length === contas.length;

  const toggle = (id) => {
    if (contasSel.includes(id)) onContas(contasSel.filter(c => c !== id));
    else onContas([...contasSel, id]);
  };

  return (
    <div className="w-full min-w-0 space-y-2">
      {/* Chips de período */}
      <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {PERIODOS.map(p => (
          <button
            key={p.value}
            onClick={() => onPeriodo(p.value)}
            className={`flex-none px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              periodo === p.value
                ? 'bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Datas customizadas */}
      {periodo === 'periodo' && (
        <div className="flex gap-2 items-center min-w-0">
          <input type="date" value={customStart || ''} onChange={e => onCustom('start', e.target.value)}
            className="flex-1 min-w-0 h-8 px-2 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent dark:bg-gray-700 dark:text-gray-200 outline-none" />
          <span className="text-xs text-gray-400 flex-none">até</span>
          <input type="date" value={customEnd || ''} onChange={e => onCustom('end', e.target.value)}
            className="flex-1 min-w-0 h-8 px-2 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent dark:bg-gray-700 dark:text-gray-200 outline-none" />
        </div>
      )}

      {/* Filtros secundários */}
      <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {/* Contas */}
        <Popover open={openContas} onOpenChange={setOpenContas}>
          <PopoverTrigger asChild>
            <button className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              !todasSel ? 'bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
              <SlidersHorizontal className="w-3 h-3 flex-none" />
              <span>{todasSel ? 'Todas as contas' : `${contasSel.length} conta${contasSel.length > 1 ? 's' : ''}`}</span>
              <ChevronDown className="w-3 h-3 flex-none" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2 dark:bg-gray-800 dark:border-gray-700" align="start">
            <div className="space-y-0.5">
              <button onClick={() => onContas([])} className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${todasSel ? 'bg-gray-100 dark:bg-gray-700 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-700'} text-gray-700 dark:text-gray-200`}>
                Todas as contas
              </button>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-1 space-y-0.5">
                {contas.map(c => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <Checkbox checked={contasSel.includes(c.id)} onCheckedChange={() => toggle(c.id)} className="w-3.5 h-3.5" />
                    <div className="w-2 h-2 rounded-full flex-none" style={{ backgroundColor: c.cor || '#10B981' }} />
                    <span className="text-xs text-gray-700 dark:text-gray-200 truncate">{c.nome}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Pendentes */}
        <button
          onClick={() => onPendentes(!pendentes)}
          className={`flex-none px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            pendentes ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
        >
          Não conciliados
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const FAB_OPCOES = [
  { tipo: 'Receita', icon: ArrowDownLeft, label: 'Receita' },
  { tipo: 'Despesa', icon: ArrowUpRight, label: 'Despesa' },
  { tipo: 'Transferência', icon: ArrowRightLeft, label: 'Transferência' },
];

export default function FluxoCaixaTab() {
  const [lancamentos, setLancamentos] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [periodo, setPeriodo] = useState('mes');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [contasSel, setContasSel] = useState([]);
  const [pendentes, setPendentes] = useState(false);
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

  const { start: dateStart, end: dateEnd } = useMemo(
    () => getDateRange(periodo, customStart, customEnd),
    [periodo, customStart, customEnd]
  );

  const filtrados = useMemo(() => lancamentos.filter(l => {
    if (l.status === 'Cancelado') return false;
    const dataRef = l.data_pagamento ? new Date(l.data_pagamento) : l.data_vencimento ? new Date(l.data_vencimento) : null;
    if (dateStart && dateEnd && dataRef && !isWithinInterval(dataRef, { start: dateStart, end: dateEnd })) return false;
    if (contasSel.length > 0 && !contasSel.includes(l.conta_financeira_id)) return false;
    if (pendentes && l.status_conciliacao !== 'Pendente') return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(l.descricao || '').toLowerCase().includes(q) &&
          !(l.categoria || '').toLowerCase().includes(q) &&
          !(l.conta_financeira_nome || '').toLowerCase().includes(q) &&
          !(l.referencia_numero || '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [lancamentos, dateStart, dateEnd, contasSel, pendentes, search]);

  const kpis = useMemo(() => {
    let entrou = 0, saiu = 0, prevEntrou = 0, prevSaiu = 0;
    filtrados.forEach(l => {
      if (l.status === 'Pago') {
        if (l.tipo === 'Receita') entrou += l.valor || 0;
        else if (l.tipo === 'Despesa') saiu += l.valor || 0;
      } else {
        if (l.tipo === 'Receita') prevEntrou += l.valor || 0;
        else if (l.tipo === 'Despesa') prevSaiu += l.valor || 0;
      }
    });
    return { entrou, saiu, saldo: entrou - saiu, prevEntrou, prevSaiu, saldoPrev: (entrou + prevEntrou) - (saiu + prevSaiu) };
  }, [filtrados]);

  const grupos = useMemo(() => {
    const hoje = new Date();
    const hojeStr = format(hoje, 'yyyy-MM-dd');
    const ontemStr = format(subDays(hoje, 1), 'yyyy-MM-dd');
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
        let label = 'Sem data';
        if (key !== 'sem-data') {
          const d = new Date(key + 'T12:00:00');
          if (key === hojeStr) label = 'Hoje';
          else if (key === ontemStr) label = 'Ontem';
          else label = format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
          if (key > hojeStr) label += ' (previsto)';
        }
        return { key, label, items };
      });
  }, [filtrados]);

  const totalPendentes = useMemo(() => lancamentos.filter(l => l.status_conciliacao === 'Pendente').length, [lancamentos]);

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-3 pb-28">

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 w-full min-w-0">
        <KpiCard label="Entrou" value={fmt(kpis.entrou)} />
        <KpiCard label="Saiu" value={fmt(kpis.saiu)} isNegative={kpis.saiu > 0} />
        <div className="col-span-2">
          <KpiCard
            label="Saldo do período"
            value={fmt(kpis.saldo)}
            sub={kpis.prevEntrou > 0 || kpis.prevSaiu > 0 ? `Projeção: ${fmt(kpis.saldoPrev)}` : null}
            isNegative={kpis.saldo < 0}
            accent
          />
        </div>
      </div>

      {/* Alerta conciliação */}
      {totalPendentes > 0 && !pendentes && (
        <button
          onClick={() => setPendentes(true)}
          className="w-full min-w-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs text-left"
        >
          <Clock className="w-3.5 h-3.5 flex-none" />
          <span className="flex-1 truncate">{totalPendentes} lançamento{totalPendentes > 1 ? 's' : ''} aguardando conciliação</span>
          <span className="flex-none font-medium">Ver →</span>
        </button>
      )}

      {/* Busca + Filtros */}
      <div className="w-full min-w-0 bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-50 dark:border-white/5">
          <Search className="w-4 h-4 text-gray-400 flex-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar movimentações..."
            className="flex-1 min-w-0 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="flex-none">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
        <div className="px-3 py-3">
          <Filtros
            periodo={periodo} onPeriodo={setPeriodo}
            customStart={customStart} customEnd={customEnd} onCustom={(k, v) => k === 'start' ? setCustomStart(v) : setCustomEnd(v)}
            contas={contas} contasSel={contasSel} onContas={setContasSel}
            pendentes={pendentes} onPendentes={setPendentes}
          />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : grupos.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <Scale className="w-10 h-10 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Nenhuma movimentação encontrada</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Use o botão + para registrar</p>
        </div>
      ) : (
        <div className="space-y-3 min-w-0 w-full">
          {grupos.map(({ key, label, items }) => (
            <GroupHeader key={key} label={label} items={items} onLancamentoClick={setDetalhe} />
          ))}
        </div>
      )}

      {/* FAB */}
      {fabOpen && <div className="fixed inset-0 z-20" onClick={() => setFabOpen(false)} />}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 flex flex-col items-end gap-2">
        {fabOpen && FAB_OPCOES.map(({ tipo, icon: Icon, label }) => (
          <button
            key={tipo}
            onClick={() => { setNovoTipo(tipo); setShowNovo(true); setFabOpen(false); }}
            className="flex items-center gap-2.5 pl-4 pr-5 py-2.5 rounded-full shadow-lg bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-sm font-medium active:scale-95 transition-transform whitespace-nowrap"
          >
            <Icon className="w-4 h-4 flex-none" />
            {label}
          </button>
        ))}
        <button
          onClick={() => setFabOpen(o => !o)}
          className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95 ${
            fabOpen ? 'bg-gray-500 rotate-45' : 'bg-gray-800 dark:bg-gray-200'
          }`}
        >
          <Plus className={`w-6 h-6 ${fabOpen ? 'text-white' : 'text-white dark:text-gray-900'}`} />
        </button>
      </div>

      {/* Dialogs */}
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