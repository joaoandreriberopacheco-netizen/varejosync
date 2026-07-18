/**
 * PWA Web Share Target → rota /AnexoCompartilhado (POST interceptado pelo service worker).
 *
 * Sub-alvos no app (escolha do utilizador após receber o ficheiro):
 * - lancamento — LançamentoFinanceiro
 * - pedido_compra | pedido — PedidoCompra
 * - pedidos — submenu de pedidos na Torre (widget)
 * - financeiro — submenu financeiro na Torre (widget)
 * - frete | evento | itinerario — EventosLogisticos (viagem fluvial)
 * - importar_pedido | novo_pedido | importar_itens — novo pedido + importador PDF
 *
 * Deep link opcional (abre já no passo de busca): ?destino=lancamento|pedido|frete|importar_pedido
 */
export const SHARE_DESTINO_QUERY = 'destino';

export const SHARE_SUBTARGET_KEYS = {
  /** Atalho para abrir na etapa de classificação */
  torre: 'torre_controle',
  classificar: 'torre_controle',
  lancamento: 'vincular',
  pedido: 'vincular_pedido',
  pedido_compra: 'vincular_pedido',
  pedidos: 'opcoes_pedidos',
  financeiro: 'opcoes_financeiro',
  frete: 'vincular_evento',
  evento: 'vincular_evento',
  itinerario: 'vincular_evento',
  /** Importar PDF direto para nova conta a pagar (AGEFIN) */
  conta_pdf: 'importar_pdf_conta',
  importar_pdf: 'importar_pdf_conta',
  conta: 'importar_pdf_conta',
  /** Legado: redireciona para importar PDF e criar conta nova */
  atualizar_boleto: 'importar_pdf_conta',
  boletos: 'importar_pdf_conta',
  atualizador: 'importar_pdf_conta',
  /** Novo pedido de compra + importador de itens (PDF) */
  importar_pedido: 'importar_pedido_novo',
  novo_pedido: 'importar_pedido_novo',
  importar_itens: 'importar_pedido_novo',
  pdf_pedido: 'importar_pedido_novo',
};

export function mapDestinoQueryToEtapa(destinoRaw) {
  if (!destinoRaw || typeof destinoRaw !== 'string') return null;
  const k = destinoRaw.trim().toLowerCase();
  return SHARE_SUBTARGET_KEYS[k] || null;
}
