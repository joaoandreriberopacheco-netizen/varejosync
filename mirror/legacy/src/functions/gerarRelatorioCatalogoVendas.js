/**
 * Gera PDF de vendas do catálogo no browser (jspdf), com filtros e hierarquia da tela.
 * Import dinâmico apenas — sem re-export estático (Base44 import analysis).
 */
export async function gerarRelatorioCatalogoVendas(body) {
  const { generateRelatorioCatalogoVendasPdf } = await import(
    '@/lib/relatorioCatalogoVendasPdf/generateRelatorioCatalogoVendasPdf.js'
  );
  return generateRelatorioCatalogoVendasPdf(body ?? {});
}
