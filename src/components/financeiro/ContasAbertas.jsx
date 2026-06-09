import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  format, isWithinInterval, startOfDay, endOfDay, addDays,
  startOfMonth, endOfMonth, isBefore, isAfter, addMonths,
  eachDayOfInterval, getDay, isSameDay, subDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowDownLeft, ArrowUpRight, Plus,
  AlertTriangle, FileText, Upload,
} from 'lucide-react';
import FiltrosContasAbertas, { PERIODOS_CONTAS } from './fluxo/FiltrosContasAbertas';
import FinanceiroListaMeta, { FinanceiroSummaryChip } from './fluxo/FinanceiroListaMeta';
import ListaContasAbertas from './fluxo/ListaContasAbertas';
import { P38_ACCENT } from './fluxo/financeiroP38';
import {
  FinanceiroKpiItem,
  FinanceiroKpiStrip,
  formatKpiValor,
} from './fluxo/FinanceiroKpiInline';
import { dataHoje } from '@/components/utils/dateUtils';
import { sortLancamentosPorDescricao } from '@/lib/financialUtils';
import NovoLancamentoDialog from './NovoLancamentoDialog';
import LancamentoDetalheDialog from './LancamentoDetalheDialog';
import PagamentoLoteDialog from './PagamentoLoteDialog';
import { useToast } from '@/components/ui/use-toast';

// ─── utils ────────────────────────────────────────────────────────────────────
const R = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
const hoje = () => new Date();
const hojeStr = () => format(hoje(), 'yyyy-MM-dd');

