import React, { useEffect, useMemo, useState } from 'react';
import { subMonths, startOfMonth, endOfMonth, format, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Gauge, Layers, Package, Truck } from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
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

const PERCENT = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 1,
});

const QUALITY_ORDER = ['A', 'B', 'C', 'D'];
const QUALITY_LABELS = {
  A: 'Curva A',
  B: 'Curva B',
  C: 'Curva C',
  D: 'Curva D',
};

const QUALITY_COLORS = {
  A: '#0f766e',
  B: '#14b8a6',
  C: '#f59e0b',
  D: '#ef4444',
};

const SUPPLY_RING_COLORS = {
  healthy: '#14b8a6',
  high: '#f59e0b',
  low: '#ef4444',
  muted: '#e5e7eb',
};

const LOCATION_COLORS = {
  fisico: '#0f766e',
  transito: '#3b82f6',
};

const qualityToneClasses = {
  A: 'bg-teal-700',
  B: 'bg-teal-500',
  C: 'bg-amber-500',
  D: 'bg-red-500',
};

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function getMonthBuckets() {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i -= 1) {
    const monthDate = subMonths(now, i);
    months.push({
      key: format(monthDate, 'yyyy-MM'),
      label: format(monthDate, 'MMM/yy', { locale: ptBR }).toUpperCase(),
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate),
    });
  }
  return months;
}

