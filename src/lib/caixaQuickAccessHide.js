/** Oculta atalhos globais (orçamento/caixa/PDV vendedor) em telas fullscreen de PDV ou espelho. */
export function shouldHideQuickAccessLaunchers(pathname, search = '') {
  const path = String(pathname || '');
  if (path.includes('PDVCaixa')) return true;
  if (path.includes('PDVVendedor')) return true;
  if (path.includes('CaixasAtivos')) return true;
  if (path.includes('TurnosFechados')) return true;
  if (path.includes('PDV')) {
    const mode = new URLSearchParams(search).get('mode');
    if (!mode || mode === 'caixa' || mode === 'vendedor' || mode === 'supermercado') return true;
  }
  return false;
}
