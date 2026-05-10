import { invokeFunction } from './_invokeHelper';

/**
 * Admin: reconcilia quantidades recebidas nos embarques com MovimentacaoEstoque (Compra/PedidoCompra)
 * e cria entradas em falta. Por defeito dryRun true.
 *
 * Corpo: { dataInicio?, dataFim?, pedidoIds?, dryRun?, varreduraCompletaPedidos?, limitePedidos? }
 * — Escolher um: lista de IDs, ou intervalo de datas (created_date), ou varreduraCompletaPedidos (últimos N pedidos).
 */
export function corrigirMovimentosRecepcaoRetroativos(body) {
  return invokeFunction('corrigirMovimentosRecepcaoRetroativos', body);
}
