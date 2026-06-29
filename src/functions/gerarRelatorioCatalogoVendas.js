import { generateRelatorioCatalogoVendasPdf } from '@/lib/relatorioCatalogoVendasPdf/generateRelatorioCatalogoVendasPdf.js';

/**
 * Gera PDF de vendas do catálogo no browser (jspdf), com filtros e hierarquia da tela.
 */
export async function gerarRelatorioCatalogoVendas(body) {
  return generateRelatorioCatalogoVendasPdf(body ?? {});
}
