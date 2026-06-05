import QuickBudgetLauncher from '@/components/quick-budget/QuickBudgetLauncher';
import CaixaRapidoLauncher from '@/components/vendas/caixa/CaixaRapidoLauncher';

/** Atalhos globais (orçamento + caixa) — montados no App para existir em qualquer rota autenticada. */
export default function GlobalQuickAccessLaunchers() {
  return (
    <>
      <QuickBudgetLauncher />
      <CaixaRapidoLauncher />
    </>
  );
}
