import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { roundToTwoDecimals } from '@/lib/financialUtils';
import {
  calcularKpisFluxoPeriodo,
  calcularSaldosTodasContas,
  contaUsaRegraCaixaPDV,
  getDataMovimentoCaixa,
  isTransferenciaEntreContas,
  lancamentoPertenceContasSelecionadas,
} from '@/lib/saldoContaFinanceira';
import { reconciliarSaldoCaixaPDVSemTurnoAberto, backfillLancamentosMovimentosCaixaPDV } from '@/lib/contaDestinoCaixaPDV';
import { sincronizarSaldosContasFinanceiras } from '@/lib/sincronizarSaldoContasFinanceiras';
import { montarGruposFluxoCaixa, prepararGruposFluxoComSaldoAcumulado } from '@/lib/gruposMovimentacaoConta';
import {
  getDataAncoraFluxoKey,
  isLancamentoCancelado,
  isLancamentoRealizadoFluxo,
} from '@/lib/lancamentoFinanceiroStatus';
import { ptBR } from 'date-fns/locale';
import { dataHoje, formatarSoData, toLocalDateKey } from '@/components/utils/dateUtils';
import { Plus, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Printer } from 'lucide-react';
import FluxoCaixaPrintDialog from './FluxoCaixaPrintDialog';
import { gerarExtratoFluxoCaixa } from '@/functions/gerarExtratoFluxoCaixa';
import NovoLancamentoDialog from './NovoLancamentoDialog';
import LancamentoDetalheDialog from './LancamentoDetalheDialog';
import FiltrosFluxoCaixa, { PERIODO_LABELS } from './fluxo/FiltrosFluxoCaixa';
import FinanceiroPillTabs from './fluxo/FinanceiroPillTabs';
import FinanceiroListaMeta, { FinanceiroSummaryChip } from './fluxo/FinanceiroListaMeta';
import KpiFluxoBar from './fluxo/KpiFluxoBar';
import ListaLancamentos from './fluxo/ListaLancamentos';
import { formatFinanceiroGrupoLabel } from './fluxo/FinanceiroListaShared';
import {
  ContasAbertasProvider,
  ContasAbertasKpis,
  ContasAbertasFiltros,
  ContasAbertasListaPane,
} from './ContasAbertas';
import {
  GestaoContasEmbedded,
  GestaoContasKpis,
  GestaoContasPane,
} from './GestaoContasFinanceiras';
import AgefinRecorrentes from './AgefinRecorrentes';
import AgefinImportador from '../agefin/AgefinImportador';
import ConciliacaoBancaria from './ConciliacaoBancaria';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DATA_CORTE_HISTORICO_PADRAO,
  gravarPreferenciasCorteHistorico,
  lerPreferenciasCorteHistorico,
  passaFiltroCorteHistorico,
} from '@/lib/filtroDataFinanceiro';
import {
  lancamentoPassaBuscaFluxo,
  contasMatchBuscaFluxo,
  contasSelEfetivasFluxo,
  contasVisiveisFluxo,
  idsFiltroContasFluxo,
} from '@/lib/buscaFluxoCaixa';

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
  const [movimentos, setMovimentos] = useState([]);
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
  const [conciliacaoConta, setConciliacaoConta] = useState(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [aba, setAba] = useState('fluxo'); // 'fluxo' | 'caixas' | 'contas'
  const [abaContas, setAbaContas] = useState('contas');
  const [showImportadorAgefin, setShowImportadorAgefin] = useState(false);
  const [showNovoFluxo, setShowNovoFluxo] = useState(false);
  const [ordemLancamentos, setOrdemLancamentos] = useState('desc');
  const [urlDescricao, setUrlDescricao] = useState('');
  const [urlValor, setUrlValor] = useState('');
  const [urlReferenciaId, setUrlReferenciaId] = useState('');
  const [urlReferenciaTipo, setUrlReferenciaTipo] = useState('');
  const [mostrarHistoricoAnterior, setMostrarHistoricoAnterior] = useState(
    () => lerPreferenciasCorteHistorico().mostrarHistoricoAnterior,
  );
  const [dataCorteHistorico, setDataCorteHistorico] = useState(
    () => lerPreferenciasCorteHistorico().dataCorte || DATA_CORTE_HISTORICO_PADRAO,
  );

  const atualizarCorteHistorico = useCallback((mostrar, dataCorte) => {
    setMostrarHistoricoAnterior(mostrar);
    setDataCorteHistorico(dataCorte);
    gravarPreferenciasCorteHistorico(mostrar, dataCorte);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('aba') === 'agefin') {
      setAba('contas');
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
    if (!showNovoFluxo) return;
    setFabOpen(false);
  }, [showNovoFluxo]);

  const syncCaixaPDVMaintenance = async (cts, movs, lancamentosIniciais) => {
    let lancamentos = lancamentosIniciais;
    let changed = false;
    const pdvContas = cts.filter((c) => contaUsaRegraCaixaPDV(c));

    const backfill = await backfillLancamentosMovimentosCaixaPDV(base44, cts);
    if (backfill) {
      changed = true;
      lancamentos = await base44.entities.LancamentoFinanceiro.list('-data_vencimento');
    }

    for (const conta of pdvContas) {
      const reconciliou = await reconciliarSaldoCaixaPDVSemTurnoAberto(
        base44,
        conta,
        cts,
        lancamentos,
        movs,
      );
      if (reconciliou) {
        changed = true;
        lancamentos = await base44.entities.LancamentoFinanceiro.list('-data_vencimento');
      }
    }

    if (changed) {
      setLancs(lancamentos);
    }
  };

  const load = async () => {
    setLoading(true);
    let snapshot = null;
    try {
      const [ls, cts, movs] = await Promise.all([
        base44.entities.LancamentoFinanceiro.list('-data_vencimento'),
        base44.entities.ContasFinanceiras.list(),
        base44.entities.MovimentosCaixa.list(),
      ]);
      snapshot = { ls, cts, movs };

      setLancs(ls);
      setMovimentos(movs);
      setContas(cts);
      const ativas = cts.filter((c) => c.ativo !== false);
      setContasSel((prev) => (prev.length ? prev : ativas.map((c) => c.id)));
    } catch (error) {
      console.error('[Fluxo de Caixa] Erro ao carregar:', error);
    } finally {
      setLoading(false);
    }

    if (!snapshot) return null;
    try {
      await syncCaixaPDVMaintenance(snapshot.cts, snapshot.movs, snapshot.ls);
      const [ls2, movs2] = await Promise.all([
        base44.entities.LancamentoFinanceiro.list('-data_vencimento'),
        base44.entities.MovimentosCaixa.list(),
      ]);
      const contaIds = snapshot.cts.filter((c) => c.ativo !== false).map((c) => c.id);
      await sincronizarSaldosContasFinanceiras(base44, {
        contas: snapshot.cts,
        lancamentos: ls2,
        movimentos: movs2,
        contaIds,
      });
      const cts2 = await base44.entities.ContasFinanceiras.list();
      setLancs(ls2);
      setMovimentos(movs2);
      setContas(cts2);
      return { ...snapshot, ls: ls2, movs: movs2, cts: cts2 };
    } catch (error) {
      console.error('[Fluxo de Caixa] Erro na manutenção PDV/sincronização:', error);
    }
    return snapshot;
  };

  const { s: ds, e: de } = useMemo(() => dateRange(periodo, cs, ce), [periodo, cs, ce]);

  const contasById = useMemo(
    () => Object.fromEntries(contas.map((c) => [c.id, c])),
    [contas],
  );

  const contasAtivas = useMemo(
    () => contas.filter((c) => c.ativo !== false),
    [contas],
  );

  const contasBuscaFluxo = useMemo(
    () => contasMatchBuscaFluxo(search, contasAtivas),
    [search, contasAtivas],
  );

  const contasSelBusca = useMemo(
    () => contasSelEfetivasFluxo(contasSel, contasAtivas, contasBuscaFluxo),
    [contasSel, contasAtivas, contasBuscaFluxo],
  );

  const contasFiltroIds = useMemo(
    () => idsFiltroContasFluxo(contasSel, contasSelBusca),
    [contasSel, contasSelBusca],
  );

  const contasVisiveisSaldo = useMemo(
    () => contasVisiveisFluxo(contasSel, contasAtivas, contasSelBusca),
    [contasSel, contasAtivas, contasSelBusca],
  );

  const filtrados = useMemo(() => lancs.filter(l => {
    if (isLancamentoCancelado(l) && !statusSel.includes('Cancelado')) return false;
    if (!isLancamentoRealizadoFluxo(l)) return false;
    const dataKey = getDataAncoraFluxoKey(l);
    if ((ds || de) && !dataKey) return false;
    if (ds && dataKey < ds) return false;
    if (de && dataKey > de) return false;
    if (!passaFiltroCorteHistorico(dataKey, { mostrarHistoricoAnterior, dataCorte: dataCorteHistorico })) return false;
    if (contasSel.length && !lancamentoPertenceContasSelecionadas(l, contasSel, contasById)) return false;
    if (tiposSel.length) {
      const matchTipo = tiposSel.includes(l.tipo);
      const matchTransf = tiposSel.includes('Transferência') && isTransferenciaEntreContas(l);
      if (!matchTipo && !matchTransf) return false;
    }
    if (statusSel.length && !statusSel.includes(l.status)) return false;
    if (pendentes && l.status_conciliacao !== 'Pendente') return false;
    if (cmvOnly && !l.is_custo_mercadoria) return false;
    if (search && !lancamentoPassaBuscaFluxo(l, search, contasAtivas, contasById)) return false;
    return true;
  }), [lancs, ds, de, contasSel, contasById, contasAtivas, tiposSel, statusSel, pendentes, cmvOnly, search, mostrarHistoricoAnterior, dataCorteHistorico]);

  const movimentosFiltrados = useMemo(() => movimentos.filter((m) => {
    if (contasFiltroIds.length && !contasFiltroIds.includes(m.conta_id)) return false;
    const dataKey = getDataMovimentoCaixa(m) ? toLocalDateKey(getDataMovimentoCaixa(m)) : null;
    if ((ds || de) && !dataKey) return false;
    if (ds && dataKey < ds) return false;
    if (de && dataKey > de) return false;
    if (!passaFiltroCorteHistorico(dataKey, { mostrarHistoricoAnterior, dataCorte: dataCorteHistorico })) return false;
    return true;
  }), [movimentos, ds, de, contasFiltroIds, mostrarHistoricoAnterior, dataCorteHistorico]);

  const kpis = useMemo(() => {
    const baseKpis = calcularKpisFluxoPeriodo(
      filtrados,
      movimentosFiltrados,
      lancs,
      contasById,
      contasFiltroIds,
    );
    const saldosMap = calcularSaldosTodasContas(contasVisiveisSaldo, lancs, movimentos);
    const saldoContas = contasVisiveisSaldo.reduce((acc, c) => acc + (saldosMap[c.id] || 0), 0);
    return {
      ...baseKpis,
      saldoContas: roundToTwoDecimals(saldoContas),
    };
  }, [filtrados, movimentosFiltrados, lancs, contasById, contasVisiveisSaldo, contasFiltroIds, movimentos]);

  const grupos = useMemo(() => {
    const hStr = dataHoje();
    const oStr = format(subDays(parseDateKey(hStr), 1), 'yyyy-MM-dd');

    const base = montarGruposFluxoCaixa({
      lancamentos: filtrados,
      movimentos: movimentosFiltrados,
      todosLancamentos: lancs,
      contas,
      contasSel: contasFiltroIds,
      contasById,
      formatGrupoLabel: formatFinanceiroGrupoLabel,
      hStr,
      oStr,
      ordemLancamentos,
    });

    return prepararGruposFluxoComSaldoAcumulado({
      grupos: base,
      saldoContasAtual: kpis.saldoContas,
      lancamentos: lancs,
      movimentos,
      todosLancamentos: lancs,
      contas,
      contasSel: contasFiltroIds,
      contasById,
    });
  }, [filtrados, movimentosFiltrados, lancs, contas, contasFiltroIds, contasById, ordemLancamentos, kpis.saldoContas, movimentos]);

  const totalPend = useMemo(() => lancs.filter(l => l.status_conciliacao === 'Pendente').length, [lancs]);
  const hasActiveFilters = tiposSel.length > 0 || contasSel.length > 0 || statusSel.length > 0 || pendentes || cmvOnly || mostrarHistoricoAnterior || !!search;

  const abrirConciliacao = useCallback((conta) => {
    if (conta === null) {
      setConciliacaoConta({ id: null, nome: 'Todas as contas' });
      return;
    }
    setConciliacaoConta(conta);
  }, []);

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
    if (mostrarHistoricoAnterior) partes.push('Histórico completo');
    return partes.join(' · ');
  }, [periodoLabel, contasSelecionadasLabel, tiposSel, statusSel, pendentes, cmvOnly, search, mostrarHistoricoAnterior]);

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

  const contasPagarAtiva = aba === 'contas' && abaContas === 'contas';
  const caixasAtiva = aba === 'caixas';
  const financeiroShared = useMemo(
    () => ({
      lancs,
      movimentos,
      contas,
      contasAtivas,
      loading,
      reload: load,
    }),
    [lancs, movimentos, contas, contasAtivas, loading],
  );
  const contasShared = financeiroShared;

  const abasPrincipais = [
    { value: 'fluxo', label: 'Fluxo de Caixa', shortLabel: 'Fluxo' },
    { value: 'caixas', label: 'Caixas e Bancos', shortLabel: 'Caixas' },
    { value: 'contas', label: 'Contas Abertas', shortLabel: 'Contas' },
  ];

  return (
    <GestaoContasEmbedded active={caixasAtiva} shared={financeiroShared}>
    <ContasAbertasProvider
      active={contasPagarAtiva}
      shared={contasShared}
      onOpenImportador={() => setShowImportadorAgefin(true)}
    >
    <div className="w-full min-w-0 max-w-full space-y-3 pb-[var(--p38-scroll-pad-below-nav)] font-din-1451">
      {/* Header unificado — título, KPIs do fluxo, abas */}
      <div className="min-w-0 max-w-full space-y-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold leading-none text-foreground font-glacial md:text-2xl">Financeiro</p>
            {aba === 'fluxo' && (
              <button
                onClick={() => setShowPrintDialog(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg p38-field-surface border-0 hover:opacity-90 transition-opacity"
                aria-label="Imprimir extrato"
              >
                <Printer className="w-4 h-4 text-foreground/90" />
              </button>
            )}
          </div>

          {aba === 'fluxo' && <KpiFluxoBar kpis={kpis} />}

          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3">
            <FinanceiroPillTabs
              stretch
              compact
              value={aba}
              onChange={setAba}
              items={abasPrincipais}
              className="md:w-auto md:shrink-0"
            />
            {aba === 'contas' && (
              <FinanceiroPillTabs
                stretch
                compact
                value={abaContas}
                onChange={setAbaContas}
                items={[
                  { value: 'contas', label: 'Contas a pagar', shortLabel: 'A pagar' },
                  { value: 'agefin', label: 'Atualizar boletos', shortLabel: 'Boletos' },
                ]}
                className="md:w-auto md:shrink-0"
              />
            )}
          </div>

          {caixasAtiva && <GestaoContasKpis />}
          {aba === 'contas' && abaContas === 'contas' && <ContasAbertasKpis layout="stack" />}
          {aba === 'contas' && abaContas === 'agefin' && <AgefinRecorrentes />}
        </div>
      </div>

      {aba === 'fluxo' && (
        <>
          <FiltrosFluxoCaixa
            search={search}
            onSearch={setSearch}
            periodo={periodo}
            onPeriodo={setPeriodo}
            customStart={cs}
            customEnd={ce}
            onCustom={(k, v) => (k === 'start' ? setCs(v) : setCe(v))}
            contas={contasAtivas}
            contasSel={contasSel}
            onContasSel={setContasSel}
            tiposSel={tiposSel}
            onTiposSel={setTiposSel}
            statusSel={statusSel}
            onStatusSel={setStatusSel}
            pendentes={pendentes}
            onPendentes={setPendentes}
            cmvOnly={cmvOnly}
            onCmvOnly={setCmvOnly}
            onOpenConciliacao={abrirConciliacao}
            conciliacaoPendente={totalPend}
            ordemLancamentos={ordemLancamentos}
            onOrdemLancamentosChange={setOrdemLancamentos}
            mostrarHistoricoAnterior={mostrarHistoricoAnterior}
            dataCorteHistorico={dataCorteHistorico}
            onMostrarHistoricoAnterior={(v) => atualizarCorteHistorico(v, dataCorteHistorico)}
            onDataCorteHistorico={(v) => atualizarCorteHistorico(mostrarHistoricoAnterior, v || DATA_CORTE_HISTORICO_PADRAO)}
          />

          <FinanceiroListaMeta
            total={filtrados.length}
            totalLabel={filtrados.length === 1 ? 'lançamento' : 'lançamentos'}
            hasActiveFilters={hasActiveFilters}
            onLimparFiltros={() => {
              setPeriodo('mes');
              setCs('');
              setCe('');
              setTiposSel([]);
              setContasSel(contasAtivas.map((conta) => conta.id));
              setStatusSel([]);
              setPendentes(false);
              setCmvOnly(false);
              setSearch('');
            }}
            summaryChips={
              <>
                {periodo !== 'mes' && (
                  <FinanceiroSummaryChip>{PERIODO_LABELS[periodo] || periodo}</FinanceiroSummaryChip>
                )}
                {contas.length > 0 && contasSel.length > 0 && contasSel.length < contas.length && (
                  <FinanceiroSummaryChip>
                    {contasSel.length} conta{contasSel.length > 1 ? 's' : ''}
                  </FinanceiroSummaryChip>
                )}
                {tiposSel.length > 0 && (
                  <FinanceiroSummaryChip>{tiposSel.join(', ')}</FinanceiroSummaryChip>
                )}
                {statusSel.length > 0 && (
                  <FinanceiroSummaryChip>{statusSel.length} status</FinanceiroSummaryChip>
                )}
                {pendentes && <FinanceiroSummaryChip>Conciliação</FinanceiroSummaryChip>}
                {cmvOnly && <FinanceiroSummaryChip>CMV</FinanceiroSummaryChip>}
                {mostrarHistoricoAnterior && (
                  <FinanceiroSummaryChip>Histórico completo</FinanceiroSummaryChip>
                )}
              </>
            }
          />

          <ListaLancamentos
            grupos={grupos}
            loading={loading}
            onRow={(l) => {
              if (l.origem === 'movimento') return;
              setDetalhe(l);
            }}
          />

          {fabOpen && !showNovoFluxo && <div className="fixed inset-0 z-[54] bg-muted/55 backdrop-blur-[2px]" onClick={() => setFabOpen(false)} />}
          <div className="fixed right-4 z-[55] flex flex-col items-end gap-2 p38-bottom-fab1 lg:right-6">
            {fabOpen && FAB_ITEMS.map(({ tipo, icon: Icon, label }) => (
              <button key={tipo}
                onClick={() => {
                  setFabOpen(false);
                  setNovoTipo(tipo);
                  setShowNovoFluxo(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-lg whitespace-nowrap active:scale-95 transition-transform">
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
            <button
              onClick={() => setFabOpen(o => !o)}
              className={`w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all ${fabOpen ? 'bg-[#383e47] rotate-45' : 'bg-[#4a5240] dark:bg-[#a4ce33]'}`}>
              <Plus className={`w-6 h-6 ${fabOpen ? 'text-white' : 'text-white dark:text-[#1f1d22]'}`} />
            </button>
          </div>

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

          <Dialog open={conciliacaoConta != null} onOpenChange={(open) => !open && setConciliacaoConta(null)}>
            <DialogContent className="flex h-[min(85dvh,90vh)] max-h-[min(85dvh,90vh)] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden border-border/40 p-0 dark:border-border/40 dark:bg-muted">
              <DialogHeader className="shrink-0 px-6 pb-3 pt-6">
                <DialogTitle className="text-foreground">Conciliação em lote — {conciliacaoConta?.nome || 'Todas as contas'}</DialogTitle>
              </DialogHeader>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 md:px-6 md:pb-6">
                <ConciliacaoBancaria
                  contaId={conciliacaoConta?.id || null}
                  contaNome={conciliacaoConta?.nome || 'Todas as contas'}
                  onClose={() => setConciliacaoConta(null)}
                  onConciliado={() => {
                    load();
                    setConciliacaoConta(null);
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {caixasAtiva && <GestaoContasPane />}

      {contasPagarAtiva && (
        <>
          <ContasAbertasFiltros />
          <ContasAbertasListaPane />
        </>
      )}

      {aba === 'contas' && (
        <>
        <Dialog open={showImportadorAgefin} onOpenChange={setShowImportadorAgefin}>
          <DialogContent className="flex h-[100dvh] min-h-0 w-screen max-w-none flex-col overflow-hidden rounded-none border-0 bg-card/95 p-0 shadow-xl backdrop-blur-xl dark:bg-card/95 md:h-auto md:max-h-[92vh] md:w-[min(42rem,calc(100vw-2rem))] md:max-w-2xl md:rounded-3xl">
            <DialogHeader className="shrink-0 px-5 pt-5 pb-3 border-b border-border/40">
              <DialogTitle className="text-foreground">Importar conta</DialogTitle>
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
    </div>
    </ContasAbertasProvider>
    </GestaoContasEmbedded>
  );
}