import { generateRelatorioCatalogoEstoquePdf } from '@/lib/relatorioCatalogoEstoquePdf/generateRelatorioCatalogoEstoquePdf';

/**
 * Gera PDF de estoque do catálogo no browser (jspdf), com filtros e vista da tela.
 */
export async function gerarRelatorioCatalogoEstoque(body) {
  return generateRelatorioCatalogoEstoquePdf(body ?? {});
}
