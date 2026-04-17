import { invokeFunction } from './_invokeHelper';

/** dryRun omissão true; para apagar: { dataCorte, dryRun: false, confirmacao: 'EXCLUIR_LF_AUTO', incluirPagos?: boolean } */
export function excluirLancamentosGeradosAutoAntesData(body) {
  return invokeFunction('excluirLancamentosGeradosAutoAntesData', body);
}
