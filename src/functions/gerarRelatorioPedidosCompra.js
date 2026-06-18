import { generateRelatorioPedidosCompraPdf } from '@/lib/relatorioPedidosCompraPdf/generateRelatorioPedidosCompraPdf';

/**
 * Gera o PDF no browser (jspdf) para que expandido / enxuto / mobile
 * reflitam sempre o código do repositório, sem depender do deploy Base44.
 */
export async function gerarRelatorioPedidosCompra(body) {
  return generateRelatorioPedidosCompraPdf(body ?? {});
}
