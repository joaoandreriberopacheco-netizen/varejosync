/**
 * Camadas z-index dos atalhos globais (orçamento rápido + caixa rápido).
 * Devem ficar acima de PDV fullscreen (z-70), drawers comuns (z-310) e FABs de página (z-55).
 */
export const QUICK_ACCESS_Z = {
  panel: 600,
  launcher: 610,
  nestedDialog: 620,
};

/** Classes Tailwind (valores literais para o purge do build). */
export const QUICK_ACCESS_PANEL_CLASS = 'z-[600]';
export const QUICK_ACCESS_LAUNCHER_CLASS = 'z-[610]';
export const QUICK_ACCESS_NESTED_DIALOG_CLASS = 'z-[620]';