function parseVencimento(value) {
  if (!value || typeof value !== 'string') return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getVencimento(l) {
  const parsed = parseVencimento(l.data_vencimento);
  return parsed ? format(parsed, 'yyyy-MM-dd') : null;
}

function isLancamentoPago(l) {
  return l?.status === 'Pago' || !!l?.data_pagamento;
}

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

function KpiAbertas({ kpis }) {
  return (
    <FinanceiroKpiStrip>
      <FinanceiroKpiItem
        icon={ArrowDownLeft}
        iconClass={P38_ACCENT}
        label="A receber"
        value={formatKpiValor(kpis.aReceber)}
        sub={kpis.qtdReceber > 0 ? `${kpis.qtdReceber} lç.` : null}
      />
      <FinanceiroKpiItem
        icon={ArrowUpRight}
        iconClass="text-red-500 dark:text-red-400"
        label="A pagar"
        value={formatKpiValor(kpis.aPagar)}
        sub={kpis.qtdPagar > 0 ? `${kpis.qtdPagar} lç.` : null}
      />
      <FinanceiroKpiItem
        label="Saldo proj."
        value={
          <>
            <span className={kpis.saldoProjetado >= 0 ? P38_ACCENT : 'text-red-600 dark:text-red-400'}>
              {kpis.saldoProjetado >= 0 ? '+' : '−'}
            </span>
            {formatKpiValor(Math.abs(kpis.saldoProjetado))}
          </>
        }
      />
      {kpis.vencidas > 0 && (
        <FinanceiroKpiItem
          icon={AlertTriangle}
          iconClass="text-red-500 dark:text-red-400"
          label="Vencidas"
          value={
            <>
              <span className="text-red-600 dark:text-red-400">−</span>
              {formatKpiValor(kpis.vencidas)}
            </>
          }
          sub={kpis.qtdVencidas > 0 ? `${kpis.qtdVencidas} lç.` : null}
        />
      )}
    </FinanceiroKpiStrip>
  );
}

// ─── Context (layout espelha Fluxo: KPIs no card; filtros + lista fora) ───────
const ContasAbertasCtx = createContext(null);

function useContasAbertasModel(onOpenImportador) {
  const { toast } = useToast();
  const [lancs, setLancs]         = useState([]);
  const [contas, setContas]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [periodo, setPeriodo]     = useState('mes');
  const [cs, setCs]               = useState('');
  const [ce, setCe]               = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [contasSel] = useState([]);
  const [search, setSearch]       = useState('');
  const [showNovo, setShowNovo]       = useState(false);
  const [novoTipo, setNovoTipo]       = useState('Despesa');
  const [fabOpen, setFabOpen]         = useState(false);
  const [detalhe, setDetalhe]         = useState(null);
  const [mostrarPagas, setMostrarPagas] = useState(false);
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modoSelecaoLote, setModoSelecaoLote] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showPagamentoLote, setShowPagamentoLote] = useState(false);
  const [contaLoteId, setContaLoteId] = useState('');
  const [dataPagamentoLote, setDataPagamentoLote] = useState(dataHoje());
  const [processingLote, setProcessingLote] = useState(false);

  const load = async () => {
    setLoading(true);
    const [ls, cts] = await Promise.all([
      base44.entities.LancamentoFinanceiro.list('-data_vencimento'),
      base44.entities.ContasFinanceiras.filter({ ativo: true }),
    ]);
    setLancs(ls); setContas(cts); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Lançamentos não cancelados (inclui pagas se mostrarPagas ativo)
  const emAberto = useMemo(() =>
    lancs.filter(l => {
      if (l.status === 'Cancelado' || l.tipo === 'Transferência') return false;
      // Mostra se tem tag conta_pagar OU se é despesa Em Aberto/Vencido sem tag alguma (registros legados)
      const temTag = Array.isArray(l.tags) && l.tags.length > 0;
      const ehContaPagar = Array.isArray(l.tags) && l.tags.includes('conta_pagar');
      if (temTag && !ehContaPagar) return false;
      if (!mostrarPagas && isLancamentoPago(l)) return false;
      return true;
    }),
  [lancs, mostrarPagas]);

  const { s: ds, e: de } = useMemo(() => periodoRange(periodo, cs, ce), [periodo, cs, ce]);

  const filtrados = useMemo(() => emAberto.filter(l => {
    const vStr = getVencimento(l);
    const vDate = parseVencimento(vStr);

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
    let aReceber = 0, aPagar = 0, qtdReceber = 0, qtdPagar = 0, vencidas = 0, qtdVencidas = 0;
    const hStr = hojeStr();
    // KPIs consideram apenas Em Aberto/Vencido (não as pagas)
    filtrados.filter(l => !isLancamentoPago(l)).forEach(l => {
      const vStr = getVencimento(l);
      if (l.tipo === 'Receita') { aReceber += l.valor || 0; qtdReceber++; }
      else { aPagar += l.valor || 0; qtdPagar++; }
      if (vStr && vStr < hStr) {
        vencidas += l.valor || 0;
        qtdVencidas++;
      }
    });
    return { aReceber, aPagar, saldoProjetado: aReceber - aPagar, qtdReceber, qtdPagar, vencidas, qtdVencidas };
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
        const itemsOrdenados = sortLancamentosPorDescricao(items);
        const isVencido = k !== 'sem-data' && k < hStr;
        let label = 'Sem vencimento';
        if (k !== 'sem-data') {
          const d = parseVencimento(k);
          label = k === hStr ? 'Hoje' : k === oStr ? 'Ontem' :
            isVencido ? `Venceu ${format(d, "dd 'de' MMMM", { locale: ptBR })}` :
            format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
        }
        const aReceberDia = itemsOrdenados.filter(l => l.tipo === 'Receita').reduce((s, l) => s + (l.valor || 0), 0);
        const aPagarDia   = itemsOrdenados.filter(l => l.tipo === 'Despesa').reduce((s, l) => s + (l.valor || 0), 0);
        return { k, label, items: itemsOrdenados, aReceberDia, aPagarDia, isVencido };
      });
  }, [filtrados]);

  // Marcar como pago rapidamente (abre detalhe pre-configurado)

  const handleToggleSelecionado = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const lancamentosSelecionados = filtrados.filter((l) => selectedIds.includes(l.id) && !isLancamentoPago(l));

  const handleConfirmarPagamentoLote = async () => {
    const conta = contas.find((c) => c.id === contaLoteId);
    const idsSnapshot = [...selectedIds];
    const itensLote = filtrados.filter(
      (l) => idsSnapshot.includes(l.id) && !isLancamentoPago(l)
    );
    if (!conta || !dataPagamentoLote || itensLote.length === 0) return;

    setProcessingLote(true);
    try {
      let deltaConta = 0;
      const contasMutaveis = contas.map((c) => ({ ...c }));

      for (const lancamento of itensLote) {
        const contaAnteriorId = lancamento.conta_financeira_id;
        const contaAnterior = contasMutaveis.find((c) => c.id === contaAnteriorId);
        const valor = lancamento.valor || 0;

        await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
          status: 'Pago',
          data_pagamento: dataPagamentoLote,
          status_conciliacao: 'Pendente',
          conta_financeira_id: conta.id,
          conta_financeira_nome: conta.nome,
        });

        if (contaAnterior && contaAnterior.id !== conta.id) {
          const deltaAnterior = lancamento.tipo === 'Receita' ? -valor : valor;
          await base44.entities.ContasFinanceiras.update(contaAnterior.id, {
            saldo_atual: (contaAnterior.saldo_atual || 0) + deltaAnterior,
          });
          contaAnterior.saldo_atual = (contaAnterior.saldo_atual || 0) + deltaAnterior;
        }

        deltaConta += lancamento.tipo === 'Receita'
          ? valor
          : -valor;
      }

      const contaDestino = contasMutaveis.find((c) => c.id === conta.id) || conta;
      await base44.entities.ContasFinanceiras.update(conta.id, {
        saldo_atual: (contaDestino.saldo_atual || 0) + deltaConta,
      });

      const qtd = itensLote.length;
      toast({
        title: qtd > 1 ? 'Pagamentos confirmados' : 'Pagamento confirmado',
        description: `${qtd} lançamento(s) marcado(s) como pago(s).`,
        className: 'bg-muted text-foreground',
      });

      setShowPagamentoLote(false);
      setModoSelecaoLote(false);
      setSelectedIds([]);
      setContaLoteId('');
      setDataPagamentoLote(dataHoje());
      await load();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro no pagamento em lote',
        description: error?.message || 'Não foi possível concluir todos os lançamentos.',
        variant: 'destructive',
      });
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
    { tipo: 'Importar', icon: Upload, label: 'Importar PDF', action: () => { setFabOpen(false); onOpenImportador?.(); } },
    { tipo: 'Relatorio', icon: FileText,    label: gerandoRelatorio ? 'Gerando...' : 'Relatório', action: () => { setFabOpen(false); handleGerarRelatorio(); } },
  ];

  return {
    kpis,
    filtrados,
    search,
    setSearch,
    filtersOpen,
    setFiltersOpen,
    periodo,
    setPeriodo,
    cs,
    ce,
    setCs,
    setCe,
    tipoFiltro,
    setTipoFiltro,
    mostrarPagas,
    setMostrarPagas,
    modoSelecaoLote,
    setModoSelecaoLote,
    selectedIds,
    setSelectedIds,
    lancamentosSelecionados,
    loading,
    grupos,
    setDetalhe,
    handleToggleSelecionado,
    fabOpen,
    setFabOpen,
    FAB_ITEMS,
    showNovo,
    setShowNovo,
    novoTipo,
    detalhe,
    contas,
    showPagamentoLote,
    setShowPagamentoLote,
    contaLoteId,
    setContaLoteId,
    dataPagamentoLote,
    setDataPagamentoLote,
    processingLote,
    handleConfirmarPagamentoLote,
    load,
  };
}

