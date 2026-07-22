/**
 * Cálculos do relatório de margem — reutilizáveis (ex.: Plano completo em Budgets).
 * Mesma lógica de RelatorioMargem: custo atual do cadastro × qtd vendida no período.
 */

import { parseISO, parse, isValid } from 'date-fns';
import { resolveCustoTotalUnitBaseProduto } from '@/lib/productUnits';
import { pedidoElegivelIep } from '@/lib/calcularIepProdutos';

export function competenciaParaIntervalo(competencia) {
  const [y, m] = String(competencia).slice(0, 7).split('-').map(Number);
  if (!y || !m) return null;
  return {
    from: new Date(y, m - 1, 1),
    to: new Date(y, m, 0, 23, 59, 59, 999),
  };
}

/** Mesma prioridade de datas do dashboard Paiol (VendasTab). */
export function parseSaleDateForMargem(sale = {}) {
  const candidates = [
    sale.data_venda,
    sale.data_emissao,
    sale.data_fechamento,
    sale.created_date,
    sale.updated_date,
  ];

  for (const value of candidates) {
    if (!value) continue;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

    if (typeof value === 'string') {
      const isoParsed = parseISO(value);
      if (isValid(isoParsed)) return isoParsed;

      const ptBrParsed = parse(value, 'dd/MM/yyyy', new Date());
      if (isValid(ptBrParsed)) return ptBrParsed;
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

export function pedidoElegivelMargem(pedido) {
  return pedidoElegivelIep(pedido);
}

/** Total da linha com fallbacks (espelho do dashboard de vendas). */
export function resolverTotalLinhaVenda(item = {}) {
  const direto = Number(
    item.total ?? item.valor_total ?? item.valor_total_item ?? item.subtotal ?? 0,
  );
  if (direto > 0) return direto;

  const quantidadeBase =
    Number(
      item.quantidade_base ??
        (Number(item.quantidade || 0) * Number(item.fator_conversao || 1)) ??
        item.quantidade ??
        0,
    ) || 0;
  const precoUnitario = Number(
    item.preco_unitario_praticado ??
      item.preco_final_unitario_fator1 ??
      item.preco_unitario_fator1 ??
      0,
  );

  if (quantidadeBase > 0 && precoUnitario > 0) {
    return quantidadeBase * precoUnitario;
  }

  return 0;
}

function vendaNoIntervalo(sale, from, to) {
  const saleDate = parseSaleDateForMargem(sale);
  if (!saleDate) return false;
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
    if (!pedidoElegivelMargem(sale)) continue;
    if (!vendaNoIntervalo(sale, from, to)) continue;

    const itens = Array.isArray(sale.itens) ? sale.itens : [];
    const descontoPorItem = (Number(sale.valor_desconto) || 0) / (itens.length || 1);

    for (const item of itens) {
      const prodId = item.produto_id;
      const product = prodMap[prodId];
      if (!product) continue;

      const custoCalculado = resolveCustoTotalUnitBaseProduto(product);
      const lineTotal = resolverTotalLinhaVenda(item);

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
        Number(
          item.quantidade_base ??
            (item.quantidade * (item.fator_conversao || 1)) ??
            item.quantidade ??
            0,
        ) || 0;
      entry.quantidade_base_vendida += quantidadeBase;
      entry.total_recebido += lineTotal;
      entry.total_desconto_venda += descontoPorItem;
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
