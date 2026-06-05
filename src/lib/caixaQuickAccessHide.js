/** Oculta atalhos globais (orçamento/caixa rápido) em telas de caixa fullscreen ou espelho. */
export function shouldHideQuickAccessLaunchers(pathname, search = '') {
  const path = String(pathname || '');
  if (path.includes('PDVCaixa')) return true;
  if (path.includes('CaixasAtivos')) return true;
  if (path.includes('TurnosFechados')) return true;
  if (path.includes('PDV')) {
    const mode = new URLSearchParams(search).get('mode');
    if (mode === 'caixa') return true;
  }
  return false;
}
