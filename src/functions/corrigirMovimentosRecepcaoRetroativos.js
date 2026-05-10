import { invokeFunction } from './_invokeHelper';

/**
 * Admin: reconcilia quantidades recebidas nos embarques com MovimentacaoEstoque (Compra/PedidoCompra)
 * e cria entradas em falta. Por defeito dryRun true.
 *
 * Corpo: { dataInicio?: 'YYYY-MM-DD', dataFim?: 'YYYY-MM-DD', pedidoIds?: string[], dryRun?: boolean }
 */
export function corrigirMovimentosRecepcaoRetroativos(body) {
  return invokeFunction('corrigirMovimentosRecepcaoRetroativos', body);
}
