import React, { createContext, useContext } from 'react';
import {
  CAIXA_MIRROR_DIALOG_CHILD_CLASS,
  CAIXA_MIRROR_DIALOG_CLASS,
  QUICK_ACCESS_NESTED_CHILD_DIALOG_CLASS,
  QUICK_ACCESS_NESTED_DIALOG_CLASS,
} from '@/lib/quickAccessOverlay';

/** null = sem stack elevado · 'quickAccess' = painel rápido · 'mirror' = espelho turno/caixa */
const CaixaOverlayStackContext = createContext(null);

export function CaixaOverlayStackProvider({ active, stack = 'quickAccess', children }) {
  const value = active ? stack : null;
  return (
    <CaixaOverlayStackContext.Provider value={value}>
      {children}
    </CaixaOverlayStackContext.Provider>
  );
}

export function useCaixaOverlayStack() {
  return useContext(CaixaOverlayStackContext);
}

function nestedDialogZ(stack, nestedChild = false) {
  if (stack === 'mirror') {
    return nestedChild ? CAIXA_MIRROR_DIALOG_CHILD_CLASS : CAIXA_MIRROR_DIALOG_CLASS;
  }
  if (stack === 'quickAccess') {
    return nestedChild ? QUICK_ACCESS_NESTED_CHILD_DIALOG_CLASS : QUICK_ACCESS_NESTED_DIALOG_CLASS;
  }
  return undefined;
}

/** z-index para dialogs portaled no body quando o caixa está num overlay elevado. */
export function useCaixaNestedDialogZ(nestedChild = false) {
  return nestedDialogZ(useCaixaOverlayStack(), nestedChild);
}
