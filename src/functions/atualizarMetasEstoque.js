import { invokeFunction } from './_invokeHelper';

/**
 * Job servidor: calcula estoque mínimo e ideal a partir de vendas 60d (v4).
 * @param {{
 *   somente_metas_vazias?: boolean,
 *   modo?: 'manual' | 'agendado',
 *   fase?: 'preparar' | 'gravar' | 'limpar',
 *   run_id?: string,
 *   offset?: number,
 *   batch_size?: number,
 *   job_cache?: object,
 * }} body
 */
export function atualizarMetasEstoque(body = {}) {
  return invokeFunction('atualizarMetasEstoque', body);
}
