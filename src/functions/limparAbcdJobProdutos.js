import { invokeFunction } from './_invokeHelper';

/** Limpa abcd / IEP gravados pelo job (admin). dry_run: true por defeito no servidor. */
export function limparAbcdJobProdutos(body = {}) {
  return invokeFunction('limparAbcdJobProdutos', body);
}
