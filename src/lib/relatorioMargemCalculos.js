/**
 * Cálculos do relatório de margem — reutilizáveis (ex.: Plano completo em Budgets).
 * Mesma lógica de RelatorioMargem: custo atual do cadastro × qtd vendida no período.
 */

import { resolveCustoTotalUnitBaseProduto } from '@/lib/productUnits';

export function competenciaParaIntervalo(competencia) {
  const [y, m] = String(competencia).slice(0, 7).split('-').map(Number);
  if (!y || !m) return null;
  return {
    from: new Date(y, m - 1, 1),
    to: new Date(y, m, 0, 23, 59, 59, 999),
  };
}

function vendaNoIntervalo(sale, from, to) {
  const saleDate = new Date(sale?.created_date);
  if (Number.isNaN(saleDate.getTime())) return false;
  if (from && saleDate < from) return false;
  if (to && saleDate > new Date(to.getTime() + 86400000)) return false;
  return true;
}

/**
 * Agrega vendas PDV por produto no intervalo — espelho do RelatorioMargem.
 */
export function calcularLinhasMargemVendas(sales = [], products = [], intervalo = null) {
  const prodMap = (products || []).reduce((acc, p) => {
    if (p?.id) acc[p.id] = p;
    return acc;
  }, {});

  const reportMap = {};
  const { from, to } = intervalo || {};

  for (const sale of sales || []) {
    if (!vendaNoIntervalo(sale, from, to)) continue;

    for (const item of sale.itens || []) {
      const prodId = item.produto_id;
      const product = prodMap[prodId];
      if (!product) continue;

      const custoCalculado = resolveCustoTotalUnitBaseProduto(product);

      if (!reportMap[prodId]) {
        reportMap[prodId] = {
          produto_id: prodId,
          quantidade_base_vendida: 0,
          total_recebido: 0,
          total_desconto_venda: 0,
          custo_unitario_cadastro: custoCalculado,
        };
      }

      const entry = reportMap[prodId];
      const quantidadeBase =
        Number(item.quantidade_base ?? (item.quantidade * (item.fator_conversao || 1)) ?? item.quantidade ?? 0) ||
        0;
      entry.quantidade_base_vendida += quantidadeBase;
      entry.total_recebido += Number(item.total) || 0;
      entry.total_desconto_venda += (Number(sale.valor_desconto) || 0) / (sale.itens?.length || 1);
    }
  }

  return Object.values(reportMap).map((item) => {
    const custo_total = item.custo_unitario_cadastro * item.quantidade_base_vendida;
    const receita_liquida = item.total_recebido - item.total_desconto_venda;
    const lucro_total = receita_liquida - custo_total;
    return {
      ...item,
      custo_total,
      receita_liquida,
      lucro_total,
    };
  });
}

export function calcularTotaisMargem(linhas = []) {
  const receita_liquida = linhas.reduce((s, r) => s + (Number(r.receita_liquida) || 0), 0);
  const custo_total = linhas.reduce((s, r) => s + (Number(r.custo_total) || 0), 0);
  const lucro_bruto = linhas.reduce((s, r) => s + (Number(r.lucro_total) || 0), 0);
  return {
    receita_liquida,
    custo_total,
    lucro_bruto,
    quantidade_produtos: linhas.length,
  };
}

/** Lucro bruto do mês (competência YYYY-MM) — mesma base do relatório de margem. */
export function calcularLucroBrutoCompetencia(sales = [], products = [], competencia) {
  const intervalo = competenciaParaIntervalo(competencia);
  if (!intervalo) {
    return { receita_liquida: 0, custo_total: 0, lucro_bruto: 0, quantidade_produtos: 0 };
  }
  const linhas = calcularLinhasMargemVendas(sales, products, intervalo);
  return calcularTotaisMargem(linhas);
}
