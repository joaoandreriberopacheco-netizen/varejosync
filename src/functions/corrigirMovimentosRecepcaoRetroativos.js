import { invokeFunction } from './_invokeHelper';

/**
 * Admin: reconcilia recepções com MovimentacaoEstoque (Compra / PedidoCompra).
 * Modo simples (UI): { somenteConcluidosRecepcaoSemStock: true, limitePedidos?, dryRun? }
 * Outros modos: pedidoIds | varreduraCompletaPedidos | dataInicio+dataFim
 */
export function corrigirMovimentosRecepcaoRetroativos(body) {
  return invokeFunction('corrigirMovimentosRecepcaoRetroativos', body);
}
