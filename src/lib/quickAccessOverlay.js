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
