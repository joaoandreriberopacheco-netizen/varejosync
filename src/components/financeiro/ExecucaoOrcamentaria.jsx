import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { roundToTwoDecimals } from '@/lib/financialUtils';
import { ptBR } from 'date-fns/locale';
import { dataHoje, formatarSoData, toLocalDateKey } from '@/components/utils/dateUtils';
import { Plus, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Clock, Scale, Printer, Upload } from 'lucide-react';
import FluxoCaixaPrintDialog from './FluxoCaixaPrintDialog';
import { gerarExtratoFluxoCaixa } from '@/functions/gerarExtratoFluxoCaixa';
import NovoLancamentoDialog from './NovoLancamentoDialog';
import LancamentoDetalheDialog from './LancamentoDetalheDialog';
import FiltrosFluxoCaixa from './fluxo/FiltrosFluxoCaixa';
import KpiFluxo from './fluxo/KpiFluxo';
import ListaLancamentos from './fluxo/ListaLancamentos';
import ContasAbertas from './ContasAbertas';
import AgefinRecorrentes from './AgefinRecorrentes';
import AgefinImportador from '../agefin/AgefinImportador';
import ConciliacaoBancaria from './ConciliacaoBancaria';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ─── utils ────────────────────────────────────────────────────────────────────
function parseDateKey(dateKey) {
  return new Date(`${dateKey}T12:00:00-05:00`);
}

