import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, Calendar, CheckCircle2, CircleAlert, Printer, Paperclip, Wallet, CircleSlash, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import AgefinConsultaDrawer from '@/components/agefin/AgefinConsultaDrawer';
import { boundsMesCivil, dataHoje, formatarSoData } from '@/components/utils/dateUtils';

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
  const isPaid = conta.status === 'Pago';
  const isOverdue = conta.status === 'Vencido' || (!isPaid && conta.data_vencimento < todayKey);
  const hasBoleto = conta.forma_pagamento_tipo === 'Boleto' || conta.forma_pagamento === 'Boleto';
  const iconClass = isPaid
    ? 'w-4 h-4 text-emerald-600 shrink-0'
    : isOverdue
      ? 'w-4 h-4 text-pink-500 shrink-0'
      : hasBoleto
        ? 'w-4 h-4 text-lime-500 shrink-0'
        : 'w-4 h-4 text-gray-400 shrink-0';

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-[28px] bg-white dark:bg-gray-900 p-1 shadow-sm transition-all hover:shadow-md"
    >
      <div className="rounded-[24px] bg-gray-50 dark:bg-gray-800/70 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isPaid ? <CheckCircle2 className={iconClass} /> : isOverdue ? <CircleAlert className={iconClass} /> : <Wallet className={iconClass} />}
              <p className="text-[15px] font-semibold text-gray-900 dark:text-white line-clamp-2">{conta.descricao}</p>
              <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />
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
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await base44.entities.LancamentoFinanceiro.list('-data_vencimento', 1000);
      setContas((data || []).filter((item) => item && Array.isArray(item.tags) && item.tags.includes('conta_pagar')));
      setLoading(false);
    };
    loadData();
  }, []);

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
    return monthData.filter((conta) => {
      const isPaid = conta.status === 'Pago';
      const isCancelled = conta.status === 'Cancelado';
      const isOpen = !isPaid && !isCancelled;
      const isOverdue = (conta.status === 'Vencido') || (isOpen && conta.data_vencimento < todayKey);
      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'pagos' && isPaid) ||
        (statusFilter === 'abertos' && isOpen) ||
        (statusFilter === 'vencidos' && isOverdue);

      const matchesFrom = !dateFrom || conta.data_vencimento >= dateFrom;
      const matchesTo = !dateTo || conta.data_vencimento <= dateTo;
      return matchesStatus && matchesFrom && matchesTo;
    });
  }, [monthData, statusFilter, dateFrom, dateTo]);

  const kpis = useMemo(() => {
    const paid = filteredData.filter((c) => c.status === 'Pago');
    const unpaid = filteredData.filter((c) => c.status !== 'Pago' && c.status !== 'Cancelado');
    const overdue = unpaid.filter((c) => c.status === 'Vencido' || c.data_vencimento < dataHoje());
    return {
      totalValue: filteredData.reduce((sum, c) => sum + (c.valor || 0), 0),
      paidValue: paid.reduce((sum, c) => sum + (c.valor || 0), 0),
      unpaidValue: unpaid.reduce((sum, c) => sum + (c.valor || 0), 0),
      overdueValue: overdue.reduce((sum, c) => sum + (c.valor || 0), 0),
    };
  }, [filteredData]);

  const imprimirRelatorio = () => {
    const linhas = filteredData.map((conta) => `<tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${conta.descricao}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${conta.terceiro_nome || '-'}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${formatarSoData(conta.data_vencimento)}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${conta.status || '-'}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${formatCurrency(conta.valor)}</td>
    </tr>`).join('');
    const html = `<html><head><title>Agefin ${formatMonth(currentMonth)}</title></head><body style="font-family:Inter,sans-serif;padding:24px"><h2>Agefin - ${formatMonth(currentMonth)}</h2><p>Total do período: ${formatCurrency(kpis.totalValue)}</p><table style="width:100%;border-collapse:collapse"><thead><tr><th align="left">Conta</th><th align="left">Favorecido</th><th align="left">Vencimento</th><th align="left">Status</th><th align="right">Valor</th></tr></thead><tbody>${linhas}</tbody></table></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6 pb-24">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="rounded-[28px] bg-white dark:bg-gray-900 shadow-sm p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.18em]">Consulta financeira</p>
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white font-glacial">Agefin</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Visão de contas a pagar por período, sem edição.</p>
            </div>
            <div className="flex items-center gap-2">
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-gray-100 dark:bg-gray-800">
                    <SlidersHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="border-0 rounded-t-[32px] bg-white dark:bg-gray-900 px-4 pb-6">
                  <DrawerHeader className="px-0 text-left">
                    <DrawerTitle className="font-glacial text-gray-900 dark:text-white">Filtrar contas</DrawerTitle>
                    <DrawerDescription className="text-sm text-gray-500 dark:text-gray-400">Filtre por status e período.</DrawerDescription>
                  </DrawerHeader>
                  <div className="space-y-4 px-0">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Pagamento</p>
                        <div className="flex flex-wrap gap-2">
                          <FilterChip active={statusFilter === 'todos'} onClick={() => setStatusFilter('todos')}>Todos</FilterChip>
                          <FilterChip active={statusFilter === 'pagos'} onClick={() => setStatusFilter('pagos')} tone="success">Pagos</FilterChip>
                          <FilterChip active={statusFilter === 'abertos'} onClick={() => setStatusFilter('abertos')}>Em aberto</FilterChip>
                          <FilterChip active={statusFilter === 'vencidos'} onClick={() => setStatusFilter('vencidos')} tone="danger">Vencidos</FilterChip>
                        </div>
                      </div>



                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Data inicial</p>
                          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-2xl border-0 bg-gray-100 dark:bg-gray-800 h-12" />
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Data final</p>
                          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-2xl border-0 bg-gray-100 dark:bg-gray-800 h-12" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <DrawerFooter className="px-0 pb-0 pt-5">
                    <Button variant="ghost" onClick={() => { setStatusFilter('todos'); setDateFrom(''); setDateTo(''); }} className="w-full rounded-2xl h-12 bg-gray-100 dark:bg-gray-800">Limpar filtros</Button>
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Todas as contas a pagar do mês</p>
            </div>
            <Button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} variant="ghost" size="sm" className="rounded-full h-10 w-10 p-0">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <FilterChip active={statusFilter === 'todos'} onClick={() => setStatusFilter('todos')}>Todos</FilterChip>
              <FilterChip active={statusFilter === 'pagos'} onClick={() => setStatusFilter('pagos')} tone="success">Pagos</FilterChip>
              <FilterChip active={statusFilter === 'abertos'} onClick={() => setStatusFilter('abertos')}>Em aberto</FilterChip>
              <FilterChip active={statusFilter === 'vencidos'} onClick={() => setStatusFilter('vencidos')} tone="danger">Vencidos</FilterChip>
            </div>

            {(dateFrom || dateTo) && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {dateFrom && (
                  <div className="inline-flex items-center gap-2 h-8 px-3 rounded-2xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 text-xs shadow-sm">
                    Início {new Date(`${dateFrom}T12:00:00`).toLocaleDateString('pt-BR')}
                  </div>
                )}
                {dateTo && (
                  <div className="inline-flex items-center gap-2 h-8 px-3 rounded-2xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 text-xs shadow-sm">
                    Fim {new Date(`${dateTo}T12:00:00`).toLocaleDateString('pt-BR')}
                  </div>
                )}
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-2xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 shadow-sm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <KpiCard label="Total do mês" value={formatCurrency(kpis.totalValue)} />
          <KpiCard label="Pago" value={formatCurrency(kpis.paidValue)} tone="success" />
          <KpiCard label="Não pago" value={formatCurrency(kpis.unpaidValue)} tone="muted" />
          <KpiCard label="Vencido" value={formatCurrency(kpis.overdueValue)} tone="danger" />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16"><div className="w-8 h-8 border-4 border-gray-300 border-t-gray-800 dark:border-gray-700 dark:border-t-gray-200 rounded-full animate-spin" /></div>
        ) : filteredData.length === 0 ? (
          <div className="rounded-[28px] bg-white dark:bg-gray-900 shadow-sm p-12 text-center text-gray-500 dark:text-gray-400">Nenhuma conta a pagar encontrada para esse filtro.</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
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