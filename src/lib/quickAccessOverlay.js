/**
 * Camadas z-index dos atalhos globais (orçamento rápido + caixa rápido + PDV vendedor).
 * Acima de PDV fullscreen (z-70), drawers (z-310) e FABs de página (ex. compras z-999).
 */
export const QUICK_ACCESS_Z = {
  panel: 1200,
  launcher: 1210,
  nestedDialog: 1220,
  nestedDialogChild: 1230,
};

/** Classes Tailwind (valores literais para o purge do build). */
export const QUICK_ACCESS_PANEL_CLASS = 'z-[1200]';
export const QUICK_ACCESS_LAUNCHER_CLASS = 'z-[1210]';
export const QUICK_ACCESS_NESTED_DIALOG_CLASS = 'z-[1220]';
export const QUICK_ACCESS_NESTED_CHILD_DIALOG_CLASS = 'z-[1230]';

/** Espelho Caixas Ativos / Turnos Fechados — acima dos atalhos rápidos (z-1200). */
export const CAIXA_MIRROR_SHELL_Z = 1250;
export const CAIXA_MIRROR_DIALOG_CLASS = 'z-[1260]';
export const CAIXA_MIRROR_DIALOG_CHILD_CLASS = 'z-[1270]';

/**
 * Remove camadas Radix presas e travas de pointer-events/scroll no body
 * após fechar o painel de atalho (caixa/orçamento/vendedor).
 */
export function cleanupQuickAccessPortalLayers() {
  if (typeof document === 'undefined') return;

  const resetBody = () => {
    document.body.style.pointerEvents = '';
    document.body.removeAttribute('data-scroll-locked');
  };

  resetBody();

  requestAnimationFrame(() => {
    resetBody();
    document
      .querySelectorAll(
        '[data-radix-dialog-overlay][data-state="closed"], [data-radix-alert-dialog-overlay][data-state="closed"]'
      )
      .forEach((el) => el.remove());
  });
}
