/**
 * Mapa produto_id → fornecedor_id do pedido de compra mais recente que inclui o SKU.
 */
export function buildUltimoFornecedorPorProduto(pedidosCompra = []) {
  const map = {};
  const sorted = [...pedidosCompra].sort((a, b) => {
    const da = new Date(a?.created_date ?? a?.created_at ?? 0).getTime();
    const db = new Date(b?.created_date ?? b?.created_at ?? 0).getTime();
    return db - da;
  });

  for (const pedido of sorted) {
    const fornecedorId = pedido?.fornecedor_id;
    if (!fornecedorId) continue;

    for (const item of pedido.itens || []) {
      const produtoId = item?.produto_id;
      if (!produtoId || map[produtoId]) continue;
      map[produtoId] = fornecedorId;
    }
  }

  return map;
}
