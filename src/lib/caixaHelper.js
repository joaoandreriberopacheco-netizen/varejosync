import { base44 } from '@/api/base44Client';

/**
 * DESATIVADO: Movimentos de caixa NÃO geram mais lançamentos financeiros.
 * O registro de MovimentosCaixa + atualização de saldos é feito diretamente
 * pelo PDVCaixa (handleSalvarMovimento).
 * Esta função é mantida apenas por compatibilidade de imports.
 */
export async function processarMovimentoCaixa(movimento, contaOrigem, contaDestino = null) {
  // NÃO CRIA LANÇAMENTOS FINANCEIROS — apenas retorna sucesso
  return { sucesso: true, grupoId: null };
}