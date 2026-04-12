import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, Calendar, CheckCircle2, CircleAlert, Printer, Paperclip, Wallet, CircleSlash, SlidersHorizontal, X, Layers, Anchor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import AgefinConsultaDrawer from '@/components/agefin/AgefinConsultaDrawer';
import { boundsMesCivil, dataHoje, formatarSoData } from '@/components/utils/dateUtils';
import { openPrintWindowOrShareHtml } from '@/lib/mobilePrintAndShare';
import {
  lancamentoEhContaPagar,
  lancamentoEhCmv,
  lancamentoEhFreteItinerario,
  lancamentoPago,
  lancamentoCancelado,
  lancamentoVencidoOuAtrasado,
  lancamentoEmDia,
  lancamentoCompraMercadoriaPedidoPagamentoAVista,
} from '@/lib/agefinConsultaFilters';

function formatCurrency(value) {
  return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function formatMonth(date) {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function KpiCard({ label, value, tone = 'default' }) {
  const toneMap = {
    default: 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
    danger: 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
    success: 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
    muted: 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
  };

  const labelToneMap = {
    default: 'text-gray-500 dark:text-gray-400',
    success: 'text-emerald-700/80 dark:text-emerald-300/80',
    danger: 'text-red-700/80 dark:text-red-300/80',
    muted: 'text-gray-500 dark:text-gray-400',
  };

  const iconToneMap = {
    default: 'text-gray-500 dark:text-gray-400',
    success: 'text-emerald-700/80 dark:text-emerald-300/80',
    danger: 'text-red-700/80 dark:text-red-300/80',
    muted: 'text-gray-500 dark:text-gray-400',
  };

  const Icon = {
    default: Wallet,
    success: CheckCircle2,
    danger: CircleAlert,
    muted: CircleSlash,
  }[tone] || Wallet;

  return (
    <div className={`min-w-0 rounded-[22px] shadow-sm px-4 py-3 ${toneMap[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-[10px] uppercase tracking-[0.16em] truncate ${labelToneMap[tone]}`}>{label}</p>
        <Icon className={`w-3.5 h-3.5 shrink-0 ${iconToneMap[tone]}`} />
      </div>
      <p className="mt-1 text-sm md:text-base font-semibold font-glacial truncate">{value}</p>
    </div>
  );
}

function FilterChip({ active, onClick, children, tone = 'default' }) {
  const activeStyles = {
    default: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900',
    success: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white',
    danger: 'bg-red-600 text-white dark:bg-red-500 dark:text-white',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 px-3 rounded-2xl text-xs font-medium shadow-sm transition-all whitespace-nowrap ${
        active
          ? activeStyles[tone]
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

function ContaCard({ conta, onOpen }) {
  const todayKey = dataHoje();
  const isPaid = lancamentoPago(conta);
  const isOverdue = lancamentoVencidoOuAtrasado(conta, todayKey);
  const hasBoleto = conta.forma_pagamento_tipo === 'Boleto' || conta.forma_pagamento === 'Boleto';
  const iconClass = isPaid
    ? 'w-4 h-4 text-emerald-600 shrink-0'
    : isOverdue
      ? 'w-4 h-4 text-pink-500 shrink-0'
      : hasBoleto
        ? 'w-4 h-4 text-lime-500 shrink-0'
        : 'w-4 h-4 text-gray-400 shrink-0';
  const ehCmv = lancamentoEhCmv(conta);
  const ehFrete = lancamentoEhFreteItinerario(conta);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-[28px] bg-white dark:bg-gray-900 p-1 shadow-sm transition-all hover:shadow-md"
    >
      <div className="rounded-[24px] bg-gray-50 dark:bg-gray-800/70 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {isPaid ? <CheckCircle2 className={iconClass} /> : isOverdue ? <CircleAlert className={iconClass} /> : <Wallet className={iconClass} />}
              <p className="text-[15px] font-semibold text-gray-900 dark:text-white line-clamp-2">{conta.descricao}</p>
              <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
              {ehFrete && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100">
                  <Anchor className="w-3 h-3" /> Frete
                </span>
              )}
              {ehCmv && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100">
                  <Layers className="w-3 h-3" /> CMV
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{conta.terceiro_nome || 'Sem favorecido'} · {conta.categoria || 'Sem categoria'}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-gray-900 px-2.5 py-1 shadow-sm">
                <Calendar className="w-3.5 h-3.5" /> {formatarSoData(conta.data_vencimento)}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 shadow-sm ${
                isPaid
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : isOverdue
                    ? 'bg-pink-50 dark:bg-pink-500/10 text-pink-700 dark:text-pink-300'
                    : hasBoleto
                      ? 'bg-lime-50 dark:bg-lime-500/10 text-lime-700 dark:text-lime-300'
                      : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-300'
              }`}>
                {isPaid ? 'Pago' : isOverdue ? 'Vencido' : hasBoleto ? 'Atualizado' : 'Pendente'}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0 pl-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">Valor</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(conta.valor)}</p>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function AgefinConsulta() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConta, setSelectedConta] = useState(null);
  const [pagamentoFilter, setPagamentoFilter] = useState('todos');
  const [prazoFilter, setPrazoFilter] = useState('todos');
  const [cmvFilter, setCmvFilter] = useState('todos');
  const [freteFilter, setFreteFilter] = useState('todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debounceRef = useRef(null);

  const loadContas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.LancamentoFinanceiro.list('-data_vencimento', 5000);
      setContas(
        (data || []).filter((item) => {
          if (lancamentoCancelado(item)) return false;
          if (lancamentoCompraMercadoriaPedidoPagamentoAVista(item)) return false;
          return (
            lancamentoEhContaPagar(item) ||
            (item?.tipo === 'Despesa' && item?.referencia_tipo === 'EventosLogisticos')
          );
        })
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContas();
  }, [loadContas]);

  useEffect(() => {
    const unsub = base44.entities.LancamentoFinanceiro.subscribe(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => loadContas(), 450);
    });
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (typeof unsub === 'function') unsub();
    };
  }, [loadContas]);

  const hasActiveFilters =
    pagamentoFilter !== 'todos' ||
    prazoFilter !== 'todos' ||
    cmvFilter !== 'todos' ||
    freteFilter !== 'todos' ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const monthData = useMemo(() => {
    const { start, end } = boundsMesCivil(currentMonth.getFullYear(), currentMonth.getMonth());
    return contas
      .filter((conta) => {
        if (!conta?.data_vencimento) return false;
        const vencimento = `${conta.data_vencimento}`.slice(0, 10);
        return vencimento >= start && vencimento <= end;
      })
      .sort((a, b) => new Date(`${a.data_vencimento}T12:00:00-05:00`) - new Date(`${b.data_vencimento}T12:00:00-05:00`));
  }, [contas, currentMonth]);

  const filteredData = useMemo(() => {
    const todayKey = dataHoje();
    const list = monthData.filter((conta) => {
      if (pagamentoFilter === 'pagos' && !lancamentoPago(conta)) return false;
      if (pagamentoFilter === 'nao_pagos' && (lancamentoPago(conta) || lancamentoCancelado(conta))) return false;

      if (prazoFilter === 'vencidas' && !lancamentoVencidoOuAtrasado(conta, todayKey)) return false;
      if (prazoFilter === 'em_dia' && !lancamentoEmDia(conta, todayKey)) return false;

      if (cmvFilter === 'cmv' && !lancamentoEhCmv(conta)) return false;
      if (cmvFilter === 'normal' && lancamentoEhCmv(conta)) return false;

      if (freteFilter === 'fretes' && !lancamentoEhFreteItinerario(conta)) return false;
      if (freteFilter === 'sem_fretes' && lancamentoEhFreteItinerario(conta)) return false;

      const matchesFrom = !dateFrom || conta.data_vencimento >= dateFrom;
      const matchesTo = !dateTo || conta.data_vencimento <= dateTo;
      return matchesFrom && matchesTo;
    });
    return [...list].sort((a, b) =>
      (a.descricao || '').localeCompare(b.descricao || '', 'pt-BR', { sensitivity: 'base' })
    );
  }, [monthData, pagamentoFilter, prazoFilter, cmvFilter, freteFilter, dateFrom, dateTo]);

  const kpis = useMemo(() => {
    const paid = filteredData.filter((c) => lancamentoPago(c));
    const unpaid = filteredData.filter((c) => !lancamentoPago(c) && !lancamentoCancelado(c));
    const overdue = unpaid.filter((c) => lancamentoVencidoOuAtrasado(c));
    return {
      totalValue: filteredData.reduce((sum, c) => sum + (c.valor || 0), 0),
      paidValue: paid.reduce((sum, c) => sum + (c.valor || 0), 0),
      unpaidValue: unpaid.reduce((sum, c) => sum + (c.valor || 0), 0),
      overdueValue: overdue.reduce((sum, c) => sum + (c.valor || 0), 0),
    };
  }, [filteredData]);

  const limparFiltros = () => {
    setPagamentoFilter('todos');
    setPrazoFilter('todos');
    setCmvFilter('todos');
    setFreteFilter('todos');
    setDateFrom('');
    setDateTo('');
  };

  const imprimirRelatorio = async () => {
    const linhas = filteredData.map((conta) => `<tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${conta.descricao}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${conta.terceiro_nome || '-'}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${formatarSoData(conta.data_vencimento)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${conta.status || '-'}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${formatCurrency(conta.valor)}</td>
    </tr>`).join('');
    const html = `<html><head><title>Agefin ${formatMonth(currentMonth)}</title></head><body style="font-family:Inter,sans-serif;padding:24px"><h2>Agefin - ${formatMonth(currentMonth)}</h2><p>Total do período: ${formatCurrency(kpis.totalValue)}</p><table style="width:100%;border-collapse:collapse"><thead><tr><th align="left">Conta</th><th align="left">Favorecido</th><th align="left">Vencimento</th><th align="left">Status</th><th align="right">Valor</th></tr></thead><tbody>${linhas}</tbody></table></body></html>`;
    try {
      await openPrintWindowOrShareHtml(html, `agefin-${currentMonth.getTime()}.html`, `Agefin ${formatMonth(currentMonth)}`);
    } catch {
      /* popup bloqueado no desktop */
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6 pb-24">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="rounded-[28px] bg-white dark:bg-gray-900 shadow-sm p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.18em]">Consulta financeira</p>
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white font-glacial">Agefin</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Todas as contas a pagar do mês. Filtros no ícone ao lado.</p>
            </div>
            <div className="flex items-center gap-2">
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-2xl bg-gray-100 dark:bg-gray-800">
                    <SlidersHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    {hasActiveFilters && (
                      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 ring-2 ring-white dark:ring-gray-900" aria-hidden />
                    )}
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="border-0 rounded-t-[32px] bg-white dark:bg-gray-900 px-4 pb-6">
                  <DrawerHeader className="px-0 text-left">
                    <DrawerTitle className="font-glacial text-gray-900 dark:text-white">Filtros</DrawerTitle>
                    <DrawerDescription className="text-sm text-gray-500 dark:text-gray-400">
                      Ajuste a lista do mês selecionado. Toque fora ou arraste para fechar.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="space-y-5 px-0 max-h-[65vh] overflow-y-auto">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Pagamento</p>
                      <div className="flex flex-wrap gap-2">
                        <FilterChip active={pagamentoFilter === 'todos'} onClick={() => setPagamentoFilter('todos')}>Todos</FilterChip>
                        <FilterChip active={pagamentoFilter === 'pagos'} onClick={() => setPagamentoFilter('pagos')} tone="success">Pagos</FilterChip>
                        <FilterChip active={pagamentoFilter === 'nao_pagos'} onClick={() => setPagamentoFilter('nao_pagos')}>Não pagos</FilterChip>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Prazo (vencimento)</p>
                      <div className="flex flex-wrap gap-2">
                        <FilterChip active={prazoFilter === 'todos'} onClick={() => setPrazoFilter('todos')}>Todos</FilterChip>
                        <FilterChip active={prazoFilter === 'vencidas'} onClick={() => setPrazoFilter('vencidas')} tone="danger">Vencidas</FilterChip>
                        <FilterChip active={prazoFilter === 'em_dia'} onClick={() => setPrazoFilter('em_dia')} tone="success">Em dia</FilterChip>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Tipo</p>
                      <div className="flex flex-wrap gap-2">
                        <FilterChip active={cmvFilter === 'todos'} onClick={() => setCmvFilter('todos')}>Todos</FilterChip>
                        <FilterChip active={cmvFilter === 'cmv'} onClick={() => setCmvFilter('cmv')}>CMV</FilterChip>
                        <FilterChip active={cmvFilter === 'normal'} onClick={() => setCmvFilter('normal')}>Normal</FilterChip>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Itinerário / fretes</p>
                      <div className="flex flex-wrap gap-2">
                        <FilterChip active={freteFilter === 'todos'} onClick={() => setFreteFilter('todos')}>Todos</FilterChip>
                        <FilterChip active={freteFilter === 'fretes'} onClick={() => setFreteFilter('fretes')}>Fretes</FilterChip>
                        <FilterChip active={freteFilter === 'sem_fretes'} onClick={() => setFreteFilter('sem_fretes')}>Sem fretes</FilterChip>
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">
                        Fretes: lançamentos com referência ao evento logístico (aba Fretes do Itinerário Fluvial) ou tags frete / conta_frete.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Data inicial (opcional)</p>
                        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-2xl border-0 bg-gray-100 dark:bg-gray-800 h-12" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Data final (opcional)</p>
                        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-2xl border-0 bg-gray-100 dark:bg-gray-800 h-12" />
                      </div>
                    </div>
                  </div>
                  <DrawerFooter className="px-0 pb-0 pt-5">
                    <Button variant="ghost" onClick={limparFiltros} className="w-full rounded-2xl h-12 bg-gray-100 dark:bg-gray-800">
                      Limpar filtros
                    </Button>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
              <Button onClick={imprimirRelatorio} variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-gray-100 dark:bg-gray-800">
                <Printer className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} variant="ghost" size="sm" className="rounded-full h-10 w-10 p-0">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{formatMonth(currentMonth)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Período civil do mês · {monthData.length} conta{monthData.length !== 1 ? 's' : ''} a pagar</p>
            </div>
            <Button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} variant="ghost" size="sm" className="rounded-full h-10 w-10 p-0">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
              <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-1">Filtros ativos</span>
              {pagamentoFilter !== 'todos' && <span className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-blue-800 dark:text-blue-200">Pag.: {pagamentoFilter}</span>}
              {prazoFilter !== 'todos' && <span className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-blue-800 dark:text-blue-200">Prazo: {prazoFilter}</span>}
              {cmvFilter !== 'todos' && <span className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-blue-800 dark:text-blue-200">Tipo: {cmvFilter}</span>}
              {freteFilter !== 'todos' && <span className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-blue-800 dark:text-blue-200">Frete: {freteFilter}</span>}
              {(dateFrom || dateTo) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5">
                  {dateFrom || '…'} → {dateTo || '…'}
                  <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); }} className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Limpar datas">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <KpiCard label="Total (filtro)" value={formatCurrency(kpis.totalValue)} />
          <KpiCard label="Pago" value={formatCurrency(kpis.paidValue)} tone="success" />
          <KpiCard label="Não pago" value={formatCurrency(kpis.unpaidValue)} tone="muted" />
          <KpiCard label="Vencido" value={formatCurrency(kpis.overdueValue)} tone="danger" />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16"><div className="w-8 h-8 border-4 border-gray-300 border-t-gray-800 dark:border-gray-700 dark:border-t-gray-200 rounded-full animate-spin" /></div>
        ) : filteredData.length === 0 ? (
          <div className="rounded-[28px] bg-white dark:bg-gray-900 shadow-sm p-12 text-center text-gray-500 dark:text-gray-400">Nenhuma conta a pagar encontrada para esse mês e filtros.</div>
        ) : (
          <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-3 md:max-w-4xl">
            {filteredData.map((conta) => (
              <ContaCard key={conta.id} conta={conta} onOpen={() => setSelectedConta(conta)} />
            ))}
          </div>
        )}
      </div>

      <AgefinConsultaDrawer open={Boolean(selectedConta)} onClose={() => setSelectedConta(null)} conta={selectedConta} />
    </div>
  );
}
