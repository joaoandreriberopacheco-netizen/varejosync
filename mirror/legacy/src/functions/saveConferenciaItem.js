import { invokeFunction } from './_invokeHelper';

/**
 * Cliente para o servico canonico de mutacao de ConferenciaItem.
 *
 * Acoes suportadas:
 *   - { action: 'create', input: { conferencia_id, produto_id, produto_unidade_id?, quantidade_contada_comercial, quantidade_sistema_base?, ordem?, observacoes? } }
 *   - { action: 'update', input: { id, ...patch } }
 *   - { action: 'delete', id }
 *   - { action: 'replaceAll', conferencia_id, items: [...] }
 */
export function saveConferenciaItem(body) {
  return invokeFunction('saveConferenciaItem', body);
}
