import { invokeFunction } from './_invokeHelper';

/**
 * Cliente para o servico canonico de mutacao de EmbarqueItem.
 *
 * Acoes suportadas:
 *   - { action: 'create', input: { embarque_id, produto_id, produto_unidade_id, pedido_compra_item_id?, quantidade_pedida_comercial, quantidade_embarcada_comercial, quantidade_recebida_comercial?, divergencia_tipo?, ordem?, observacoes? } }
 *   - { action: 'update', input: { id, ...patch } }
 *   - { action: 'delete', id }
 *   - { action: 'replaceAll', embarque_id, items: [...] }
 */
export function saveEmbarqueItem(body) {
  return invokeFunction('saveEmbarqueItem', body);
}