function formatShort(value) {
  if (!Number.isFinite(value) || value === 0) return 'R$ 0';
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}K`;
  return BRL.format(value);
}

function getSupplyStatus(percentage) {
  if (!Number.isFinite(percentage) || percentage === 0) return 'healthy';
  if (percentage > 105) return 'high';
  if (percentage < 95) return 'low';
  return 'healthy';
}

export default function EstoqueTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const monthBuckets = useMemo(() => getMonthBuckets(), []);

  useEffect(() => {
    let mounted = true;

    const loadEstoqueDashboard = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const startDate = monthBuckets[0]?.start;
        const endDate = monthBuckets[monthBuckets.length - 1]?.end;
        const startISO = format(startDate, 'yyyy-MM-dd');
        const endISO = format(endDate, 'yyyy-MM-dd');

        const [produtos, estoqueDiario, lancamentosFinanceiros, pedidosVenda, pedidosCompra] = await Promise.all([
          base44.entities.Produto.filter({}, '-created_date', 5000),
          base44.entities.EstoqueDiario.filter({ data: { $gte: startISO, $lte: endISO } }, '-data', 12000),
          base44.entities.LancamentoFinanceiro.filter(
            {
              tipo: 'Despesa',
              is_custo_mercadoria: true,
              data_pagamento: { $gte: startISO, $lte: endISO },
            },
            '-data_pagamento',
            8000
          ),
          base44.entities.PedidoVenda.filter(
            {
              created_date: { $gte: startISO, $lte: endISO },
            },
            '-created_date',
            8000
          ),
          base44.entities.PedidoCompra.filter({}, '-created_date', 5000),
        ]);

        const produtosLista = Array.isArray(produtos) ? produtos : [];
        const estoqueDiarioLista = Array.isArray(estoqueDiario) ? estoqueDiario : [];
        const lancamentosLista = Array.isArray(lancamentosFinanceiros) ? lancamentosFinanceiros : [];
        const pedidosVendaLista = Array.isArray(pedidosVenda) ? pedidosVenda : [];
        const pedidosCompraLista = Array.isArray(pedidosCompra) ? pedidosCompra : [];

        const custoPorProduto = new Map(
          produtosLista.map((produto) => [
            produto.id,
            Number(produto.preco_custo_calculado || produto.valor_compra || 0),
          ])
        );

        const qualityAccumulator = {
          A: 0,
          B: 0,
          C: 0,
          D: 0,
        };

        let estoqueFisico = 0;
        produtosLista.forEach((produto) => {
          const custoUnitario = Number(produto.preco_custo_calculado || produto.valor_compra || 0);
          const estoqueAtual = Number(produto.estoque_atual || 0);
          const valorEstoque = estoqueAtual * custoUnitario;
          estoqueFisico += valorEstoque;

          const curva = String(produto.abcd || '').trim().toUpperCase();
          if (QUALITY_ORDER.includes(curva)) {
            qualityAccumulator[curva] += valorEstoque;
          }
        });

        const latestSnapshotByMonthAndProduct = new Map();
        estoqueDiarioLista.forEach((snapshot) => {
          const monthKey = String(snapshot.data || '').slice(0, 7);
          const produtoId = snapshot.produto_id;
          if (!monthKey || !produtoId) return;
          const mapKey = `${monthKey}::${produtoId}`;
          const snapshotDate = parseDate(snapshot.data);
          const previous = latestSnapshotByMonthAndProduct.get(mapKey);
          const previousDate = previous ? parseDate(previous.data) : null;

          if (!previous || (snapshotDate && previousDate && isAfter(snapshotDate, previousDate))) {
            latestSnapshotByMonthAndProduct.set(mapKey, snapshot);
          }
        });

        const nivelEstoqueSeries = monthBuckets.map((bucket) => {
          let monthValue = 0;
          latestSnapshotByMonthAndProduct.forEach((snapshot, key) => {
            if (!key.startsWith(`${bucket.key}::`)) return;
            const custoUnitario = Number(custoPorProduto.get(snapshot.produto_id) || 0);
            const saldo = Number(snapshot.saldo_final_dia || 0);
            monthValue += saldo * custoUnitario;
          });
          return {
            periodo: bucket.label,
            valor: monthValue,
          };
        });

        const cmvEfetivo = lancamentosLista.reduce((sum, lancamento) => {
          const valor = Number(lancamento.valor || 0);
          return sum + valor;
        }, 0);

        const cmvVendido = pedidosVendaLista.reduce((sumPedidos, pedido) => {
          if (String(pedido.status || '').trim().toLowerCase() === 'cancelado') return sumPedidos;
          const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
          const totalPedido = itens.reduce((sumItens, item) => {
            const quantidade = Number(item.quantidade_base || item.quantidade || 0);
            const custoUnitario = Number(item.custo_unitario_momento || 0);
            return sumItens + quantidade * custoUnitario;
          }, 0);
          return sumPedidos + totalPedido;
        }, 0);

        const supplyRatioPercent = cmvVendido > 0 ? (cmvEfetivo / cmvVendido) * 100 : 0;
        const supplyStatus = getSupplyStatus(supplyRatioPercent);
        const transitoFinanceiroAprovado = pedidosCompraLista.reduce((sum, pedido) => {
          const statusAprovacao = String(pedido.status_aprovacao_financeira || pedido.status || '').toLowerCase();
          const isAprovado = statusAprovacao.includes('aprovado');
          const statusRecebimento = String(pedido.status_recebimento_geral || '').toLowerCase();
          const isConcluido =
            statusRecebimento.startsWith('concluído') ||
            statusRecebimento.startsWith('concluido') ||
            String(pedido.status || '').toLowerCase() === 'concluído' ||
            String(pedido.status || '').toLowerCase() === 'concluido';

          if (!isAprovado || isConcluido) return sum;
          return sum + Number(pedido.valor_total || 0);
        }, 0);

        const totalLocalizacao = estoqueFisico + transitoFinanceiroAprovado;
        const qualityTotal = QUALITY_ORDER.reduce((sum, key) => sum + qualityAccumulator[key], 0);
        const qualityDistribution = QUALITY_ORDER.map((key) => {
          const valor = qualityAccumulator[key];
          const share = qualityTotal > 0 ? valor / qualityTotal : 0;
          return {
            key,
            label: QUALITY_LABELS[key],
            valor,
            share,
            percentText: PERCENT.format(share),
            color: QUALITY_COLORS[key],
          };
        });

        if (mounted) {
          setMetrics({
            nivelEstoqueSeries,
            cmvEfetivo,
            cmvVendido,
            supplyRatioPercent,
            supplyStatus,
            qualityDistribution,
            estoqueFisico,
            transitoFinanceiroAprovado,
            totalLocalizacao,
          });
        }
      } catch (loadError) {
        console.error('Erro ao carregar indicadores de estoque:', loadError);
        if (mounted) setError(loadError);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadEstoqueDashboard();
    return () => {
      mounted = false;
    };
  }, [monthBuckets]);

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
              Não foi possível carregar os indicadores de estoque.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Verifique conexão com dados e tente novamente.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const supplyColor =
    metrics.supplyStatus === 'high'
      ? SUPPLY_RING_COLORS.high
      : metrics.supplyStatus === 'low'
        ? SUPPLY_RING_COLORS.low
        : SUPPLY_RING_COLORS.healthy;

  const supplyRingData = [
    { name: 'Razão', value: Math.min(Math.max(metrics.supplyRatioPercent, 0), 150), color: supplyColor },
    {
      name: 'Restante',
      value: Math.max(150 - Math.min(Math.max(metrics.supplyRatioPercent, 0), 150), 0),
      color: SUPPLY_RING_COLORS.muted,
    },
  ];

  const locationData = [
    { label: 'Físico', valor: metrics.estoqueFisico, color: LOCATION_COLORS.fisico },
    { label: 'Em trânsito', valor: metrics.transitoFinanceiroAprovado, color: LOCATION_COLORS.transito },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Package className="w-4 h-4 text-[#0f766e]" />
              Nível de Estoque (Últimos 6 Meses)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Valor do estoque a custo por mês, usando snapshots diários.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.nivelEstoqueSeries}>
                  <XAxis dataKey="periodo" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(value) => formatShort(value)}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => BRL.format(Number(value || 0))}
                    cursor={{ fill: 'rgba(15, 118, 110, 0.08)' }}
                  />
                  <Bar dataKey="valor" fill="#0f766e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Gauge className="w-4 h-4 text-[#14b8a6]" />
              Razão de Abastecimento
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              CMV efetivo (despesas pagas) / custo da mercadoria vendida. 100% = equilíbrio.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-3 items-center">
              <div className="h-[220px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={supplyRingData}
                      innerRadius={62}
                      outerRadius={88}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      strokeWidth={0}
                    >
                      {supplyRingData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-foreground">{metrics.supplyRatioPercent.toFixed(1)}%</span>
                  <span className="text-[11px] text-muted-foreground">BASE 100%</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">CMV Vendido (100%)</p>
                  <p className="text-base font-semibold text-foreground tabular-nums">{BRL.format(metrics.cmvVendido)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">CMV Efetivo Pago</p>
                  <p className="text-base font-semibold text-foreground tabular-nums">{BRL.format(metrics.cmvEfetivo)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Diferença</p>
                  <p className="text-base font-semibold text-foreground tabular-nums">
                    {BRL.format(metrics.cmvEfetivo - metrics.cmvVendido)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Layers className="w-4 h-4 text-[#14b8a6]" />
              Qualidade do Estoque (Curva A/B/C/D)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Distribuição do capital em estoque por curva, com base no valor de custo.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[100px_1fr] gap-4 items-stretch min-h-[280px]">
              <div className="rounded-xl border border-border/60 overflow-hidden flex flex-col">
                {metrics.qualityDistribution.map((bucket) => (
                  <div
                    key={bucket.key}
                    className="flex items-center justify-center text-[11px] font-semibold text-white"
                    style={{
                      backgroundColor: bucket.color,
                      flexGrow: Math.max(bucket.share, 0.08),
                    }}
                  >
                    {bucket.key}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {metrics.qualityDistribution.map((bucket) => (
                  <div key={bucket.key} className="rounded-lg bg-muted/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${qualityToneClasses[bucket.key]}`} />
                        <span className="text-sm text-foreground">{bucket.label}</span>
                      </div>
                      <span className="text-xs font-semibold text-foreground">{bucket.percentText}</span>
                    </div>
                    <p className="text-sm mt-1 font-semibold text-foreground tabular-nums">{BRL.format(bucket.valor)}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Truck className="w-4 h-4 text-[#3b82f6]" />
              Localização do Estoque
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Estoque físico vs compras com financeiro aprovado e ainda não concluídas.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-[56px] w-full rounded-xl overflow-hidden bg-muted/30 flex">
              {locationData.map((part) => (
                <div
                  key={part.label}
                  style={{
                    width:
                      metrics.totalLocalizacao > 0
                        ? `${(part.valor / metrics.totalLocalizacao) * 100}%`
                        : '0%',
                    backgroundColor: part.color,
                  }}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Físico</p>
                <p className="text-base font-semibold text-foreground tabular-nums">{BRL.format(metrics.estoqueFisico)}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Em trânsito</p>
                <p className="text-base font-semibold text-foreground tabular-nums">
                  {BRL.format(metrics.transitoFinanceiroAprovado)}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total posicionado</p>
              <p className="text-lg font-semibold text-foreground tabular-nums">{BRL.format(metrics.totalLocalizacao)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
