import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { format, isWithinInterval, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, X, ArrowDownLeft, ArrowUpRight, ArrowRightLeft,
  Scale, Search, AlertCircle, ChevronDown, SlidersHorizontal, Clock
} from 'lucide-react';
import NovoLancamentoDialog from './NovoLancamentoDialog';
import LancamentoDetalheDialog from './LancamentoDetalheDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import PeriodoPicker from './PeriodoPicker';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtVal = (v) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

function getDateRange(periodo, customStart, customEnd) {
  const hoje = new Date();
  switch (periodo) {
    case 'hoje': return { start: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()), end: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59) };
    case 'ontem': { const d = subDays(hoje, 1); return { start: new Date(d.getFullYear(), d.getMonth(), d.getDate()), end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59) }; }
    case 'semana': return { start: startOfWeek(hoje, { locale: ptBR }), end: endOfWeek(hoje, { locale: ptBR }) };
    case 'mes': return { start: startOfMonth(hoje), end: endOfMonth(hoje) };
    case 'tudo': return { start: null, end: null };
    case 'periodo': return { start: customStart ? new Date(customStart) : null, end: customEnd ? new Date(customEnd + 'T23:59:59') : null };
    default: return { start: startOfMonth(hoje), end: endOfMonth(hoje) };
  }
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, isNegative, accent }) {
  return (
    <div style={{ minWidth: 0, overflow: 'hidden', boxSizing: 'border-box', borderRadius: 16, padding: '12px 14px' }}
      className={accent ? 'bg-gray-800 dark:bg-gray-100' : 'bg-white dark:bg-gray-800 shadow-sm'}
    >
      <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="text-gray-400 dark:text-gray-500">{label}</p>
      {/* Valor: nunca trunca, vai para linha seguinte se necessário */}
      <p style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.2, wordBreak: 'break-word' }}
        className={accent ? (isNegative ? 'text-red-400' : 'text-white dark:text-gray-900') : (isNegative ? 'text-red-500 dark:text-red-400' : 'text-gray-800 dark:text-gray-100')}
      >
        R$&nbsp;{value}
      </p>
      {sub && <p style={{ fontSize: '0.68rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className={accent ? 'text-gray-400' : 'text-gray-400 dark:text-gray-500'}>{sub}</p>}
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
  const valor = Math.abs(lancamento.valor || 0);

  return (
    <button
      onClick={() => onClick && onClick(lancamento)}
      style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}
      className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors active:scale-[0.99]"
    >
      {/* Ícone */}
      <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}
        className={isReceita ? (isPago ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-700') : (isPago ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-gray-700')}
      >
        {isReceita
          ? <ArrowDownLeft style={{ width: 15, height: 15 }} className={isPago ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
          : <ArrowUpRight style={{ width: 15, height: 15 }} className={isPago ? 'text-red-500 dark:text-red-400' : 'text-gray-400'} />
        }
      </div>

      {/* Texto central: largura fixa ~55%, transborda verticalmente */}
      <div style={{ width: '55%', minWidth: 0, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          {/* Descrição: quebra linha em vez de truncar */}
          <p style={{ fontSize: '0.8rem', fontWeight: 500, lineHeight: 1.35, wordBreak: 'break-word', flex: '1 1 auto' }}
            className={isPrevisto ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}
          >{lancamento.descricao}</p>
          {isPrevisto && <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: 4, flexShrink: 0, marginTop: 2 }} className="bg-gray-100 dark:bg-gray-700 text-gray-400">prev.</span>}
          {lancamento.is_custo_mercadoria && <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: 4, flexShrink: 0, marginTop: 2 }} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">CMV</span>}
        </div>
        <p style={{ fontSize: '0.7rem', marginTop: 2 }} className="text-gray-400 dark:text-gray-500">
          {dataRef ? format(new Date(dataRef), 'dd MMM', { locale: ptBR }) : '—'}
          {lancamento.conta_financeira_nome ? ` · ${lancamento.conta_financeira_nome}` : ''}
        </p>
      </div>

      {/* Valor: ocupa o restante, alinhado à direita, com liberdade para exibir o número completo */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, paddingTop: 2 }}>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap' }}
          className={isReceita ? (isPago ? 'text-green-600 dark:text-green-400' : 'text-gray-400') : (isPago ? 'text-red-500 dark:text-red-400' : 'text-gray-400')}
        >
          {isReceita ? '+' : '-'}R${fmtVal(valor)}
        </p>
        {concStatus === 'Pendente' && <Clock style={{ width: 10, height: 10 }} className="text-amber-500" />}
        {concStatus === 'Discrepância' && <AlertCircle style={{ width: 10, height: 10 }} className="text-red-500" />}
      </div>
    </button>
  );
}