function dateRange(periodo, cs, ce) {
  const hojeKey = dataHoje();
  const base = parseDateKey(hojeKey);
  if (periodo === 'hoje') return { s: hojeKey, e: hojeKey };
  if (periodo === 'ontem') {
    const ontem = format(subDays(base, 1), 'yyyy-MM-dd');
    return { s: ontem, e: ontem };
  }
  if (periodo === 'semana') {
    return {
      s: format(startOfWeek(base, { locale: ptBR }), 'yyyy-MM-dd'),
      e: format(endOfWeek(base, { locale: ptBR }), 'yyyy-MM-dd')
    };
  }
  if (periodo === 'mes') {
    return {
      s: format(startOfMonth(base), 'yyyy-MM-dd'),
      e: format(endOfMonth(base), 'yyyy-MM-dd')
    };
  }
  if (periodo === 'tudo') return { s: null, e: null };
  if (periodo === 'periodo') return { s: cs || null, e: ce || null };
  return {
    s: format(startOfMonth(base), 'yyyy-MM-dd'),
    e: format(endOfMonth(base), 'yyyy-MM-dd')
  };
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
  const [cmvOnly, setCmvOnly] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [novoTipo, setNovoTipo] = useState('Despesa');
  const [detalhe, setDetalhe] = useState(null);
  const [conciliacaoConta, setConciliacaoConta] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [abaContas, setAbaContas] = useState('contas');
  const [showImportadorAgefin, setShowImportadorAgefin] = useState(false);
  const [showNovoFluxo, setShowNovoFluxo] = useState(false);
  const [urlDescricao, setUrlDescricao] = useState('');
  const [urlValor, setUrlValor] = useState('');
  const [urlReferenciaId, setUrlReferenciaId] = useState('');
  const [urlReferenciaTipo, setUrlReferenciaTipo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('aba') === 'agefin') {
      setAbaContas('agefin');
      params.delete('aba');
      const next = params.toString();
      window.history.replaceState({}, '', next ? `${window.location.pathname}?${next}` : window.location.pathname);
    }
  }, []);

  useEffect(() => {
    // Ler params de URL e abrir dialog se fornecidos
    const params = new URLSearchParams(window.location.search);
    const desc = params.get('descricao');
    const valor = params.get('valor');
    const refId = params.get('referencia_id');
    const refTipo = params.get('referencia_tipo');
    const tipo = params.get('tipo');
    
    if (desc) {
      setUrlDescricao(desc);
      setShowNovoFluxo(true);
    }
    if (valor) setUrlValor(valor);
    if (refId) setUrlReferenciaId(refId);
    if (refTipo) setUrlReferenciaTipo(refTipo);
    if (tipo) setNovoTipo(tipo);
    
    // Limpar URL
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (contas.length && contasSel.length === 0) {
      setContasSel(contas.map(conta => conta.id));
    }
  }, [contas]);

  useEffect(() => {
    if (!showNovoFluxo) return;
    setFabOpen(false);
  }, [showNovoFluxo]);

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

  const { s: ds, e: de } = useMemo(() => dateRange(periodo, cs, ce), [periodo, cs, ce]);

  const filtrados = useMemo(() => lancs.filter(l => {
    if (l.status === 'Cancelado' && !statusSel.includes('Cancelado')) return false;
    const cartaoCreditoPendente = l.forma_pagamento_tipo === 'Cartão Crédito' && l.status_conciliacao === 'Pendente';
    const lancamentoRealizado = l.status === 'Pago' || !!l.data_pagamento;
    if (!lancamentoRealizado && !cartaoCreditoPendente) return false;
    const dataAncora = cartaoCreditoPendente ? l.data_liquidacao_prevista || l.data_vencimento : l.data_pagamento || l.data_vencimento;
    const dataKey = dataAncora ? toLocalDateKey(dataAncora) : null;
    if ((ds || de) && !dataKey) return false;
    if (ds && dataKey < ds) return false;
    if (de && dataKey > de) return false;
    if (contasSel.length && !contasSel.includes(l.conta_financeira_id)) return false;
    if (tiposSel.length && !tiposSel.includes(l.tipo)) return false;
    if (statusSel.length && !statusSel.includes(l.status)) return false;
    if (pendentes && l.status_conciliacao !== 'Pendente') return false;
    if (cmvOnly && !l.is_custo_mercadoria) return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.descricao || '').toLowerCase().includes(q) ||
        (l.categoria || '').toLowerCase().includes(q) ||
        (l.conta_financeira_nome || '').toLowerCase().includes(q) ||
        (l.referencia_numero || '').toLowerCase().includes(q) ||
        (l.tags || []).some(t => t.toLowerCase().includes(q));
    }
    return true;
  }), [lancs, ds, de, contasSel, tiposSel, statusSel, pendentes, cmvOnly, search]);

  const kpis = useMemo(() => {
    let entrou = 0, saiu = 0, pEntrou = 0, pSaiu = 0, totalTransferencias = 0, vencidos = 0, qtdVencidos = 0;
    filtrados.forEach(l => {
      if (l.tipo === 'Transferência') { totalTransferencias += l.valor || 0; return; }
      if (l.status === 'Vencido') { vencidos += l.valor || 0; qtdVencidos++; }
      const isPago = l.status === 'Pago' || !!l.data_pagamento;
      if (isPago) {
        if (l.tipo === 'Receita') entrou += l.valor || 0;
        else if (l.tipo === 'Despesa') saiu += l.valor || 0;
      } else {
        if (l.tipo === 'Receita') pEntrou += l.valor || 0;
        else if (l.tipo === 'Despesa') pSaiu += l.valor || 0;
      }
    });
    return {
      entrou: roundToTwoDecimals(entrou),
      saiu: roundToTwoDecimals(saiu),
      saldo: roundToTwoDecimals(entrou - saiu),
      pEntrou: roundToTwoDecimals(pEntrou),
      pSaiu: roundToTwoDecimals(pSaiu),
      saldoPrev: roundToTwoDecimals(entrou + pEntrou - saiu - pSaiu),
      totalTransferencias: roundToTwoDecimals(totalTransferencias),
      vencidos: roundToTwoDecimals(vencidos),
      qtdVencidos
    };
  }, [filtrados]);

  const grupos = useMemo(() => {
    const hStr = dataHoje();
    const oStr = format(subDays(parseDateKey(hStr), 1), 'yyyy-MM-dd');
    const map = {};
    filtrados.forEach(l => {
      const dr = l.data_pagamento || l.data_vencimento;
      const k = dr ? toLocalDateKey(dr) : 'sem-data';
      (map[k] = map[k] || []).push(l);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a)).map(([k, items]) => {
      let label = 'Sem data';
      if (k !== 'sem-data') {
        const d = parseDateKey(k);
        label = k === hStr ? 'Hoje' : k === oStr ? 'Ontem' : format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
        if (k > hStr) label += ' (previsto)';
      }
      const totais = { r: 0, d: 0 };
      items.forEach(l => {
        const cartaoCreditoPendente = l.forma_pagamento_tipo === 'Cartão Crédito' && l.status_conciliacao === 'Pendente';
        const isPago = l.status === 'Pago' || !!l.data_pagamento;
        if (l.tipo === 'Receita' && (isPago || cartaoCreditoPendente)) totais.r += l.valor || 0;
        if (l.tipo === 'Despesa' && isPago) totais.d += l.valor || 0;
      });
      return { k, label, items, totais: { r: roundToTwoDecimals(totais.r), d: roundToTwoDecimals(totais.d) } };
    });
  }, [filtrados]);

  const totalPend = useMemo(() => lancs.filter(l => l.status_conciliacao === 'Pendente').length, [lancs]);
  const hasActiveFilters = tiposSel.length > 0 || contasSel.length > 0 || statusSel.length > 0 || pendentes || cmvOnly || !!search;

  const [aba, setAba] = useState('fluxo'); // 'fluxo' | 'contas'

  const periodoLabel = useMemo(() => {
    if (periodo === 'tudo') return 'Todo o período';
    if (periodo === 'hoje') return 'Hoje';
    if (periodo === 'ontem') return 'Ontem';
    if (periodo === 'semana') return 'Esta semana';
    if (periodo === 'mes') return 'Este mês';
    if (periodo === 'periodo' && cs && ce) return `${formatarSoData(cs)} até ${formatarSoData(ce)}`;
    return 'Período atual';
  }, [periodo, cs, ce]);

  const contasSelecionadasLabel = useMemo(() => {
    if (contas.length && contasSel.length === contas.length) return 'Todas as contas';
    if (contasSel.length === 1) {
      return contas.find(conta => conta.id === contasSel[0])?.nome || '1 conta';
    }
    if (contasSel.length > 1) return `${contasSel.length} contas`;
    return 'Nenhuma conta';
  }, [contas, contasSel]);

  const filtrosDesc = useMemo(() => {
    const partes = [periodoLabel, contasSelecionadasLabel];
    if (tiposSel.length) partes.push(`Tipos: ${tiposSel.join(', ')}`);
    if (statusSel.length) partes.push(`Status: ${statusSel.join(', ')}`);
    if (pendentes) partes.push('Conciliação pendente');
    if (cmvOnly) partes.push('Somente CMV');
    if (search) partes.push(`Busca: ${search}`);
    return partes.join(' · ');
  }, [periodoLabel, contasSelecionadasLabel, tiposSel, statusSel, pendentes, cmvOnly, search]);

  const handlePrint = async () => {
    const response = await gerarExtratoFluxoCaixa({
      grupos,
      filtros_desc: filtrosDesc,
      kpis,
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ExtratoFluxoCaixa.pdf';
    link.click();
    window.URL.revokeObjectURL(url);
    setShowPrintDialog(false);
  };

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-4 pb-28">
      {/* Header + tabs */}
      <div className="min-w-0 max-w-full space-y-4 rounded-[24px] border border-transparent bg-[#F3F4F6] px-3 py-4 sm:space-y-6 sm:rounded-[32px] sm:px-5 sm:py-5 dark:border-border dark:bg-card">
        <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1 space-y-1 pr-0.5 sm:space-y-2 sm:pr-1">
            <p className="text-[24px] leading-none font-semibold text-gray-900 sm:text-[32px] dark:text-gray-100 font-glacial">Financeiro</p>
            <p className="text-xs text-gray-500 sm:text-sm dark:text-gray-400">Fluxo e contas com visual mais leve, limpo e direto.</p>
          </div>
          {aba === 'fluxo' && (
            <button
              onClick={() => setShowPrintDialog(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-white/90 dark:bg-slate-800"
              aria-label="Imprimir extrato"
            >
              <Printer className="w-4 h-4 text-gray-700 dark:text-gray-200" />
            </button>
          )}
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => setAba('fluxo')}
            className={`min-w-0 rounded-[18px] px-2 py-2.5 text-center transition-all sm:rounded-[22px] sm:px-3 sm:py-3 ${aba === 'fluxo' ? 'bg-white dark:bg-slate-800 opacity-100' : 'bg-white/80 dark:bg-slate-800/70 opacity-85'}`}
          >
            <div className={`mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-[13px] sm:mb-2 sm:h-10 sm:w-10 sm:rounded-[15px] ${aba === 'fluxo' ? 'bg-[#E5E7EB] dark:bg-slate-700' : 'bg-[#ECEFF3] dark:bg-slate-800'}`}>
              <Scale className="h-3.5 w-3.5 text-gray-700 sm:h-4 sm:w-4 dark:text-gray-200" />
            </div>
            <p className="text-[12px] font-medium leading-tight text-gray-900 sm:text-[13px] dark:text-white">Fluxo de Caixa</p>
            <p className="mt-0.5 hidden text-[10px] text-gray-500 dark:text-gray-400 sm:mt-1 sm:block">Movimento do período</p>
          </button>
          <button
            type="button"
            onClick={() => setAba('contas')}
            className={`min-w-0 rounded-[18px] px-2 py-2.5 text-center transition-all sm:rounded-[22px] sm:px-3 sm:py-3 ${aba === 'contas' ? 'bg-white dark:bg-slate-800 opacity-100' : 'bg-white/80 dark:bg-slate-800/70 opacity-85'}`}
          >
            <div className={`mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-[13px] sm:mb-2 sm:h-10 sm:w-10 sm:rounded-[15px] ${aba === 'contas' ? 'bg-[#E5E7EB] dark:bg-slate-700' : 'bg-[#ECEFF3] dark:bg-slate-800'}`}>
              <Clock className="h-3.5 w-3.5 text-gray-700 sm:h-4 sm:w-4 dark:text-gray-200" />
            </div>
            <p className="text-[12px] font-medium leading-tight text-gray-900 sm:text-[13px] dark:text-white">Contas Abertas</p>
            <p className="mt-0.5 hidden text-[10px] text-gray-500 dark:text-gray-400 sm:mt-1 sm:block">Pendências e cobranças</p>
          </button>
        </div>

        {aba === 'fluxo' && (
          <div className="min-w-0 space-y-4 sm:space-y-6">
            {/* KPIs */}
            <KpiFluxo kpis={kpis} />

            {/* Alerta conciliação pendente */}
            {totalPend > 0 && !pendentes && (
              <button onClick={() => setPendentes(true)}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-[20px] bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs text-left">
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
              cmvOnly={cmvOnly} onCmvOnly={setCmvOnly}
              onOpenConciliacao={setConciliacaoConta}
              totalFiltrados={filtrados.length}
              hasActiveFilters={hasActiveFilters}
              onLimparFiltros={() => { setPeriodo('mes'); setCs(''); setCe(''); setTiposSel([]); setContasSel(contas.map(conta => conta.id)); setStatusSel([]); setPendentes(false); setCmvOnly(false); setSearch(''); }}
            />
          </div>
        )}

        {aba === 'contas' && (
          <div className="min-w-0 space-y-4 sm:space-y-6">
            {/* Sub-abas no mesmo padrão visual de Fluxo / Contas Abertas */}
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => setAbaContas('contas')}
                className={`min-w-0 rounded-[18px] px-2 py-2.5 text-center transition-all sm:rounded-[22px] sm:px-3 sm:py-3 ${abaContas === 'contas' ? 'bg-white dark:bg-slate-800 opacity-100' : 'bg-white/80 dark:bg-slate-800/70 opacity-85'}`}
              >
                <div className={`mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-[13px] sm:mb-2 sm:h-10 sm:w-10 sm:rounded-[15px] ${abaContas === 'contas' ? 'bg-[#E5E7EB] dark:bg-slate-700' : 'bg-[#ECEFF3] dark:bg-slate-800'}`}>
                  <ArrowUpRight className="h-3.5 w-3.5 text-gray-700 sm:h-4 sm:w-4 dark:text-gray-200" />
                </div>
                <p className="text-[12px] font-medium leading-tight text-gray-900 sm:text-[13px] dark:text-white">Contas a pagar</p>
                <p className="mt-0.5 hidden text-[10px] text-gray-500 dark:text-gray-400 sm:mt-1 sm:block">Pendências e pagamentos</p>
              </button>
              <button
                type="button"
                onClick={() => setAbaContas('agefin')}
                className={`min-w-0 rounded-[18px] px-2 py-2.5 text-center transition-all sm:rounded-[22px] sm:px-3 sm:py-3 ${abaContas === 'agefin' ? 'bg-white dark:bg-slate-800 opacity-100' : 'bg-white/80 dark:bg-slate-800/70 opacity-85'}`}
              >
                <div className={`mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-[13px] sm:mb-2 sm:h-10 sm:w-10 sm:rounded-[15px] ${abaContas === 'agefin' ? 'bg-[#E5E7EB] dark:bg-slate-700' : 'bg-[#ECEFF3] dark:bg-slate-800'}`}>
                  <Upload className="h-3.5 w-3.5 text-gray-700 sm:h-4 sm:w-4 dark:text-gray-200" />
                </div>
                <p className="text-[12px] font-medium leading-tight text-gray-900 sm:text-[13px] dark:text-white">Atualizar boletos</p>
                <p className="mt-0.5 hidden text-[10px] text-gray-500 dark:text-gray-400 sm:mt-1 sm:block">PDF e recorrências</p>
              </button>
            </div>

            {abaContas === 'contas' ? (
              <ContasAbertas onOpenImportador={() => setShowImportadorAgefin(true)} />
            ) : (
              <div className="min-w-0">
                <AgefinRecorrentes />
              </div>
            )}
          </div>
        )}
      </div>

      {aba === 'contas' && (
        <>
        <Dialog open={showImportadorAgefin} onOpenChange={setShowImportadorAgefin}>
          <DialogContent className="flex h-[100dvh] min-h-0 w-screen max-w-none flex-col overflow-hidden rounded-none border-0 bg-white/95 p-0 shadow-xl backdrop-blur-xl dark:bg-slate-900/95 md:h-auto md:max-h-[92vh] md:w-[min(42rem,calc(100vw-2rem))] md:max-w-2xl md:rounded-3xl">
            <DialogHeader className="shrink-0 px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800">
              <DialogTitle className="text-gray-900 dark:text-white">Importar conta</DialogTitle>
            </DialogHeader>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-none">
              <AgefinImportador
                onSuccess={(_, options) => {
                  load();
                  if (options?.close) {
                    setShowImportadorAgefin(false);
                  }
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
        </>
      )}

      {aba === 'fluxo' && (
        <>
          {/* Lista */}
          <ListaLancamentos grupos={grupos} loading={loading} onRow={setDetalhe} />

          {/* FAB */}
          {fabOpen && !showNovoFluxo && <div className="fixed inset-0 z-[54] bg-slate-950/55 backdrop-blur-[2px]" onClick={() => setFabOpen(false)} />}
          <div className="fixed right-4 z-[55] flex flex-col items-end gap-2 p38-bottom-fab1 lg:right-6">
            {fabOpen && FAB_ITEMS.map(({ tipo, icon: Icon, label }) => (
              <button key={tipo}
                onClick={() => {
                  setFabOpen(false);
                  setNovoTipo(tipo);
                  setShowNovoFluxo(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 text-sm font-medium shadow-lg whitespace-nowrap active:scale-95 transition-transform">
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
            <button
              onClick={() => setFabOpen(o => !o)}
              className={`w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all ${fabOpen ? 'bg-slate-700 rotate-45' : 'bg-slate-900 dark:bg-slate-200'}`}>
              <Plus className={`w-6 h-6 ${fabOpen ? 'text-white' : 'text-white dark:text-slate-900'}`} />
            </button>
          </div>

          {/* Dialogs */}
          {detalhe && <LancamentoDetalheDialog lancamento={detalhe} contas={contas} onClose={() => setDetalhe(null)} onSaved={() => { load(); setDetalhe(null); }} />}
          <NovoLancamentoDialog 
            open={showNovoFluxo} 
            tipoInicial={novoTipo} 
            descricaoInicial={urlDescricao}
            valorInicial={urlValor}
            referenciaId={urlReferenciaId}
            referenciaTipo={urlReferenciaTipo}
            onClose={() => { setShowNovoFluxo(false); setFabOpen(false); setUrlDescricao(''); setUrlValor(''); setUrlReferenciaId(''); setUrlReferenciaTipo(''); }} 
            onSaved={load} 
          />
          <FluxoCaixaPrintDialog
            open={showPrintDialog}
            onOpenChange={setShowPrintDialog}
            onPrintExtratoCompleto={handlePrint}
            onPrintExtratoFiltrado={handlePrint}
            contasSelecionadasLabel={contasSelecionadasLabel}
            periodoLabel={periodoLabel}
          />

          <Dialog open={conciliacaoConta !== false} onOpenChange={(open) => !open && setConciliacaoConta(false)}>
            <DialogContent className="flex h-[85vh] max-h-[90vh] w-[calc(100vw-1rem)] max-w-3xl flex-col overflow-hidden border-gray-700 p-0 dark:border-gray-700 dark:bg-gray-800">
              <DialogHeader className="shrink-0 px-6 pb-3 pt-6">
                <DialogTitle className="text-gray-800 dark:text-gray-200">Conciliação em lote — {conciliacaoConta?.nome || 'Todas as contas'}</DialogTitle>
              </DialogHeader>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 md:px-6 md:pb-6">
                <ConciliacaoBancaria
                  contaId={conciliacaoConta?.id || null}
                  contaNome={conciliacaoConta?.nome || 'Todas as contas'}
                  onClose={() => setConciliacaoConta(false)}
                  onConciliado={() => {
                    load();
                    setConciliacaoConta(false);
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>

        </>
      )}
    </div>
  );
}