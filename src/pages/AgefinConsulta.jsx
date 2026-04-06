import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, Calendar, CheckCircle2, CircleAlert, Clock3, Printer, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AgefinConsultaDrawer from '@/components/agefin/AgefinConsultaDrawer';

function monthBounds(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function formatCurrency(value) {
  return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function formatMonth(date) {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function KpiCard({ label, value, tone = 'default' }) {
  const toneMap = {
    default: 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
    danger: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200',
    success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-200',
    muted: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
  };

  return (
    <div className={`min-w-0 rounded-[22px] shadow-sm px-4 py-3 ${toneMap[tone]}`}>
      <p className="text-[10px] uppercase tracking-[0.16em] opacity-70 truncate">{label}</p>
      <p className="mt-1 text-sm md:text-base font-semibold font-glacial truncate">{value}</p>
    </div>
  );
}

function ContaCard({ conta, onOpen }) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const isPaid = conta.status === 'Pago';
  const isOverdue = !isPaid && conta.data_vencimento < todayKey;

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-[28px] bg-white dark:bg-gray-900 p-1 shadow-sm transition-all hover:shadow-md"
    >
      <div className="rounded-[24px] bg-gray-50 dark:bg-gray-800/70 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              {isPaid ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : isOverdue ? <CircleAlert className="w-4 h-4 text-red-500 shrink-0" /> : <Clock3 className="w-4 h-4 text-gray-400 shrink-0" />}
              <p className="text-[15px] font-semibold text-gray-900 dark:text-white line-clamp-2">{conta.descricao}</p>
              {conta.boleto_url && <Paperclip className="w-4 h-4 text-gray-400 shrink-0" />}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{conta.terceiro_nome || 'Sem favorecido'} · {conta.categoria_nome || 'Sem categoria'}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-gray-900 px-2.5 py-1 shadow-sm">
                <Calendar className="w-3.5 h-3.5" /> {new Date(`${conta.data_vencimento}T12:00:00`).toLocaleDateString('pt-BR')}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-gray-900 px-2.5 py-1 shadow-sm">
                {conta.status || 'Pendente'}
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await base44.entities.ContaPrevista.list('-data_vencimento', 500);
      setContas((data || []).filter((item) => item && item.natureza));
      setLoading(false);
    };
    loadData();
  }, []);

  const monthData = useMemo(() => {
    const { start, end } = monthBounds(currentMonth);
    return contas
      .filter((conta) => conta.data_vencimento >= start && conta.data_vencimento <= end)
      .filter((conta) => conta.categoria_nome !== 'Receitas' && conta.tipo !== 'Receita')
      .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
  }, [contas, currentMonth]);

  const kpis = useMemo(() => {
    const paid = monthData.filter((c) => c.status === 'Pago');
    const unpaid = monthData.filter((c) => c.status !== 'Pago' && c.status !== 'Cancelado');
    const overdue = unpaid.filter((c) => c.data_vencimento < new Date().toISOString().slice(0, 10));
    return {
      totalValue: monthData.reduce((sum, c) => sum + (c.valor || 0), 0),
      paidValue: paid.reduce((sum, c) => sum + (c.valor || 0), 0),
      unpaidValue: unpaid.reduce((sum, c) => sum + (c.valor || 0), 0),
      overdueValue: overdue.reduce((sum, c) => sum + (c.valor || 0), 0),
    };
  }, [monthData]);

  const imprimirRelatorio = () => {
    const linhas = monthData.map((conta) => `<tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${conta.descricao}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${conta.terceiro_nome || '-'}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb">${new Date(`${conta.data_vencimento}T12:00:00`).toLocaleDateString('pt-BR')}</td>
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
            <Button onClick={imprimirRelatorio} variant="ghost" size="icon" className="h-10 w-10 rounded-2xl bg-gray-100 dark:bg-gray-800">
              <Printer className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </Button>
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
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <KpiCard label="Total do mês" value={formatCurrency(kpis.totalValue)} />
          <KpiCard label="Pago" value={formatCurrency(kpis.paidValue)} tone="success" />
          <KpiCard label="Não pago" value={formatCurrency(kpis.unpaidValue)} tone="muted" />
          <KpiCard label="Vencido" value={formatCurrency(kpis.overdueValue)} tone="danger" />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16"><div className="w-8 h-8 border-4 border-gray-300 border-t-gray-800 dark:border-gray-700 dark:border-t-gray-200 rounded-full animate-spin" /></div>
        ) : monthData.length === 0 ? (
          <div className="rounded-[28px] bg-white dark:bg-gray-900 shadow-sm p-12 text-center text-gray-500 dark:text-gray-400">Nenhuma conta a pagar encontrada neste período.</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {monthData.map((conta) => (
              <ContaCard key={conta.id} conta={conta} onOpen={() => setSelectedConta(conta)} />
            ))}
          </div>
        )}
      </div>

      <AgefinConsultaDrawer open={Boolean(selectedConta)} onClose={() => setSelectedConta(null)} conta={selectedConta} />
    </div>
  );
}