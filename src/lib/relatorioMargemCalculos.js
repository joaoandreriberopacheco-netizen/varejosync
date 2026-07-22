/**
 * Cálculos do relatório de margem — reutilizáveis (ex.: Plano completo em Budgets).
 * Alinhado à Consulta de Vendas (VendasGestao): mesmos pedidos, data e totais de linha.
 */

import { toLocalDateKey } from '@/components/utils/dateUtils';
import { STATUS_PEDIDO_CONTA_NO_TURNO_CAIXA } from '@/lib/pdvCaixaTurnoVendas';
import { resolveCustoTotalUnitBaseProduto } from '@/lib/productUnits';

export function competenciaParaIntervalo(competencia) {
  const [y, m] = String(competencia).slice(0, 7).split('-').map(Number);
  if (!y || !m) return null;
  return {
    from: new Date(y, m - 1, 1),
    to: new Date(y, m, 0, 23, 59, 59, 999),
  };
}

/** Mesmo recorte da aba Consulta em VendasGestao. */
export function pedidoElegivelMargem(pedido) {
  if (!pedido) return false;
  if (String(pedido.status) === 'Cancelado') return false;
  return STATUS_PEDIDO_CONTA_NO_TURNO_CAIXA.includes(pedido.status);
}

/** Mesma data da Consulta de Vendas: created_date em UTC-5 (Rio Branco). */
export function vendaNoIntervaloConsulta(sale, from, to) {
  const key = toLocalDateKey(sale?.created_date);
  if (!key) return false;
  if (from) {
    const fromKey = toLocalDateKey(from);
    if (fromKey && key < fromKey) return false;
  }
  if (to) {
    const toKey = toLocalDateKey(to);
    if (toKey && key > toKey) return false;
  }
  return true;
}

/** Total da linha com fallbacks (espelho da ConsultaVendasCaixa). */
export function resolverTotalLinhaVenda(item = {}) {
  const qtdComercial = Number(item.quantidade) || 0;
  const direto = Number(
    item.total ?? item.valor_total ?? item.valor_total_item ?? item.subtotal ?? 0,
  );
  if (direto > 0) return direto;

  const preco = Number(item.preco_unitario_praticado ?? item.preco_unitario_fator1 ?? 0);
  if (qtdComercial > 0 && preco > 0) return qtdComercial * preco;

  const quantidadeBase =
    Number(
      item.quantidade_base ??
        (qtdComercial * Number(item.fator_conversao || 1)) ??
        qtdComercial ??
        0,
    ) || 0;
  const precoBase = Number(
    item.preco_final_unitario_fator1 ?? item.preco_unitario_praticado ?? item.preco_unitario_fator1 ?? 0,
  );
  if (quantidadeBase > 0 && precoBase > 0) return quantidadeBase * precoBase;

  return 0;
}

export function resolveMargemProdutoKey(item = {}) {
  if (item.produto_id) return String(item.produto_id);
  const nome = String(item.produto_nome || 'sem-nome').trim().toLowerCase();
  return `nome:${nome || 'sem-nome'}`;
}

export function resolveCustoUnitarioMargem(item = {}, product = null) {
  if (product) return resolveCustoTotalUnitBaseProduto(product);
  return Number(item.custo_unitario_momento ?? item.custo_unitario ?? item.custo_calculado ?? 0) || 0;
}

function vendaNoIntervalo(sale, from, to) {
  return vendaNoIntervaloConsulta(sale, from, to);
}

/**
 * Agrega vendas por produto no intervalo — espelho do RelatorioMargem.
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
      const prodKey = resolveMargemProdutoKey(item);
      const product = item.produto_id ? prodMap[item.produto_id] : null;
      const custoCalculado = resolveCustoUnitarioMargem(item, product);
      const lineTotal = resolverTotalLinhaVenda(item);

      if (!reportMap[prodKey]) {
        reportMap[prodKey] = {
          produto_id: item.produto_id || null,
          quantidade_base_vendida: 0,
          total_recebido: 0,
          total_desconto_venda: 0,
          custo_unitario_cadastro: custoCalculado,
        };
      }

      const entry = reportMap[prodKey];
      const quantidadeBase =
        Number(
          item.quantidade_base ??
            (Number(item.quantidade || 0) * Number(item.fator_conversao || 1)) ??
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
