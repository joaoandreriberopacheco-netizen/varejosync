import { invokeFunction } from './_invokeHelper';

/**
 * Cliente para o servico canonico de mutacao de PedidoCompraItem.
 *
 * Acoes suportadas:
 *   - { action: 'create', input: { pedido_compra_id, produto_id, produto_unidade_id, quantidade_comercial, custo_unitario_fator1, frete_unitario_fator1, outros_unitario_fator1, desconto_unitario_fator1, ordem, observacoes } }
 *   - { action: 'update', input: { id, ...patch } }
 *   - { action: 'delete', id }
 *   - { action: 'replaceAll', pedido_compra_id, items: [...] }
 *
 * O servico:
 *   1. Resolve a unidade pelo `produto_unidade_id` (chave canonica)
 *   2. Deriva quantidade_base, custo_total, total
 *   3. Persiste em PedidoCompraItem
 *   4. Recompoe `PedidoCompra.itens[]` espelho e `valor_total`
 */
export function savePedidoCompraItem(body) {
  return invokeFunction('savePedidoCompraItem', body);
}
