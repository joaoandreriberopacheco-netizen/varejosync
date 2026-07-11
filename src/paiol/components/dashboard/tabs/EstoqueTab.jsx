import React, { useEffect, useMemo, useState } from 'react';
import { subMonths, startOfMonth, endOfMonth, format, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { pedidoLiberadoParaLogistica } from '@/lib/aprovarPedidoCompraFinanceiro';
import { enrichProdutosComIep } from '@/lib/calcularIepProdutos';
import { resolveProdutoAbcdClasse } from '@/lib/catalogAbcdEnrichment';
import { fetchDadosVendaAbcd90d } from '@/lib/fetchPedidosVenda90d';
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
  healthyDark: '#0f766e',
  high: '#f59e0b',
  highDark: '#b45309',
  low: '#ef4444',
  lowDark: '#b91c1c',
  muted: '#e5e7eb',
};

const LOCATION_COLORS = {
  fisico: '#0f766e',
  transito: '#3b82f6',
};

const PEDIDO_VENDA_STATUSES_CMV = new Set([
  'financeiro ok',
  'em separação',
  'em separacao',
  'em rota de entrega',
  'pedido concluído',
  'pedido concluido',
]);

const PEDIDO_COMPRA_APPROVED_STATUSES = new Set([
  'aprovado financeiramente',
  'aprovado',
]);

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
  const reconciliationStart = new Date('2026-04-01T00:00:00');
  const defaultStart = startOfMonth(subMonths(now, 5));
  const rangeStart = isBefore(defaultStart, reconciliationStart) ? reconciliationStart : defaultStart;

  const months = [];
  let monthDate = startOfMonth(rangeStart);
  while (!isAfter(monthDate, now)) {
    months.push({
      key: format(monthDate, 'yyyy-MM'),
      label: format(monthDate, 'MMM/yy', { locale: ptBR }).toUpperCase(),
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate),
    });
    monthDate = startOfMonth(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1));
  }
  return months;
}

