/**
 * Política do bottom nav no mobile (Fase 2).
 * Hubs = atalhos/cards curtos → menu sempre visível.
 * Demais páginas (listas longas, grelhas) → esconder ao descer, mostrar ao subir.
 */
export const BOTTOM_NAV_HUB_PAGES = new Set([
  'Home',
  'Dashboard',
  'Operacoes',
  'Estoque',
  'Relatorios',
  'HubLogistico',
  'Configuracoes',
  'Manual',
  'MapaFuncionalidades',
  'DashboardVendedor',
  'DashboardCaixa',
  'PainelGerente',
  /** PDV: menu inferior sempre visível (sem auto-hide ao scroll). */
  'PDV',
  'PDVCaixa',
  'PDVVendedor',
]);

export function shouldHideBottomNavOnScroll(pageName) {
  if (!pageName) return true;
  return !BOTTOM_NAV_HUB_PAGES.has(pageName);
}
