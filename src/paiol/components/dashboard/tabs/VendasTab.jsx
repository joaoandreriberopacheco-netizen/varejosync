import React, { useEffect, useMemo, useState } from 'react';
import {
  subMonths,
  startOfMonth,
  endOfMonth,
  format,
  isBefore,
  isAfter,
  getDate,
  parseISO,
  getDaysInMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CalendarDays, CircleGauge, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const CARD_SURFACE = 'bg-gradient-to-br from-[#2b3342] via-[#2a3140] to-[#242c39]';
const INNER_SURFACE = 'bg-[#313a4a]/65 border border-slate-400/10';
const RING_COLORS = {
  primary: '#abc85a',
  primaryDark: '#89a246',
  secondary: '#6f82a1',
  muted: '#465267',
};

const SALES_BAR_COLORS = ['#c3dd74', '#b6d05f', '#a9c24d', '#9cb53f', '#90a835', '#7f9531'];
const MONTH_LINES = ['#abc85a', '#6f82a1', '#f59e0b', '#f97316'];

const NORMALIZED_EXCLUDED_STATUSES = new Set(['cancelado']);
const NORMALIZED_EXCLUDED_TYPES = new Set(['orçamento', 'orcamento']);

function parseDate(value) {
  if (!value) return null;
  const parsed = typeof value === 'string' ? parseISO(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function getMonthBuckets(monthCount) {
  const now = new Date();
  return Array.from({ length: monthCount }, (_, idx) => {
    const monthDate = subMonths(now, monthCount - idx - 1);
    return {
      key: format(monthDate, 'yyyy-MM'),
      shortLabel: format(monthDate, 'MMM/yy', { locale: ptBR }).toUpperCase(),
      monthLabel: format(monthDate, 'MMMM/yy', { locale: ptBR }),
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate),
      daysInMonth: getDaysInMonth(monthDate),
    };
  });
}

function formatShort(value) {
  if (!Number.isFinite(value) || value === 0) return 'R$ 0';
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}K`;
  return BRL.format(value);
}

function extractSaleGrossAmount(sale = {}) {
  const itemTotal = Array.isArray(sale.itens)
    ? sale.itens.reduce((sum, item) => sum + Number(item?.total || 0), 0)
    : 0;
  if (itemTotal > 0) return itemTotal;

  const valorTotal = Number(sale.valor_total || 0);
  const valorDesconto = Number(sale.valor_desconto || 0);
  return valorTotal + valorDesconto;
}

function extractSaleCostAmount(sale = {}, productCostMap = new Map()) {
  const items = Array.isArray(sale.itens) ? sale.itens : [];
  return items.reduce((sum, item) => {
    const quantidadeBase = Number(
      item.quantidade_base ?? (Number(item.quantidade || 0) * Number(item.fator_conversao || 1))
    ) || Number(item.quantidade || 0) || 0;
    const fallbackCost = Number(productCostMap.get(item.produto_id) || 0);
    const unitCost = Number(item.custo_unitario_momento || fallbackCost || 0);
    return sum + quantidadeBase * unitCost;
  }, 0);
}

export default function VendasTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const monthBuckets6 = useMemo(() => getMonthBuckets(6), []);
  const monthBuckets4 = useMemo(() => getMonthBuckets(4), []);

  useEffect(() => {
    let mounted = true;

    const loadVendas = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const startDate = monthBuckets6[0]?.start || startOfMonth(subMonths(new Date(), 5));
        const endDate = monthBuckets6[monthBuckets6.length - 1]?.end || endOfMonth(new Date());
        const startISO = format(startDate, 'yyyy-MM-dd');
        const endISO = format(endDate, 'yyyy-MM-dd');

        const [pedidosVendaRaw, produtosRaw] = await Promise.all([
          base44.entities.PedidoVenda.filter({ created_date: { $gte: startISO, $lte: endISO } }, '-created_date', 30000),
          base44.entities.Produto.filter({}, '-created_date', 10000),
        ]);

        const pedidosVendaLista = Array.isArray(pedidosVendaRaw) ? pedidosVendaRaw : [];
        const produtosLista = Array.isArray(produtosRaw) ? produtosRaw : [];

        const productCostMap = new Map(
          produtosLista.map((produto) => [
            produto.id,
            Number(produto.preco_custo_calculado || produto.valor_compra || 0),
          ])
        );

        const validSales = pedidosVendaLista.filter((sale) => {
          const status = normalizeText(sale.status);
          const type = normalizeText(sale.tipo);
          if (NORMALIZED_EXCLUDED_STATUSES.has(status)) return false;
          if (NORMALIZED_EXCLUDED_TYPES.has(type)) return false;
          const createdDate = parseDate(sale.created_date);
          if (!createdDate) return false;
          return !isBefore(createdDate, startDate) && !isAfter(createdDate, endDate);
        });

        const salesByMonthDay = {};
        const monthlyTotals = {};
        monthBuckets6.forEach((bucket) => {
          salesByMonthDay[bucket.key] = {};
          monthlyTotals[bucket.key] = {
            salesGross: 0,
            discounts: 0,
            salesNet: 0,
            cost: 0,
            profit: 0,
          };
        });

        validSales.forEach((sale) => {
          const createdDate = parseDate(sale.created_date);
          if (!createdDate) return;
          const monthKey = format(createdDate, 'yyyy-MM');
          if (!monthlyTotals[monthKey]) return;

          const day = getDate(createdDate);
          const grossAmount = extractSaleGrossAmount(sale);
          const discountAmount = Number(sale.valor_desconto || 0);
          const netAmount = grossAmount - discountAmount;
          const costAmount = extractSaleCostAmount(sale, productCostMap);
          const profitAmount = netAmount - costAmount;

          salesByMonthDay[monthKey][day] = (salesByMonthDay[monthKey][day] || 0) + netAmount;
          monthlyTotals[monthKey].salesGross += grossAmount;
          monthlyTotals[monthKey].discounts += discountAmount;
          monthlyTotals[monthKey].salesNet += netAmount;
          monthlyTotals[monthKey].cost += costAmount;
          monthlyTotals[monthKey].profit += profitAmount;
        });

        const dailyComparisonData = Array.from({ length: 31 }, (_, idx) => {
          const day = idx + 1;
          const row = { dia: `D${day}` };
          monthBuckets4.forEach((bucket) => {
            row[bucket.key] = day <= bucket.daysInMonth ? Number(salesByMonthDay[bucket.key]?.[day] || 0) : null;
          });
          return row;
        });

        const currentMonthKey = monthBuckets6[monthBuckets6.length - 1]?.key;
        const currentMonthDays = monthBuckets6[monthBuckets6.length - 1]?.daysInMonth || 31;
        let runningSales = 0;
        const currentAccumulatedData = Array.from({ length: currentMonthDays }, (_, idx) => {
          const day = idx + 1;
          runningSales += Number(salesByMonthDay[currentMonthKey]?.[day] || 0);
          return {
            dia: `D${day}`,
            valor: runningSales,
          };
        });

        const monthlySalesData = monthBuckets6.map((bucket) => ({
          periodo: bucket.shortLabel,
          valor: Number(monthlyTotals[bucket.key]?.salesNet || 0),
        }));

        const previousMonthKey = monthBuckets6[monthBuckets6.length - 2]?.key;
        const currentProfit = Number(monthlyTotals[currentMonthKey]?.profit || 0);
        const previousProfit = Number(monthlyTotals[previousMonthKey]?.profit || 0);
        const ratioPercent = previousProfit > 0 ? (currentProfit / previousProfit) * 100 : currentProfit > 0 ? 100 : 0;
        const ringFill = Math.min(Math.max(ratioPercent, 0), 100);
        const ringOverflow = Math.min(Math.max(ratioPercent - 100, 0), 100);
        const lucroKpi = {
          currentMonthLabel: monthBuckets6[monthBuckets6.length - 1]?.monthLabel || 'Mês atual',
          previousMonthLabel: monthBuckets6[monthBuckets6.length - 2]?.monthLabel || 'Mês anterior',
          currentProfit,
          previousProfit,
          currentSalesNet: Number(monthlyTotals[currentMonthKey]?.salesNet || 0),
          currentDiscounts: Number(monthlyTotals[currentMonthKey]?.discounts || 0),
          currentCost: Number(monthlyTotals[currentMonthKey]?.cost || 0),
          ratioPercent,
          ringFill,
          ringOverflow,
          ringData: [
            { name: 'Lucro atual x anterior', value: ringFill, color: RING_COLORS.primary },
            { name: 'Faixa restante', value: Math.max(100 - ringFill, 0), color: RING_COLORS.muted },
          ],
          ringOverflowData: [
            { name: 'Excedente', value: ringOverflow, color: RING_COLORS.primaryDark },
            { name: 'Excedente restante', value: Math.max(100 - ringOverflow, 0), color: 'transparent' },
          ],
        };

        if (mounted) {
          setMetrics({
            monthBuckets4,
            dailyComparisonData,
            currentAccumulatedData,
            monthlySalesData,
            lucroKpi,
          });
        }
      } catch (loadError) {
        console.error('Erro ao carregar dashboard de vendas:', loadError);
        if (mounted) setError(loadError);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadVendas();
    return () => {
      mounted = false;
    };
  }, [monthBuckets4, monthBuckets6]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((card) => (
          <Card key={card} className="border-0 shadow-sm bg-card">
            <CardHeader>
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <Card className="border border-red-200 dark:border-red-900/40 bg-card shadow-sm">
        <CardContent className="p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Não foi possível carregar os indicadores de vendas.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Verifique conexão com dados e tente novamente.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-3">
        <Card className={`border border-slate-500/25 shadow-[0_10px_24px_rgba(0,0,0,0.25)] ${CARD_SURFACE}`}>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-100 uppercase tracking-wide">
              <CalendarDays className="w-4 h-4 text-lime-400" />
              Venda diária (mês atual + 3 anteriores)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className={`h-[230px] rounded-xl px-2 py-2 ${INNER_SURFACE}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.dailyComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#d7deea', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(value) => formatShort(value)} tick={{ fontSize: 11, fill: '#d7deea', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value) => BRL.format(Number(value || 0))}
                    contentStyle={{
                      backgroundColor: '#1e2532',
                      border: '1px solid rgba(148,163,184,0.28)',
                      borderRadius: 12,
                      color: '#edf2f7',
                      boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
                    }}
                  />
                  {metrics.monthBuckets4.map((bucket, idx) => (
                    <Line
                      key={bucket.key}
                      type="monotone"
                      dataKey={bucket.key}
                      name={bucket.shortLabel}
                      stroke={MONTH_LINES[idx % MONTH_LINES.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {metrics.monthBuckets4.map((bucket, idx) => (
                <div
                  key={bucket.key}
                  className="flex items-center justify-between rounded-md px-2 py-1 bg-[#1f2734]/55 border border-slate-500/15"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-[2px] w-4 rounded-full" style={{ backgroundColor: MONTH_LINES[idx % MONTH_LINES.length] }} />
                    <span className="text-[10px] text-muted-foreground">{bucket.shortLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={`border border-slate-500/25 shadow-[0_10px_24px_rgba(0,0,0,0.25)] ${CARD_SURFACE}`}>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-100 uppercase tracking-wide">
              <TrendingUp className="w-4 h-4 text-lime-400" />
              Venda acumulada do mês atual
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className={`h-[230px] rounded-xl px-2 py-2 ${INNER_SURFACE}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.currentAccumulatedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#d7deea', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(value) => formatShort(value)} tick={{ fontSize: 11, fill: '#d7deea', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value) => BRL.format(Number(value || 0))}
                    contentStyle={{
                      backgroundColor: '#1e2532',
                      border: '1px solid rgba(148,163,184,0.28)',
                      borderRadius: 12,
                      color: '#edf2f7',
                      boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
                    }}
                  />
                  <Line type="monotone" dataKey="valor" stroke="#abc85a" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-300/80 mt-2">
              Último acumulado: <span className="font-semibold text-slate-100">{formatShort(metrics.currentAccumulatedData.at(-1)?.valor || 0)}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-3">
        <Card className={`border border-slate-500/25 shadow-[0_10px_24px_rgba(0,0,0,0.25)] ${CARD_SURFACE}`}>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-100 uppercase tracking-wide">
              <CircleGauge className="w-4 h-4 text-lime-400" />
              Lucro bruto mensal (atual x anterior)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="grid grid-cols-[140px,1fr] gap-3 rounded-xl p-2.5 bg-[#313a4a]/65 border border-slate-400/10">
              <div className="h-[130px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.lucroKpi.ringData}
                      innerRadius={32}
                      outerRadius={50}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      strokeWidth={0}
                      cornerRadius={2}
                    >
                      {metrics.lucroKpi.ringData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    {metrics.lucroKpi.ringOverflow > 0 ? (
                      <Pie
                        data={metrics.lucroKpi.ringOverflowData}
                        innerRadius={24}
                        outerRadius={28}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        strokeWidth={0}
                        cornerRadius={2}
                      >
                        {metrics.lucroKpi.ringOverflowData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                    ) : null}
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Atual/Ant</span>
                  <span className="text-base font-bold text-foreground">{metrics.lucroKpi.ratioPercent.toFixed(1)}%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  Fórmula: Venda - descontos - custo calculado
                </p>
                <div className="rounded-md px-2 py-1 bg-[#1f2734]/55 border border-slate-500/15">
                  <p className="text-[10px] text-muted-foreground">{metrics.lucroKpi.currentMonthLabel}</p>
                  <p className="text-sm font-semibold text-slate-100">{formatShort(metrics.lucroKpi.currentProfit)}</p>
                </div>
                <div className="rounded-md px-2 py-1 bg-[#1f2734]/55 border border-slate-500/15">
                  <p className="text-[10px] text-muted-foreground">{metrics.lucroKpi.previousMonthLabel}</p>
                  <p className="text-sm font-semibold text-slate-100">{formatShort(metrics.lucroKpi.previousProfit)}</p>
                </div>
                <div className="text-[10px] text-muted-foreground grid grid-cols-3 gap-1">
                  <span>Venda: {formatShort(metrics.lucroKpi.currentSalesNet)}</span>
                  <span>Desc: {formatShort(metrics.lucroKpi.currentDiscounts)}</span>
                  <span>Custo: {formatShort(metrics.lucroKpi.currentCost)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border border-slate-500/25 shadow-[0_10px_24px_rgba(0,0,0,0.25)] ${CARD_SURFACE}`}>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-100 uppercase tracking-wide">
              <TrendingUp className="w-4 h-4 text-lime-400" />
              Vendas mensais (últimos 6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className={`h-[230px] rounded-xl px-2 py-2 ${INNER_SURFACE}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.monthlySalesData} barCategoryGap="24%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" vertical={false} />
                  <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#d7deea', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(value) => formatShort(value)} tick={{ fontSize: 11, fill: '#d7deea', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value) => BRL.format(Number(value || 0))}
                    cursor={{ fill: 'rgba(132, 204, 22, 0.14)' }}
                    contentStyle={{
                      backgroundColor: '#1e2532',
                      border: '1px solid rgba(148,163,184,0.28)',
                      borderRadius: 12,
                      color: '#edf2f7',
                      boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
                    }}
                  />
                  <Bar dataKey="valor" radius={[8, 8, 0, 0]} maxBarSize={42}>
                    {metrics.monthlySalesData.map((entry, idx) => (
                      <Cell
                        key={`${entry.periodo}-${idx}`}
                        fill={idx === metrics.monthlySalesData.length - 1 ? '#abc85a' : SALES_BAR_COLORS[idx % SALES_BAR_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-500/20 border-dashed shadow-[0_10px_24px_rgba(0,0,0,0.2)] bg-[#252d3a]/55">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-slate-300 uppercase tracking-wide">Em breve</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="h-[180px] rounded-xl border border-slate-500/20 border-dashed bg-[#1f2734]/45 p-3">
              <div className="h-2 w-24 rounded bg-slate-500/25 mb-3" />
              <div className="grid grid-cols-5 gap-1 items-end h-16 mb-3">
                {[30, 44, 26, 52, 36].map((h, idx) => (
                  <div key={`placeholder-top-${idx}`} className="rounded-sm bg-slate-400/20" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="space-y-2">
                <div className="h-1.5 rounded bg-slate-500/20 w-full" />
                <div className="h-1.5 rounded bg-slate-500/20 w-4/5" />
                <div className="h-1.5 rounded bg-slate-500/20 w-3/5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-3">
        {[1, 2, 3].map((slot) => (
          <Card
            key={`empty-slot-${slot}`}
            className="border border-slate-500/20 border-dashed shadow-[0_10px_24px_rgba(0,0,0,0.2)] bg-[#252d3a]/55"
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-slate-300 uppercase tracking-wide">Em breve</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="h-[90px] rounded-xl border border-slate-500/20 border-dashed bg-[#1f2734]/45 p-2.5">
                <div className="h-1.5 w-16 rounded bg-slate-500/25 mb-2" />
                <div className="grid grid-cols-4 gap-1 items-end h-8 mb-2">
                  {[40, 68, 52, 74].map((h, idx) => (
                    <div key={`placeholder-bottom-${slot}-${idx}`} className="rounded-sm bg-slate-400/20" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="h-1.5 rounded bg-slate-500/20 w-4/5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