function getSupplyMonthBuckets() {
  const now = new Date();
  return [2, 1, 0].map((offset) => {
    const monthDate = subMonths(now, offset);
    return {
      key: format(monthDate, 'yyyy-MM'),
      label: format(monthDate, 'MMM/yy', { locale: ptBR }).toUpperCase(),
      start: startOfMonth(monthDate),
      end: endOfMonth(monthDate),
    };
  });
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

function getSupplyColorByStatus(status) {
  if (status === 'high') return SUPPLY_RING_COLORS.high;
  if (status === 'low') return SUPPLY_RING_COLORS.low;
  return SUPPLY_RING_COLORS.healthy;
}

function getSupplyOverflowColorByStatus(status) {
  if (status === 'high') return SUPPLY_RING_COLORS.highDark;
  if (status === 'low') return SUPPLY_RING_COLORS.lowDark;
  return SUPPLY_RING_COLORS.healthyDark;
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function pedidoVendaContaNoCMV(pedido = {}) {
  const status = normalizeStatus(pedido.status);
  const tipo = normalizeStatus(pedido.tipo);
  if (status === 'cancelado') return false;
  if (tipo === 'orçamento' || tipo === 'orcamento') return false;
  if (PEDIDO_VENDA_STATUSES_CMV.has(status)) return true;
  return status !== 'orçamento' && status !== 'orcamento' && status !== 'aguardando caixa';
}

function pedidoCompraAprovadoNaoConcluido(pedido = {}) {
  const statusDisplay = String(pedido.status || '').trim();
  const ehAguardandoPagamento = [
    'Aguardando Aprovação Financeira',
    'Aguardando Liberação Financeira',
    'Aguardando Liberação',
    'Aguardando',
  ].includes(statusDisplay);
  if (ehAguardandoPagamento) return false;

  const statusAprovacao = normalizeStatus(pedido.status_aprovacao_financeira || pedido.status);
  const aprovadoViaStatus = pedidoLiberadoParaLogistica(pedido);
  const aprovado = PEDIDO_COMPRA_APPROVED_STATUSES.has(statusAprovacao);
  if (!aprovado && !aprovadoViaStatus) return false;

  const statusRecebimento = normalizeStatus(pedido.status_recebimento_geral);
  const statusPedido = normalizeStatus(pedido.status);
  const concluidoRecebimento =
    statusRecebimento.startsWith('concluído') || statusRecebimento.startsWith('concluido');
  const concluidoPedido = statusPedido === 'concluído' || statusPedido === 'concluido';

  return !concluidoRecebimento && !concluidoPedido;
}

function percentualPendentePedidoCompra(pedido = {}) {
  const percentualEmbarcado = Number(pedido.percentual_valor_embarcado);
  if (!Number.isFinite(percentualEmbarcado)) return 1;
  const pendente = 1 - Math.min(Math.max(percentualEmbarcado, 0), 100) / 100;
  return Math.max(0, pendente);
}

function calcularValorPendentePedidoCompra(pedido = {}, recebidosPorProdutoExterno = null) {
  const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
  const embarques = Array.isArray(pedido.embarques_registrados) ? pedido.embarques_registrados : [];
  const recebidosPorProduto = recebidosPorProdutoExterno || embarques.reduce((acc, embarque) => {
    const itensEmbarcados = Array.isArray(embarque.itens_embarcados)
      ? embarque.itens_embarcados
      : Array.isArray(embarque.itens)
        ? embarque.itens
        : [];
    itensEmbarcados.forEach((item) => {
      const produtoId = item.produto_id;
      if (!produtoId) return;
      acc[produtoId] = (acc[produtoId] || 0) + (Number(item.quantidade_recebida) || 0);
    });
    return acc;
  }, {});

  const valorPendentePorItens = itens.reduce((acc, item) => {
    const produtoId = item.produto_id;
    const quantidadeItem = Number(item.quantidade_base || item.quantidade || 0);
    const quantidadeRecebida = produtoId ? Number(recebidosPorProduto[produtoId] || 0) : 0;
    const quantidadePendente = Math.max(0, quantidadeItem - quantidadeRecebida);
    const totalItem = Number(item.total || 0);
    const custoViaTotal = quantidadeItem > 0 ? totalItem / quantidadeItem : 0;
    const custoUnitario = Number(item.custo_final_unitario || item.custo_unitario || custoViaTotal || 0);
    return acc + quantidadePendente * custoUnitario;
  }, 0);

  if (valorPendentePorItens > 0) return valorPendentePorItens;
  return Number(pedido.valor_total || 0) * percentualPendentePedidoCompra(pedido);
}

function movimentoContaNoNivelEstoque(movimento = {}) {
  const motivo = normalizeStatus(movimento.motivo);
  return motivo === 'compra' || motivo === 'venda' || motivo === 'consumo interno';
}

function getMovimentoDate(movimento = {}) {
  const raw = movimento.data_movimento || movimento.created_date || movimento.data;
  const parsed = parseDate(raw);
  return parsed;
}

function getMovimentoDeltaQuantidade(movimento = {}) {
  if (!movimentoContaNoNivelEstoque(movimento)) return 0;
  const quantidade = Number(movimento.quantidade || 0);
  const motivo = normalizeStatus(movimento.motivo);
  const tipo = normalizeStatus(movimento.tipo);

  if (motivo === 'compra') return Math.abs(quantidade);
  if (motivo === 'venda' || motivo === 'consumo interno') return -Math.abs(quantidade);
  if (tipo === 'entrada') return Math.abs(quantidade);
  if (tipo === 'saída' || tipo === 'saida') return -Math.abs(quantidade);
  return 0;
}

export default function EstoqueTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const monthBuckets = useMemo(() => getMonthBuckets(), []);
  const supplyMonthBuckets = useMemo(() => getSupplyMonthBuckets(), []);

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

        const nivelEstoqueStartDate = monthBuckets[0]?.start || startDate;

        const supplyStartISO = format(supplyMonthBuckets[0]?.start || startDate, 'yyyy-MM-dd');
        const supplyEndISO = format(supplyMonthBuckets[supplyMonthBuckets.length - 1]?.end || endDate, 'yyyy-MM-dd');

        const [produtos, movimentacoesEstoqueRaw, lancamentosFinanceiros, pedidosVenda, pedidosCompra, embarquesCompraRaw, dadosVendaAbcd90d] =
          await Promise.all([
            base44.entities.Produto.filter({}, '-created_date', 5000),
            base44.entities.MovimentacaoEstoque.list('-created_date', 50000),
            base44.entities.LancamentoFinanceiro.filter(
              {
                tipo: 'Despesa',
                is_custo_mercadoria: true,
                data_pagamento: { $gte: supplyStartISO, $lte: supplyEndISO },
              },
              '-data_pagamento',
              20000
            ),
            base44.entities.PedidoVenda.filter({ tipo: 'PDV' }, '-created_date', 20000),
            base44.entities.PedidoCompra.list('-created_date', 300),
            base44.entities.Embarque.list('-created_date', 600),
            fetchDadosVendaAbcd90d().catch(() => null),
          ]);

        const produtosLista = Array.isArray(produtos) ? produtos : [];
        const produtosComAbcdCatalogo = Array.isArray(dadosVendaAbcd90d?.pedidos90d)
          ? enrichProdutosComIep(produtosLista, dadosVendaAbcd90d)
          : produtosLista;
        const movimentacoesEstoqueLista = Array.isArray(movimentacoesEstoqueRaw)
          ? movimentacoesEstoqueRaw.filter((movimento) => {
            const date = getMovimentoDate(movimento);
            if (!date) return false;
            return !isBefore(date, nivelEstoqueStartDate);
          })
          : [];
        const lancamentosLista = Array.isArray(lancamentosFinanceiros) ? lancamentosFinanceiros : [];
        const pedidosVendaLista = Array.isArray(pedidosVenda) ? pedidosVenda : [];
        const pedidosCompraLista = Array.isArray(pedidosCompra) ? pedidosCompra : [];
        const embarquesCompraLista = Array.isArray(embarquesCompraRaw) ? embarquesCompraRaw : [];

        const recebidosPorPedidoProduto = embarquesCompraLista.reduce((acc, embarque) => {
          const pedidoId = embarque?.pedido_compra_id;
          if (!pedidoId) return acc;
          const pedidoKey = String(pedidoId);
          if (!acc[pedidoKey]) acc[pedidoKey] = {};
          const itensEmbarcados = Array.isArray(embarque.itens_embarcados)
            ? embarque.itens_embarcados
            : Array.isArray(embarque.itens)
              ? embarque.itens
              : [];
          itensEmbarcados.forEach((item) => {
            const produtoId = item?.produto_id;
            if (!produtoId) return;
            const produtoKey = String(produtoId);
            acc[pedidoKey][produtoKey] =
              (acc[pedidoKey][produtoKey] || 0) + (Number(item.quantidade_recebida) || 0);
          });
          return acc;
        }, {});

        const qualityAccumulator = {
          A: 0,
          B: 0,
          C: 0,
          D: 0,
        };

        let estoqueFisico = 0;
        produtosComAbcdCatalogo.forEach((produto) => {
          const custoUnitario = Number(produto.preco_custo_calculado || produto.valor_compra || 0);
          const estoqueAtual = Number(produto.estoque_atual || 0);
          const estoqueGerencial = Math.max(0, estoqueAtual);
          const valorEstoque = estoqueGerencial * custoUnitario;
          estoqueFisico += valorEstoque;

          const curva = resolveProdutoAbcdClasse(produto);
          if (QUALITY_ORDER.includes(curva)) {
            qualityAccumulator[curva] += valorEstoque;
          }
        });

        const skuBase = new Map(
          produtosLista.map((produto) => [
            produto.id,
            {
              estoqueAtual: Number(produto.estoque_atual || 0),
              custoAtual: Number(produto.preco_custo_calculado || produto.valor_compra || 0),
            },
          ])
        );

        const movimentosCompraVenda = movimentacoesEstoqueLista
          .map((movimento) => ({
            skuId: movimento.produto_id,
            date: getMovimentoDate(movimento),
            deltaQuantidade: getMovimentoDeltaQuantidade(movimento),
          }))
          .filter((movimento) => movimento.skuId && movimento.date && movimento.deltaQuantidade !== 0);

        const nivelEstoqueSeries = monthBuckets.map((bucket) => {
          const monthEnd = bucket.end;
          const deltaAfterMonthBySku = new Map();

          movimentosCompraVenda.forEach((movimento) => {
            if (!isAfter(movimento.date, monthEnd)) return;
            const current = deltaAfterMonthBySku.get(movimento.skuId) || 0;
            deltaAfterMonthBySku.set(movimento.skuId, current + movimento.deltaQuantidade);
          });

          let monthValue = 0;
          skuBase.forEach((skuData, skuId) => {
            const deltaAfterMonth = deltaAfterMonthBySku.get(skuId) || 0;
            const estoqueNoFimDoMes = skuData.estoqueAtual - deltaAfterMonth;
            const estoqueGerencial = Math.max(0, estoqueNoFimDoMes);
            monthValue += estoqueGerencial * skuData.custoAtual;
          });

          return {
            periodo: bucket.label,
            valor: monthValue,
          };
        });

        const custoProdutoMap = new Map(
          produtosLista.map((produto) => [produto.id, Number(produto.preco_custo_calculado || produto.valor_compra || 0)])
        );

        const supplyByMonth = supplyMonthBuckets.map((bucket) => {
          const cmvEfetivo = lancamentosLista.reduce((sum, lancamento) => {
            if (normalizeStatus(lancamento.status) === 'cancelado') return sum;
            const dataPagamento = parseDate(lancamento.data_pagamento);
            if (!dataPagamento || isBefore(dataPagamento, bucket.start) || isAfter(dataPagamento, bucket.end)) {
              return sum;
            }
            return sum + Number(lancamento.valor || 0);
          }, 0);

          const cmvVendido = pedidosVendaLista.reduce((sumPedidos, pedido) => {
            if (!pedidoVendaContaNoCMV(pedido)) return sumPedidos;
            const saleDate = parseDate(pedido.created_date);
            if (!saleDate || isBefore(saleDate, bucket.start) || isAfter(saleDate, bucket.end)) {
              return sumPedidos;
            }
            const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
            const totalPedido = itens.reduce((sumItens, item) => {
              const quantidade = Number(item.quantidade_base || item.quantidade || 0);
              const custoFallback = Number(custoProdutoMap.get(item.produto_id) || 0);
              const custoUnitario = Number(item.custo_unitario_momento || custoFallback || 0);
              return sumItens + quantidade * custoUnitario;
            }, 0);
            return sumPedidos + totalPedido;
          }, 0);

          const ratioPercent = cmvVendido > 0 ? (cmvEfetivo / cmvVendido) * 100 : 0;
          return {
            key: bucket.key,
            label: bucket.label,
            cmvEfetivo,
            cmvVendido,
            ratioPercent,
            diff: cmvEfetivo - cmvVendido,
            status: getSupplyStatus(ratioPercent),
          };
        });
        const transitoFinanceiroAprovado = pedidosCompraLista.reduce((sum, pedido) => {
          if (!pedidoCompraAprovadoNaoConcluido(pedido)) return sum;
          const recebidosPorProduto = recebidosPorPedidoProduto[String(pedido.id)] || null;
          return sum + calcularValorPendentePedidoCompra(pedido, recebidosPorProduto);
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
            supplyByMonth,
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
  }, [monthBuckets, supplyMonthBuckets]);

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
              Nível de Estoque (Base Hoje)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Estoque atual por SKU, retroagindo compra/venda/consumo interno.
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

        <Card className="border-0 shadow-sm bg-card xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
              <Gauge className="w-4 h-4 text-[#14b8a6]" />
              Razão de Abastecimento (3 meses)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              CMV efetivo pago / CMV vendido no mês atual e dois meses anteriores.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {metrics.supplyByMonth.map((monthSupply) => {
                const supplyColor = getSupplyColorByStatus(monthSupply.status);
                const overflowColor = getSupplyOverflowColorByStatus(monthSupply.status);
                const ratioPercent = Math.max(monthSupply.ratioPercent, 0);
                const primaryFill = Math.min(ratioPercent, 100);
                const overflowFill = Math.min(Math.max(ratioPercent - 100, 0), 100);
                const primaryRingData = [
                  { name: 'Razão', value: primaryFill, color: supplyColor },
                  {
                    name: 'Restante',
                    value: Math.max(100 - primaryFill, 0),
                    color: SUPPLY_RING_COLORS.muted,
                  },
                ];
                const hasOverflow = overflowFill > 0;
                const overflowRingData = [
                  { name: 'Excedente', value: overflowFill, color: overflowColor },
                  { name: 'ExcedenteRestante', value: Math.max(100 - overflowFill, 0), color: 'transparent' },
                ];

                return (
                  <div key={monthSupply.key} className="rounded-xl border border-border/60 p-3">
                    <p className="text-xs font-semibold text-muted-foreground tracking-wide mb-2">{monthSupply.label}</p>
                    <div className="h-[170px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={primaryRingData}
                            innerRadius={44}
                            outerRadius={64}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                            strokeWidth={0}
                          >
                            {primaryRingData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          {hasOverflow ? (
                            <Pie
                              data={overflowRingData}
                              innerRadius={36}
                              outerRadius={43}
                              dataKey="value"
                              startAngle={90}
                              endAngle={-270}
                              strokeWidth={0}
                            >
                              {overflowRingData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                          ) : null}
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-foreground">{monthSupply.ratioPercent.toFixed(1)}%</span>
                        <span className="text-[10px] text-muted-foreground">BASE 100%</span>
                      </div>
                    </div>
                    <div className="space-y-1.5 mt-1">
                      <div className="rounded-md bg-muted/40 p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">CMV Vendido</p>
                        <p className="text-sm font-semibold text-foreground tabular-nums">{BRL.format(monthSupply.cmvVendido)}</p>
                      </div>
                      <div className="rounded-md bg-muted/40 p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">CMV Efetivo Pago</p>
                        <p className="text-sm font-semibold text-foreground tabular-nums">{BRL.format(monthSupply.cmvEfetivo)}</p>
                      </div>
                      <div className="rounded-md bg-muted/40 p-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Diferença</p>
                        <p className="text-sm font-semibold text-foreground tabular-nums">{BRL.format(monthSupply.diff)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
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
