/**
 * Páginas onde os atalhos laterais (arrastar da borda esquerda) não devem aparecer —
 * listas densas ou ecrãs que já têm FAB/ação própria.
 */
export const QUICK_ACCESS_LAUNCHER_HIDDEN_PAGES = new Set([
  'TabelaPrecosConsulta',
  'Budgets',
  'PlanejamentoFinanceiro',
  'FolhaPrevisao',
]);

export function shouldShowQuickAccessLaunchers(pathname = '') {
  const page = pathname.split('/').filter(Boolean)[0] || 'Home';
  return !QUICK_ACCESS_LAUNCHER_HIDDEN_PAGES.has(page);
}
