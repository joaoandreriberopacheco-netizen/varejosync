import React, { createContext, useContext } from 'react';
import { QUICK_ACCESS_NESTED_DIALOG_CLASS } from '@/lib/quickAccessOverlay';

const CaixaOverlayStackContext = createContext(false);

export function CaixaOverlayStackProvider({ active, children }) {
  return (
    <CaixaOverlayStackContext.Provider value={!!active}>
      {children}
    </CaixaOverlayStackContext.Provider>
  );
}

export function useCaixaOverlayStack() {
  return useContext(CaixaOverlayStackContext);
}

/** z-index para dialogs portaled no body quando o caixa está no overlay rápido. */
export function useCaixaNestedDialogZ() {
  return useCaixaOverlayStack() ? QUICK_ACCESS_NESTED_DIALOG_CLASS : undefined;
}
