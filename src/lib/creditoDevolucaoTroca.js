/** Chave estável para mapear linha do pedido → quantidade devolvida. */
export function pedidoItemKey(item) {
  return `${item.produto_id}_${item.produto_nome}`;
}

export function calcularSubtotalPedidoLegacy(pedido) {
  const itens = pedido?.itens || [];
  if (Number(pedido?.subtotal) > 0) return Number(pedido.subtotal);
  return itens.reduce(
    (sum, item) => sum + (Number(item.quantidade) || 0) * (Number(item.preco_unitario_praticado) || 0),
    0
  );
}

/**
 * Preço unitário que o cliente efetivamente pagou (considera desconto por item ou rateio do pedido).
 * Ex.: lista R$ 100, desconto R$ 10 no pedido → crédito R$ 90/un.
 */
export function calcularPrecoUnitarioCredito(item, pedido) {
  const unitList = Number(item.preco_unitario_praticado) || 0;
  const descontoItem = Number(item.desconto_unitario) || 0;

  if (descontoItem > 0) {
    return Math.max(0, unitList - descontoItem);
  }

  const subtotal = calcularSubtotalPedidoLegacy(pedido);
  const valorTotal = Number(pedido?.valor_total);

  if (subtotal > 0 && Number.isFinite(valorTotal) && valorTotal >= 0 && valorTotal < subtotal) {
    return unitList * (valorTotal / subtotal);
  }

  return unitList;
}

export function calcularLinhaCreditoDevolucao(item, pedido, qty) {
  const q = Number(qty) || 0;
  const unitCredito = calcularPrecoUnitarioCredito(item, pedido);
  return {
    qty: q,
    unitCredito,
    unitLista: Number(item.preco_unitario_praticado) || 0,
    total: q * unitCredito,
  };
}

export function calcularCreditoDevolucao(pedido, qtdsPorKey) {
  return (pedido?.itens || []).reduce((sum, item) => {
    const key = pedidoItemKey(item);
    const qtd = qtdsPorKey[key] || 0;
    if (qtd <= 0) return sum;
    return sum + calcularLinhaCreditoDevolucao(item, pedido, qtd).total;
  }, 0);
}

export function formatValorBRL(value) {
  return `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}