// ─── GroupHeader ──────────────────────────────────────────────────────────────
function GroupHeader({ label, items, onLancamentoClick }) {
  return (
    <div style={{ minWidth: 0, overflow: 'hidden' }}>
      <p style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 4px' }} className="text-gray-400 dark:text-gray-500">{label}</p>
      <div style={{ overflow: 'hidden', borderRadius: 16 }} className="bg-white dark:bg-gray-800 shadow-sm divide-y divide-gray-50 dark:divide-white/5">
        {items.map(l => <LancamentoItem key={l.id} lancamento={l} onClick={onLancamentoClick} />)}
      </div>
    </div>
  );
}

// ─── Filtros secundários (Contas + Pendentes) ─────────────────────────────────
function FiltrosSecundarios({ contas, contasSel, onContas, pendentes, onPendentes }) {
  const [openContas, setOpenContas] = useState(false);
  const todasSel = contasSel.length === 0 || contasSel.length === contas.length;
  const toggle = (id) => contasSel.includes(id) ? onContas(contasSel.filter(c => c !== id)) : onContas([...contasSel, id]);

  return (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
      <Popover open={openContas} onOpenChange={setOpenContas}>
        <PopoverTrigger asChild>
          <button style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 500, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer' }}
            className={!todasSel ? 'bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}
          >
            <SlidersHorizontal style={{ width: 11, height: 11, flexShrink: 0 }} />
            {todasSel ? 'Contas' : `${contasSel.length} conta${contasSel.length > 1 ? 's' : ''}`}
            <ChevronDown style={{ width: 11, height: 11, flexShrink: 0 }} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2 dark:bg-gray-800 dark:border-gray-700" align="start">
          <div className="space-y-0.5">
            <button onClick={() => onContas([])} className={`w-full text-left px-2 py-1.5 rounded text-xs ${todasSel ? 'bg-gray-100 dark:bg-gray-700 font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-700'} text-gray-700 dark:text-gray-200`}>Todas as contas</button>
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

      <button
        onClick={() => onPendentes(!pendentes)}
        style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 500, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer' }}
        className={pendentes ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}
      >
        Não conciliados
      </button>
    </div>
  );
}

// ─── FAB ──────────────────────────────────────────────────────────────────────
const FAB_OPCOES = [
  { tipo: 'Receita', icon: ArrowDownLeft, label: 'Receita' },
  { tipo: 'Despesa', icon: ArrowUpRight, label: 'Despesa' },
  { tipo: 'Transferência', icon: ArrowRightLeft, label: 'Transferência' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FluxoCaixaTab() {
  const [lancamentos, setLancamentos] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
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

  const { start: dateStart, end: dateEnd } = useMemo(() => getDateRange(periodo, customStart, customEnd), [periodo, customStart, customEnd]);

  const filtrados = useMemo(() => lancamentos.filter(l => {
    if (l.status === 'Cancelado') return false;
    const dataRef = l.data_pagamento ? new Date(l.data_pagamento) : l.data_vencimento ? new Date(l.data_vencimento) : null;
    if (dateStart && dateEnd && dataRef && !isWithinInterval(dataRef, { start: dateStart, end: dateEnd })) return false;
    if (contasSel.length > 0 && !contasSel.includes(l.conta_financeira_id)) return false;
    if (pendentes && l.status_conciliacao !== 'Pendente') return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(l.descricao || '').toLowerCase().includes(q) && !(l.categoria || '').toLowerCase().includes(q) && !(l.conta_financeira_nome || '').toLowerCase().includes(q) && !(l.referencia_numero || '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [lancamentos, dateStart, dateEnd, contasSel, pendentes, search]);

  const kpis = useMemo(() => {
    let entrou = 0, saiu = 0, prevEntrou = 0, prevSaiu = 0;
    filtrados.forEach(l => {
      if (l.status === 'Pago') { if (l.tipo === 'Receita') entrou += l.valor || 0; else if (l.tipo === 'Despesa') saiu += l.valor || 0; }
      else { if (l.tipo === 'Receita') prevEntrou += l.valor || 0; else if (l.tipo === 'Despesa') prevSaiu += l.valor || 0; }
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
    return Object.entries(mapa).sort(([a], [b]) => b.localeCompare(a)).map(([key, items]) => {
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
    <div style={{ width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'hidden', boxSizing: 'border-box', position: 'relative' }} className="space-y-3 pb-28">

      {/* ── KPIs 2+1 ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', boxSizing: 'border-box' }}>
        <KpiCard label="Entrou" value={fmtVal(kpis.entrou)} />
        <KpiCard label="Saiu" value={fmtVal(kpis.saiu)} isNegative={kpis.saiu > 0} />
        <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
          <KpiCard
            label="Saldo do período"
            value={fmtVal(kpis.saldo)}
            sub={kpis.prevEntrou > 0 || kpis.prevSaiu > 0 ? `Projeção: R$ ${fmtVal(kpis.saldoPrev)}` : null}
            isNegative={kpis.saldo < 0}
            accent
          />
        </div>
      </div>

      {/* ── Alerta conciliação ──────────────────────────────────────────── */}
      {totalPendentes > 0 && !pendentes && (
        <button
          onClick={() => setPendentes(true)}
          style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'left' }}
          className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
        >
          <Clock style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
            {totalPendentes} lançamento{totalPendentes > 1 ? 's' : ''} aguardando conciliação
          </span>
          <span style={{ flexShrink: 0, fontSize: '0.75rem', fontWeight: 600 }}>Ver →</span>
        </button>
      )}

      {/* ── Busca + Filtros ─────────────────────────────────────────────── */}
      <div style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', borderRadius: 16, overflow: 'visible' }} className="bg-white dark:bg-gray-800 shadow-sm">
        {/* Busca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', minWidth: 0 }} className={showFilters ? 'border-b border-gray-100 dark:border-gray-700' : ''}>
          <Search style={{ width: 15, height: 15, flexShrink: 0 }} className="text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar movimentações..."
            style={{ flex: '1 1 0', minWidth: 100, background: 'transparent', border: 'none', outline: 'none', fontSize: '0.85rem' }}
            className="text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
          />
          {search && <button onClick={() => setSearch('')} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }}><X style={{ width: 14, height: 14 }} className="text-gray-400" /></button>}
          <button 
            onClick={() => setShowFilters(s => !s)} 
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '6px', borderRadius: 8 }} 
            className={`transition-colors ${showFilters ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            <SlidersHorizontal style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {showFilters && (
          <>
            {/* Período picker com carrossel + calendário */}
            <div style={{ padding: '10px 8px 6px', position: 'relative' }}>
              <PeriodoPicker
                periodo={periodo} onPeriodo={setPeriodo}
                customStart={customStart} customEnd={customEnd}
                onCustom={(k, v) => k === 'start' ? setCustomStart(v) : setCustomEnd(v)}
              />
            </div>

            {/* Filtros secundários */}
            <div style={{ padding: '6px 12px 10px' }}>
              <FiltrosSecundarios contas={contas} contasSel={contasSel} onContas={setContasSel} pendentes={pendentes} onPendentes={setPendentes} />
            </div>
          </>
        )}
      </div>

      {/* ── Lista ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : grupos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', borderRadius: 16 }} className="bg-white dark:bg-gray-800 shadow-sm">
          <Scale style={{ width: 36, height: 36, margin: '0 auto 10px' }} className="text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Nenhuma movimentação encontrada</p>
        </div>
      ) : (
        <div style={{ width: '100%', minWidth: 0 }} className="space-y-3">
          {grupos.map(({ key, label, items }) => (
            <GroupHeader key={key} label={label} items={items} onLancamentoClick={setDetalhe} />
          ))}
        </div>
      )}

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      {fabOpen && <div className="fixed inset-0 z-20" onClick={() => setFabOpen(false)} />}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-30 flex flex-col items-end gap-2">
        {fabOpen && FAB_OPCOES.map(({ tipo, icon: Icon, label }) => (
          <button
            key={tipo}
            onClick={() => { setNovoTipo(tipo); setShowNovo(true); setFabOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap' }}
            className="bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 shadow-lg active:scale-95 transition-transform"
          >
            <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
            {label}
          </button>
        ))}
        <button
          onClick={() => setFabOpen(o => !o)}
          style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }}
          className={`shadow-xl active:scale-95 ${fabOpen ? 'bg-gray-500 rotate-45' : 'bg-gray-800 dark:bg-gray-200'}`}
        >
          <Plus style={{ width: 22, height: 22 }} className={fabOpen ? 'text-white' : 'text-white dark:text-gray-900'} />
        </button>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <NovoLancamentoDialog open={showNovo} tipoInicial={novoTipo} onClose={() => setShowNovo(false)} onSaved={loadData} />
      {detalhe && (
        <LancamentoDetalheDialog lancamento={detalhe} contas={contas} onClose={() => setDetalhe(null)} onSaved={() => { loadData(); setDetalhe(null); }} />
      )}
    </div>
  );
}