function ContasAbertasInnerProvider({ onOpenImportador, children }) {
  const value = useContasAbertasModel(onOpenImportador);
  return (
    <ContasAbertasCtx.Provider value={value}>
      {children}
    </ContasAbertasCtx.Provider>
  );
}

/** Ativa dados só na aba Contas a pagar (evita fetch duplicado no Fluxo). */
export function ContasAbertasProvider({ active, onOpenImportador, children }) {
  if (!active) return <>{children}</>;
  return (
    <ContasAbertasInnerProvider onOpenImportador={onOpenImportador}>
      {children}
    </ContasAbertasInnerProvider>
  );
}

/** KPIs — dentro do card cinza (box amarelo). */
export function ContasAbertasKpis() {
  const m = useContext(ContasAbertasCtx);
  if (!m) return null;
  return <KpiAbertas kpis={m.kpis} />;
}

/** Busca + filtros recolhíveis — fora do card, como Fluxo de Caixa. */
export function ContasAbertasFiltros() {
  const m = useContext(ContasAbertasCtx);
  if (!m) return null;

  const {
    search,
    setSearch,
    filtersOpen,
    setFiltersOpen,
    periodo,
    setPeriodo,
    cs,
    ce,
    setCs,
    setCe,
    tipoFiltro,
    setTipoFiltro,
    mostrarPagas,
    setMostrarPagas,
  } = m;

  return (
    <FiltrosContasAbertas
      search={search}
      onSearch={setSearch}
      filtersOpen={filtersOpen}
      onFiltersOpenChange={setFiltersOpen}
      periodo={periodo}
      onPeriodo={setPeriodo}
      cs={cs}
      ce={ce}
      onCs={setCs}
      onCe={setCe}
      tipoFiltro={tipoFiltro}
      onTipoFiltro={setTipoFiltro}
      mostrarPagas={mostrarPagas}
      onMostrarPagas={setMostrarPagas}
    />
  );
}

