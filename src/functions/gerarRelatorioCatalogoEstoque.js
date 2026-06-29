/**
 * Gera PDF de estoque do catálogo no browser (jspdf), com filtros e vista da tela.
 * Import dinâmico apenas — sem re-export estático (Base44 import analysis).
 */
export async function gerarRelatorioCatalogoEstoque(body) {
  const { generateRelatorioCatalogoEstoquePdf } = await import(
    '@/lib/relatorioCatalogoEstoquePdf/generateRelatorioCatalogoEstoquePdf.js'
  );
  return generateRelatorioCatalogoEstoquePdf(body ?? {});
}
