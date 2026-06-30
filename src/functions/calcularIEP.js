import { invokeFunction } from './_invokeHelper';

/**
 * Job servidor: calcula curva ABCD / IEP (90d) e grava no cadastro do produto.
 * @param {{
 *   somente_abcd_vazio?: boolean,
 *   modo?: 'manual' | 'agendado',
 *   fase?: 'preparar' | 'gravar' | 'limpar',
 *   run_id?: string,
 *   offset?: number,
 *   batch_size?: number,
 *   job_cache?: object,
 * }} body
 */
export function calcularIEP(body = {}) {
  return invokeFunction('calcularIEP', body);
}