/** Lista + FAB + diálogos — fora do card cinza, como ListaLancamentos no Fluxo. */
export function ContasAbertasListaPane() {
  const m = useContext(ContasAbertasCtx);
  if (!m) return null;

  const {
    loading,
    grupos,
    filtrados,
    setDetalhe,
    modoSelecaoLote,
    setModoSelecaoLote,
    setSelectedIds,
    selectedIds,
    handleToggleSelecionado,
    fabOpen,
    setFabOpen,
    FAB_ITEMS,
    showNovo,
    setShowNovo,
    novoTipo,
    detalhe,
    contas,
    showPagamentoLote,
    setShowPagamentoLote,
    contaLoteId,
    setContaLoteId,
    dataPagamentoLote,
    setDataPagamentoLote,
    lancamentosSelecionados,
    handleConfirmarPagamentoLote,
    processingLote,
    load,
    periodo,
    setPeriodo,
    tipoFiltro,
    setTipoFiltro,
    mostrarPagas,
    setMostrarPagas,
    cs,
    ce,
    setCs,
    setCe,
  } = m;

  const hasActiveFilters = periodo !== 'mes' || tipoFiltro !== 'todos' || mostrarPagas || !!cs || !!ce;
  const periodoLabel = PERIODOS_CONTAS.find((p) => p.v === periodo)?.l || 'Período';
  const tipoLabel = tipoFiltro === 'Receita' ? 'A Receber' : tipoFiltro === 'Despesa' ? 'A Pagar' : tipoFiltro === 'compras' ? 'Compras' : null;

  return (
    <>
      <FinanceiroListaMeta
        total={filtrados.length}
        totalLabel={filtrados.length === 1 ? 'conta' : 'contas'}
        hasActiveFilters={hasActiveFilters}
        onLimparFiltros={() => {
          setPeriodo('mes');
          setTipoFiltro('todos');
          setMostrarPagas(false);
          setCs('');
          setCe('');
        }}
        summaryChips={
          <>
            {periodo !== 'mes' && <FinanceiroSummaryChip>{periodoLabel}</FinanceiroSummaryChip>}
            {tipoFiltro !== 'todos' && tipoLabel && <FinanceiroSummaryChip>{tipoLabel}</FinanceiroSummaryChip>}
            {mostrarPagas && (
              <FinanceiroSummaryChip className="text-green-700 dark:text-green-400">Pagas</FinanceiroSummaryChip>
            )}
          </>
        }
        extraActions={
          <button
            type="button"
            onClick={() => {
              setModoSelecaoLote((prev) => !prev);
              setSelectedIds([]);
            }}
            className={`rounded-full px-2 py-0.5 text-[10px] transition-colors ${modoSelecaoLote ? 'bg-[#4a5240] text-white dark:bg-[#a4ce33] dark:text-[#1f1d22]' : 'bg-secondary/80 text-muted-foreground dark:bg-[#383e47]'}`}
          >
            {modoSelecaoLote ? 'Cancelar lote' : 'Pagar em lote'}
          </button>
        }
      />

      {modoSelecaoLote && (
        <div className="min-w-0 overflow-hidden rounded-xl border border-border/40 bg-card/60 p-3 dark:border-white/10 dark:bg-[#26262e]/80">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Pagamento em lote</p>
              <p className="truncate text-xs text-muted-foreground">{lancamentosSelecionados.length} item(ns) selecionado(s)</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPagamentoLote(true)}
              disabled={lancamentosSelecionados.length === 0}
              className="h-9 shrink-0 rounded-xl bg-[#4a5240] px-4 text-sm font-medium text-white disabled:opacity-40 dark:bg-[#a4ce33] dark:text-[#1f1d22]"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      <ListaContasAbertas
        grupos={grupos}
        loading={loading}
        onRow={setDetalhe}
        emSelecao={modoSelecaoLote}
        selecionados={selectedIds}
        onToggleSelecionado={handleToggleSelecionado}
      />

      {fabOpen && <div className="fixed inset-0 z-[54] bg-muted/55 backdrop-blur-[2px]" onClick={() => setFabOpen(false)} />}
      <div className="fixed right-4 z-[55] flex flex-col items-end gap-2 p38-bottom-fab1 lg:right-6">
        {fabOpen && FAB_ITEMS.map(({ tipo, icon: Icon, label, action }) => (
          <button
            key={tipo}
            type="button"
            onClick={action}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-lg whitespace-nowrap transition-transform active:scale-95 dark:bg-primary dark:text-primary-foreground"
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setFabOpen(o => !o)}
          className={`flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-xl transition-all active:scale-95 ${fabOpen ? 'rotate-45 bg-[#383e47]' : 'bg-[#4a5240] dark:bg-[#a4ce33]'}`}
        >
          <Plus className={`h-6 w-6 ${fabOpen ? 'text-white' : 'text-white dark:text-[#1f1d22]'}`} />
        </button>
      </div>

      <NovoLancamentoDialog open={showNovo} tipoInicial={novoTipo} origemContaPagar onClose={() => setShowNovo(false)} onSaved={load} />
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
    </>
  );
}