/**
 * Camadas z-index dos atalhos globais (orçamento rápido + caixa rápido).
 * Acima de PDV fullscreen (z-70), drawers (z-310) e FABs de página (ex. compras z-999).
 * Abaixo de toasts (z-99999) e fluxos especiais (anexo compartilhado z-50000).
 */
export const QUICK_ACCESS_Z = {
  panel: 1200,
  launcher: 1210,
  nestedDialog: 1220,
};

/** Classes Tailwind (valores literais para o purge do build). */
export const QUICK_ACCESS_PANEL_CLASS = 'z-[1200]';
export const QUICK_ACCESS_LAUNCHER_CLASS = 'z-[1210]';
export const QUICK_ACCESS_NESTED_DIALOG_CLASS = 'z-[1220]';
