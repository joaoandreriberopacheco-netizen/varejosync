/**
 * Helpers neutros para quantidade em linhas de venda (sem lógica IEP/ABCD).
 */

export function lineQuantityBase(item) {
  const qtyBase = item?.quantidade_base;
  if (qtyBase != null && Number.isFinite(Number(qtyBase))) {
    return Number(qtyBase) || 0;
  }
  const qty = Number(item?.quantidade) || 0;
  const fator = Number(item?.fator_conversao) || 1;
  return qty * fator;
}

export function collectItensVendaProduto(produto, pedidos90d) {
  const pid = String(produto?.id ?? '');
  if (!pid) return [];
  return (pedidos90d || [])
    .flatMap((p) => p.itens || [])
    .filter((it) => String(it?.produto_id ?? it?.produtoId ?? '') === pid);
}
