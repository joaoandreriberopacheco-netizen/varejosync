import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import {
  format, isWithinInterval, startOfDay, endOfDay, addDays,
  startOfMonth, endOfMonth, isBefore, isAfter, addMonths,
  eachDayOfInterval, getDay, isSameDay, subDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowDownLeft, ArrowUpRight, Plus, X, Search,
  AlertTriangle, AlertCircle, CheckCircle2, FileText, SlidersHorizontal, Upload, ChevronRight, Scale, Clock
} from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
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

// ─── KPI Cards (alinhado a KpiFluxo — gap e padding uniformes no mobile) ─────
const kpiGap = 'gap-3';
const kpiCardTop =
  'min-w-0 rounded-[16px] border border-transparent bg-[hsl(var(--background))] px-3 py-2.5 sm:rounded-[22px] sm:px-3.5 sm:py-3 dark:border-border dark:bg-card';
const kpiCardSaldo =
  'rounded-[16px] border border-transparent bg-[hsl(var(--background))] sm:rounded-[22px] dark:border-border dark:bg-card';
const kpiSaldoPad = 'px-4 py-2.5 sm:px-4 sm:py-3 md:px-6 md:py-5';

function KpiAbertas({ kpis }) {
  const saldoBody = (
    <div className="min-w-0">
      <p className="mb-0.5 pl-0.5 text-[8px] uppercase leading-tight tracking-normal text-gray-500 sm:mb-1 sm:tracking-[0.16em] dark:text-muted-foreground">Saldo projetado</p>
      <p className="break-words text-[15px] font-semibold leading-tight tabular-nums text-gray-900 sm:text-[17px] md:text-[19px] dark:text-foreground">
        <span className={kpis.saldoProjetado >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{kpis.saldoProjetado >= 0 ? '+' : '−'}</span>
        {R(Math.abs(kpis.saldoProjetado))}
      </p>
    </div>
  );

  return (
    <div className={`flex min-w-0 w-full max-w-full flex-col ${kpiGap}`}>
      <div className={`grid min-w-0 grid-cols-2 ${kpiGap}`}>
        <div className={kpiCardTop}>
          <div className="mb-1 flex min-w-0 items-center gap-2 sm:mb-1.5 sm:gap-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[9px] bg-white sm:h-7 sm:w-7 sm:rounded-[10px] dark:bg-muted">
              <ArrowDownLeft className="h-2.5 w-2.5 text-green-600 sm:h-3 sm:w-3 dark:text-green-400" />
            </div>
            <p className="min-w-0 truncate text-[8px] uppercase leading-tight tracking-normal text-gray-500 sm:tracking-[0.16em] dark:text-muted-foreground">A receber</p>
          </div>
          <p className="break-words text-[13px] font-semibold leading-tight text-gray-900 tabular-nums sm:text-[14px] md:text-[15px] dark:text-foreground">{R(kpis.aReceber)}</p>
          {kpis.qtdReceber > 0 && (
            <p className="mt-0.5 text-[8px] text-gray-500 sm:mt-1 sm:text-[9px] dark:text-muted-foreground">
              {kpis.qtdReceber} <span className="sm:hidden">lç.</span>
              <span className="hidden sm:inline">lançamento{kpis.qtdReceber !== 1 ? 's' : ''}</span>
            </p>
          )}
        </div>
        <div className={kpiCardTop}>
          <div className="mb-1 flex min-w-0 items-center gap-2 sm:mb-1.5 sm:gap-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[9px] bg-white sm:h-7 sm:w-7 sm:rounded-[10px] dark:bg-muted">
              <ArrowUpRight className="h-2.5 w-2.5 text-red-500 sm:h-3 sm:w-3 dark:text-red-400" />
            </div>
            <p className="min-w-0 truncate text-[8px] uppercase leading-tight tracking-normal text-gray-500 sm:tracking-[0.16em] dark:text-muted-foreground">A pagar</p>
          </div>
          <p className="break-words text-[13px] font-semibold leading-tight text-gray-900 tabular-nums sm:text-[14px] md:text-[15px] dark:text-foreground">{R(kpis.aPagar)}</p>
          {kpis.qtdPagar > 0 && (
            <p className="mt-0.5 text-[8px] text-gray-500 sm:mt-1 sm:text-[9px] dark:text-muted-foreground">
              {kpis.qtdPagar} <span className="sm:hidden">lç.</span>
              <span className="hidden sm:inline">lançamento{kpis.qtdPagar !== 1 ? 's' : ''}</span>
            </p>
          )}
        </div>
      </div>

      {kpis.vencidas > 0 ? (
        <div className={`flex min-w-0 flex-col sm:flex-row sm:items-stretch ${kpiGap}`}>
          <div className={`${kpiCardSaldo} ${kpiSaldoPad} min-w-0 flex-1`}>{saldoBody}</div>
          <div className={`${kpiCardSaldo} ${kpiSaldoPad} flex min-h-0 min-w-0 flex-1 items-center gap-2 sm:gap-3`}>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500 sm:h-4 sm:w-4 dark:text-red-400" />
            <div className="min-w-0 flex-1">
              <p className="text-[8px] uppercase tracking-wider text-gray-500 sm:text-[9px] dark:text-muted-foreground">Vencidas</p>
              <p className="break-words text-[11px] font-semibold leading-snug text-gray-900 sm:text-sm dark:text-foreground">
                <span className="text-red-600 dark:text-red-400">−</span>
                {R(kpis.vencidas)}
                {kpis.qtdVencidas > 0 && (
                  <span className="text-gray-500 dark:text-muted-foreground">
                    {' '}
                    · {kpis.qtdVencidas}{' '}
                    <span className="sm:hidden">lç.</span>
                    <span className="hidden sm:inline">lançamento{kpis.qtdVencidas !== 1 ? 's' : ''}</span>
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className={`${kpiCardSaldo} ${kpiSaldoPad}`}>{saldoBody}</div>
      )}
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
    <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[0.6rem] font-medium text-gray-400 dark:bg-gray-700">
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
        className="group flex w-full min-w-0 items-center justify-between gap-2 px-0.5 py-1"
      >
        <p className={`min-w-0 flex-1 truncate text-left text-[0.62rem] font-semibold uppercase tracking-wide sm:tracking-widest ${isVencido ? 'text-red-400 dark:text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
          {label}
        </p>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {r > 0 && <span className="text-[0.62rem] font-medium text-gray-500 dark:text-gray-400">+{R(r)}</span>}
          {d > 0 && <span className="text-[0.62rem] font-medium text-gray-400 dark:text-gray-500">−{R(d)}</span>}
          <span className={`text-[0.62rem] font-bold ${liquido >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {liquido >= 0 ? '+' : '−'}{R(Math.abs(liquido))}
          </span>
          <ChevronRight className={`h-3 w-3 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
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
  const [showFilters, setShowFilters] = useState(false);
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
        className: 'bg-gray-100 text-gray-800',
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
    showFilters,
    setShowFilters,
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
    showFilters,
    setShowFilters,
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
    <div className="min-w-0 w-full max-w-full space-y-4 overflow-x-hidden sm:space-y-6">
      <KpiAbertas kpis={kpis} />

      <div className="min-w-0 rounded-[20px] border border-transparent p-0 dark:border-transparent">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[14px] border border-transparent bg-white px-2.5 sm:h-12 sm:rounded-[16px] sm:px-3 dark:border-slate-700/70 dark:bg-slate-800">
            <Search className="h-3.5 w-3.5 flex-none shrink-0 text-gray-400 sm:h-4 sm:w-4" />
            <input autoComplete="off"
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="min-w-0 flex-1 bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-500 sm:text-sm dark:text-gray-100"
            />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Limpar busca"><X className="h-3.5 w-3.5 text-gray-400" /></button>}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-transparent bg-white text-gray-900 sm:h-12 sm:w-12 sm:rounded-[16px] dark:border-slate-700/70 dark:bg-slate-800 dark:text-gray-200"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {(periodo !== 'mes' || tipoFiltro !== 'todos' || mostrarPagas || cs || ce) && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white dark:bg-white dark:text-slate-900">•</span>
            )}
          </button>
        </div>

        <div className="mt-2 flex flex-col gap-2 border-t border-white/70 pt-2 sm:mt-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-1.5 sm:pt-2.5 dark:border-slate-700/70">
          <p className="shrink-0 text-[10px] text-gray-500 sm:text-[11px] dark:text-gray-400">
            <span className="sm:hidden">{filtrados.length} lç.</span>
            <span className="hidden sm:inline">{filtrados.length} lançamento{filtrados.length !== 1 ? 's' : ''}</span>
          </p>
          <div className="flex min-w-0 flex-wrap gap-1 sm:justify-end sm:gap-1.5">
            <button
              onClick={() => {
                setModoSelecaoLote((prev) => !prev);
                setSelectedIds([]);
              }}
              className={`px-2 py-1 rounded-full text-[10px] transition-colors ${modoSelecaoLote ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-300'}`}
            >
              {modoSelecaoLote ? 'Cancelar lote' : 'Pagar em lote'}
            </button>
            <span className="px-2 py-1 rounded-full text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-300">{PERIODOS.find(p => p.v === periodo)?.l || 'Período'}</span>
            {tipoFiltro !== 'todos' && <span className="px-2 py-1 rounded-full text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-300">{tipoFiltro === 'Receita' ? 'A Receber' : tipoFiltro === 'Despesa' ? 'A Pagar' : 'Compras'}</span>}
            {mostrarPagas && <span className="px-2 py-1 rounded-full text-[10px] bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">Pagas</span>}
          </div>
        </div>
      </div>

      <Drawer open={showFilters} onOpenChange={setShowFilters}>
        <DrawerContent className="border-0 rounded-t-[28px] bg-white dark:bg-slate-900 px-4 pb-6">
          <DrawerHeader className="px-0 pb-2 text-left">
            <DrawerTitle className="font-glacial text-gray-900 dark:text-white">Filtros</DrawerTitle>
          </DrawerHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wide">Período</label>
              <div className="flex flex-wrap gap-2">
                {PERIODOS.map(p => (
                  <button key={p.v} onClick={() => setPeriodo(p.v)} className={`px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${periodo === p.v ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-300'}`}>
                    {p.l}
                  </button>
                ))}
              </div>
            </div>

            {periodo === 'personalizado' && (
              <div className="flex gap-2">
                <input autoComplete="off" type="date" value={cs} onChange={e => setCs(e.target.value)} className="flex-1 min-w-0 bg-gray-100 dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-100 rounded-2xl px-3 py-3 outline-none border-0" />
                <input autoComplete="off" type="date" value={ce} onChange={e => setCe(e.target.value)} className="flex-1 min-w-0 bg-gray-100 dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-100 rounded-2xl px-3 py-3 outline-none border-0" />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wide">Tipo</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { v: 'todos', l: 'Todos' },
                  { v: 'Receita', l: 'A Receber' },
                  { v: 'Despesa', l: 'A Pagar' },
                  { v: 'compras', l: 'Compras' },
                ].map(({ v, l }) => (
                  <button key={v} onClick={() => setTipoFiltro(v)} className={`px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${tipoFiltro === v ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-300'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 block uppercase tracking-wide">Exibição</label>
              <button onClick={() => setMostrarPagas(p => !p)} className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${mostrarPagas ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-300'}`}>
                <CheckCircle2 className="w-3 h-3" /> Pagas
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setPeriodo('mes');
                  setTipoFiltro('todos');
                  setMostrarPagas(false);
                  setCs('');
                  setCe('');
                }}
                className="flex-1 h-11 rounded-2xl bg-gray-100 dark:bg-slate-800 text-sm text-gray-600 dark:text-gray-300"
              >
                Limpar
              </button>
              <button onClick={() => setShowFilters(false)} className="flex-1 h-11 rounded-2xl bg-slate-900 dark:bg-slate-200 text-sm text-white dark:text-slate-900">
                Aplicar
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {modoSelecaoLote && (
        <div className="min-w-0 overflow-hidden rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Pagamento em lote</p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{lancamentosSelecionados.length} item(ns) selecionado(s)</p>
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
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ) : grupos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-white py-16 shadow-sm dark:bg-gray-800">
            <Scale className="h-9 w-9 text-gray-200 dark:text-gray-700" />
            <p className="text-sm text-gray-400">Nenhuma conta em aberto</p>
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

      {fabOpen && <div className="fixed inset-0 z-[54] bg-slate-950/55 backdrop-blur-[2px]" onClick={() => setFabOpen(false)} />}
      <div className="fixed right-4 z-[55] flex flex-col items-end gap-2 p38-bottom-fab1 lg:right-6">
        {fabOpen && FAB_ITEMS.map(({ tipo, icon: Icon, label, action }) => (
          <button
            key={tipo}
            type="button"
            onClick={action}
            className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg whitespace-nowrap transition-transform active:scale-95 dark:bg-slate-200 dark:text-slate-900"
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setFabOpen(o => !o)}
          className={`flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-xl transition-all active:scale-95 ${fabOpen ? 'rotate-45 bg-slate-700' : 'bg-slate-900 dark:bg-slate-200'}`}
        >
          <Plus className={`h-6 w-6 ${fabOpen ? 'text-white' : 'text-white dark:text-slate-900'}`} />
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