import {
  buildRecebidosPorPedidoProdutoFromEmbarques,
  pedidoCompraAprovadoNaoConcluido,
} from '@/lib/sugestaoCompraEstoquePendente';

/** Status logísticos em aberto — alinhado a `pedidoCompraAprovadoNaoConcluido`. */
export const PEDIDO_COMPRA_STATUS_QUERY_ESTOQUE = [
  'Aprovado',
  'Aguardando Recepção',
  'Aguardando Embarque',
  'Enviado',
  'Despachado',
  'Em Recepção',
  'Em Trânsito',
  'Recebido Parcialmente',
  'Recebido Parcial',
  'Pendência',
];

const PEDIDOS_RECENTES_LIMIT = 800;
const EMBARQUES_LIMIT = 1200;

function dedupePedidosPorId(pedidos = []) {
  const porId = new Map();
  (pedidos || []).forEach((pedido) => {
    if (pedido?.id) porId.set(pedido.id, pedido);
  });
  return [...porId.values()];
}

/**
 * Carrega pedidos de compra relevantes para pendente de estoque na Sugestão de Compra.
 * Combina filter por status em aberto + lista recente (fallback) para não perder pedidos grandes/antigos.
 */
export async function fetchPedidosCompraParaSugestaoEstoque(base44) {
  const [porStatus, recentes, embarques] = await Promise.all([
    base44.entities.PedidoCompra.filter({
      status: PEDIDO_COMPRA_STATUS_QUERY_ESTOQUE,
    }).catch(() => []),
    base44.entities.PedidoCompra.list('-created_date', PEDIDOS_RECENTES_LIMIT).catch(() => []),
    base44.entities.Embarque.list('-created_date', EMBARQUES_LIMIT).catch(() => []),
  ]);

  const pedidosTodos = dedupePedidosPorId([...porStatus, ...recentes]);
  const pedidosAbertos = pedidosTodos.filter(pedidoCompraAprovadoNaoConcluido);
  const recebidosPorPedidoProduto = buildRecebidosPorPedidoProdutoFromEmbarques(embarques);

  return {
    pedidosTodos,
    pedidosAbertos,
    embarques,
    recebidosPorPedidoProduto,
  };
}
