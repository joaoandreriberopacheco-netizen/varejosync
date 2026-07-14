import { useEffect, useRef } from 'react';

/**
 * Ao abrir overlay (dialog/sheet), empilha um estado no histórico para que
 * o botão «voltar» do sistema feche o overlay em vez de sair da página.
 * @param {boolean} open
 * @param {(open: boolean) => void} [onOpenChange]
 */
export function useOverlayHistorySync(open, onOpenChange) {
  const closedByPopRef = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!open || typeof onOpenChangeRef.current !== 'function') return;

    closedByPopRef.current = false;
    try {
      window.history.pushState({ p38_overlay: 1 }, '');
    } catch {
      return;
    }

    const onPopState = () => {
      closedByPopRef.current = true;
      onOpenChangeRef.current?.(false);
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      if (!closedByPopRef.current) {
        try {
          if (window.history.state?.p38_overlay) {
            window.history.back();
          }
        } catch {
          /* ignore */
        }
      }
    };
  }, [open]);
}
