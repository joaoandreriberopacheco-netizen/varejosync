import { generateRelatorioVisaoFinanceiraEnxutoPdf } from '@/lib/relatorioVisaoFinanceiraPdf';

/** Gera o PDF da Visão Financeira diretamente no browser. */
export async function gerarRelatorioVisaoFinanceira(body) {
  return generateRelatorioVisaoFinanceiraEnxutoPdf(body ?? {});
}
