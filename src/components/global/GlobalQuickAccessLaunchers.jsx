import QuickBudgetLauncher from '@/components/quick-budget/QuickBudgetLauncher';
import CaixaRapidoLauncher from '@/components/vendas/caixa/CaixaRapidoLauncher';
import VendedorRapidoLauncher from '@/components/vendas/VendedorRapidoLauncher';

/** Atalhos globais (orçamento + caixa + PDV vendedor) — montados no App para existir em qualquer rota autenticada. */
export default function GlobalQuickAccessLaunchers() {
  return (
    <>
      <QuickBudgetLauncher />
      <CaixaRapidoLauncher />
      <VendedorRapidoLauncher />
    </>
  );
}
