export { generateRelatorioCatalogoVendasPdf as gerarRelatorioCatalogoVendasPdf, CATALOG_SALES_PDF_BUILD } from '@/lib/relatorioCatalogoVendasPdf/generateRelatorioCatalogoVendasPdf';

/**
 * @deprecated Importe `generateRelatorioCatalogoVendasPdf` directamente (chunk com nome estável).
 */
export async function gerarRelatorioCatalogoVendas(body) {
  const { generateRelatorioCatalogoVendasPdf } = await import(
    '@/lib/relatorioCatalogoVendasPdf/generateRelatorioCatalogoVendasPdf.js'
  );
  return generateRelatorioCatalogoVendasPdf(body ?? {});
}
