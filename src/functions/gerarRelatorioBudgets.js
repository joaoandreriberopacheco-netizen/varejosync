import { generateRelatorioBudgetsPdf } from '@/lib/relatorioBudgetsPdf';

/** Gera o PDF de budgets mensais diretamente no browser. */
export async function gerarRelatorioBudgets(body) {
  return generateRelatorioBudgetsPdf(body ?? {});
}
