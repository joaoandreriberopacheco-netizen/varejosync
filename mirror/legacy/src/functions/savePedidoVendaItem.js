import { invokeFunction } from './_invokeHelper';

/**
 * Cliente para o servico canonico de mutacao de PedidoVendaItem.
 *
 * Acoes suportadas:
 *   - { action: 'create', input: { pedido_venda_id, produto_id, produto_unidade_id, quantidade_comercial, preco_unitario_fator1, desconto_unitario_fator1, tabela_preco_id, tabela_preco_multiplicador, ordem, observacoes } }
 *   - { action: 'update', input: { id, ...patch } }
 *   - { action: 'delete', id }
 *   - { action: 'replaceAll', pedido_venda_id, items: [...] }
 */
export function savePedidoVendaItem(body) {
  return invokeFunction('savePedidoVendaItem', body);
}
