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
  AlertTriangle, AlertCircle, FileText, Upload, ChevronRight, Scale, Clock
} from 'lucide-react';
import FiltrosContasAbertas from './fluxo/FiltrosContasAbertas';
import { P38_ACCENT, P38_KPI_SHELL } from './fluxo/financeiroP38';
import { Checkbox } from '@/components/ui/checkbox';
import { P38MobileLine, P38MobileLineList, P38StatusLabel, p38AccentKeyFromTone } from '@/components/ui/p38-mobile-line';
import { p38Accent } from '@/lib/p38ThemeSurfaces';
import { dataHoje, formatarDataCurta } from '@/components/utils/dateUtils';
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

function KpiCell({ icon: Icon, iconClass, label, value, sub }) {
  return (
    <div className="min-w-0">
      <p className="mb-0.5 flex min-w-0 items-center gap-1 text-[9px] uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className={`h-3 w-3 shrink-0 ${iconClass || ''}`} />}
        <span className="truncate">{label}</span>
      </p>
      <p className="text-[13px] font-semibold leading-tight tabular-nums text-foreground sm:text-sm">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[9px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function KpiAbertas({ kpis }) {
  const gridClass = kpis.vencidas > 0 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3';

  return (
    <div className={P38_KPI_SHELL}>
      <div className={`grid min-w-0 gap-x-3 gap-y-2 ${gridClass}`}>
        <KpiCell
          icon={ArrowDownLeft}
          iconClass={P38_ACCENT}
          label="A receber"
          value={R(kpis.aReceber)}
          sub={kpis.qtdReceber > 0 ? `${kpis.qtdReceber} lç.` : null}
        />
        <KpiCell
          icon={ArrowUpRight}
          iconClass="text-red-500 dark:text-red-400"
          label="A pagar"
          value={R(kpis.aPagar)}
          sub={kpis.qtdPagar > 0 ? `${kpis.qtdPagar} lç.` : null}
        />
        <div className="min-w-0">
          <p className="mb-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">Saldo projetado</p>
          <p className="text-[13px] font-semibold leading-tight tabular-nums sm:text-sm">
            <span className={kpis.saldoProjetado >= 0 ? P38_ACCENT : 'text-red-600 dark:text-red-400'}>
              {kpis.saldoProjetado >= 0 ? '+' : '−'}
            </span>
            {R(Math.abs(kpis.saldoProjetado))}
          </p>
        </div>
        {kpis.vencidas > 0 && (
          <KpiCell
            icon={AlertTriangle}
            iconClass="text-red-500 dark:text-red-400"
            label="Vencidas"
            value={
              <>
                <span className="text-red-600 dark:text-red-400">−</span>
                {R(kpis.vencidas)}
              </>
            }
            sub={kpis.qtdVencidas > 0 ? `${kpis.qtdVencidas} lç.` : null}
          />
        )}
      </div>
    </div>
  );
}

// (ContasFiltro removido — seleção de conta apenas na efetivação)

/** Igual RecorrenciaBadge em ListaLancamentos */
function ContaRecorrenciaBadge({ l }) {
  if (!l.frequencia_recorrencia) return null;
  const label = l.frequencia_recorrencia === 'Parcelado' && l.parcela_atual != null
    ? `${l.parcela_atual}/${l.numero_parcelas_total ?? '—'}`
    : l.frequencia_recorrencia;
  return (
    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[0.6rem] font-medium text-muted-foreground dark:bg-muted">
      {label}
    </span>
  );
}

// ─── Linha (mesmo layout que LancRow em ListaLancamentos) ───────────────────
function contaRowTone(l) {
  const isPago = isLancamentoPago(l);
  if (isPago) return 'muted';
  if (l.status === 'Vencido') return 'danger';
  return l.tipo === 'Receita' ? 'success' : 'warning';
}

function ContaRow({ l, onPagar, onClick, emSelecao, selecionado, onToggleSelecionado, striped }) {
  const isR = l.tipo === 'Receita';
  const vStr = getVencimento(l);
  const val = Math.abs(l.valor || 0);
  const isPago = isLancamentoPago(l);
  const conc = l.status_conciliacao || 'N/A';
  const tone = contaRowTone(l);
  const dataKey = vStr;
  const subtitle = `${dataKey ? formatarDataCurta(dataKey) : '—'}${l.conta_financeira_nome ? ` · ${l.conta_financeira_nome}` : ''}`;

  return (
    <P38MobileLine
      thinAccent
      striped={striped}
      accent={p38AccentKeyFromTone(tone)}
      onClick={() => !emSelecao && onClick(l)}
      className={isPago ? 'opacity-60' : undefined}
      title={l.descricao}
      subtitle={subtitle}
      meta={
        <>
          {l.categoria ? <span>{l.categoria}</span> : null}
          {!isPago && l.status ? <P38StatusLabel tone={l.status === 'Vencido' ? 'danger' : tone}>{l.status}</P38StatusLabel> : null}
          {isPago ? <P38StatusLabel tone="success">Pago</P38StatusLabel> : null}
          <ContaRecorrenciaBadge l={l} />
          {!isPago && !emSelecao && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPagar(l); }}
              className="rounded-md bg-secondary px-1.5 py-0.5 text-[0.6rem] font-medium text-muted-foreground"
            >
              Pagar
            </button>
          )}
        </>
      }
      value={
        <span className={isPago ? 'text-muted-foreground' : isR ? p38Accent.success.text : p38Accent.danger.text}>
          {isR ? '+' : '−'}{R(val)}
        </span>
      }
      trailing={
        <div className="flex items-center gap-1 shrink-0">
          {emSelecao && !isPago && (
            <Checkbox checked={selecionado} onCheckedChange={() => onToggleSelecionado(l.id)} />
          )}
          {conc === 'Pendente' && <Clock className="h-2.5 w-2.5 text-muted-foreground" />}
          {conc === 'Discrepância' && <AlertCircle className="h-2.5 w-2.5 text-muted-foreground" />}
        </div>
      }
    />
  );
}

