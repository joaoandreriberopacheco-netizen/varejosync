import React from 'react';
import { DialogContent } from '@/components/ui/dialog';
import { cn } from '@/components/utils';
import { useCaixaOverlayStack } from '@/components/vendas/caixa/CaixaOverlayStackContext';
import {
  QUICK_ACCESS_NESTED_CHILD_DIALOG_CLASS,
  QUICK_ACCESS_NESTED_DIALOG_CLASS,
} from '@/lib/quickAccessOverlay';

/**
 * DialogContent do caixa — sobe z-index quando aberto no overlay rápido (acima do painel z-1200).
 * `nestedChild` para sheets empilhados (ex. maquininha sobre pagamento).
 */
export function CaixaDialogContent({
  className,
  overlayClassName,
  nestedChild = false,
  ...props
}) {
  const overlayStack = useCaixaOverlayStack();
  const nestedZ = overlayStack
    ? (nestedChild ? QUICK_ACCESS_NESTED_CHILD_DIALOG_CLASS : QUICK_ACCESS_NESTED_DIALOG_CLASS)
    : undefined;

  return (
    <DialogContent
      overlayClassName={cn(nestedZ, overlayClassName)}
      className={cn(nestedZ, className)}
      {...props}
    />
  );
}
