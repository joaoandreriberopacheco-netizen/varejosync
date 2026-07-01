/**
 * Gera PDF de vendas do catálogo v2 (beta) no browser — relatório único 30+60d com preço e MKUP.
 */
export async function gerarRelatorioCatalogoVendasV2(body) {
  const { generateRelatorioCatalogoVendasPdfV2 } = await import(
    '@/lib/relatorioCatalogoVendasPdf/generateRelatorioCatalogoVendasPdfV2.js'
  );
  return generateRelatorioCatalogoVendasPdfV2(body ?? {});
}