// ─── Grupo (mesmo padrão que Grupo em ListaLancamentos: colapsável + saldo dia) ─
function GrupoContas({ label, items, onPagar, onRow, aReceberDia, aPagarDia, isVencido, emSelecao, selecionados, onToggleSelecionado }) {
  const [open, setOpen] = useState(true);
  const r = aReceberDia || 0;
  const d = aPagarDia || 0;
  const liquido = r - d;

  return (
    <div className="w-full min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full min-w-0 items-center justify-between gap-2 border-b border-border/50 dark:border-white/10 px-0.5 py-2 mb-0.5"
      >
        <p className={`min-w-0 flex-1 truncate text-left text-[0.62rem] font-semibold uppercase tracking-wide sm:tracking-widest ${isVencido ? 'text-red-400 dark:text-red-500' : 'text-muted-foreground'}`}>
          {label}
        </p>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {r > 0 && <span className="text-[0.62rem] font-medium text-muted-foreground">+{R(r)}</span>}
          {d > 0 && <span className="text-[0.62rem] font-medium text-muted-foreground">−{R(d)}</span>}
          <span className={`text-[0.62rem] font-bold ${liquido >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {liquido >= 0 ? '+' : '−'}{R(Math.abs(liquido))}
          </span>
          <ChevronRight className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
      </button>
      {open && (
        <P38MobileLineList className="block rounded-lg">
          {items.map((l, index) => (
            <ContaRow
              key={l.id}
              l={l}
              striped={index % 2 === 1}
              onPagar={onPagar}
              onClick={onRow}
              emSelecao={emSelecao}
              selecionado={selecionados.includes(l.id)}
              onToggleSelecionado={onToggleSelecionado}
            />
          ))}
        </P38MobileLineList>
      )}
    </div>
  );
}

// ─── Context (layout espelha Fluxo: KPIs+filtros no card; lista fora) ───────────
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
  const handlePagarRapido = (l) => setDetalhe(l);

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
    handlePagarRapido,
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

/** KPIs + busca + filtros + drawer + barra de lote — fica dentro do card Financeiro (como Fluxo). */
export function ContasAbertasChrome() {
  const m = useContext(ContasAbertasCtx);
  if (!m) return null;

  const {
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
    setSelectedIds,
    lancamentosSelecionados,
    setShowPagamentoLote,
  } = m;

  return (
    <div className="min-w-0 w-full max-w-full space-y-3 overflow-x-hidden">
      <KpiAbertas kpis={kpis} />

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
        totalFiltrados={filtrados.length}
        onLimparFiltros={() => {
          setPeriodo('mes');
          setTipoFiltro('todos');
          setMostrarPagas(false);
          setCs('');
          setCe('');
        }}
        footerActions={
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
        <div className="min-w-0 overflow-hidden rounded-2xl bg-card p-4 shadow-sm dark:bg-muted">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Pagamento em lote</p>
              <p className="truncate text-xs text-muted-foreground">{lancamentosSelecionados.length} item(ns) selecionado(s)</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPagamentoLote(true)}
              disabled={lancamentosSelecionados.length === 0}
              className="h-10 shrink-0 rounded-2xl bg-emerald-600 px-4 text-sm font-medium text-white disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Lista + FAB + diálogos — fora do card cinza, como ListaLancamentos no Fluxo. */
export function ContasAbertasListaPane() {
  const m = useContext(ContasAbertasCtx);
  if (!m) return null;

  const {
    loading,
    grupos,
    handlePagarRapido,
    setDetalhe,
    modoSelecaoLote,
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
  } = m;

  return (
    <>
      <div className="min-w-0 w-full max-w-full overflow-x-hidden">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : grupos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-card py-16 shadow-sm dark:bg-muted">
            <Scale className="h-9 w-9 text-muted-foreground dark:text-foreground/90" />
            <p className="text-sm text-muted-foreground">Nenhuma conta em aberto</p>
          </div>
        ) : (
          <div className="space-y-2">
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
      </div>

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