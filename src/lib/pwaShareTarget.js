/**
 * PWA Web Share Target → rota /AnexoCompartilhado (POST interceptado pelo service worker).
 *
 * Sub-alvos no app (escolha do utilizador após receber o ficheiro):
 * - lancamento — LançamentoFinanceiro
 * - pedido_compra | pedido — PedidoCompra
 * - frete | evento | itinerario — EventosLogisticos (viagem fluvial)
 *
 * Deep link opcional (abre já no passo de busca): ?destino=lancamento|pedido|frete
 */
export const SHARE_DESTINO_QUERY = 'destino';

export const SHARE_SUBTARGET_KEYS = {
  lancamento: 'vincular',
  pedido: 'vincular_pedido',
  pedido_compra: 'vincular_pedido',
  frete: 'vincular_evento',
  evento: 'vincular_evento',
  itinerario: 'vincular_evento',
};

export function mapDestinoQueryToEtapa(destinoRaw) {
  if (!destinoRaw || typeof destinoRaw !== 'string') return null;
  const k = destinoRaw.trim().toLowerCase();
  return SHARE_SUBTARGET_KEYS[k] || null;
}
