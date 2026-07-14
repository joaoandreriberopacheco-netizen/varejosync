import React from 'react';
import { DialogContent } from '@/components/ui/dialog';
import { cn } from '@/components/utils';
import { useCaixaNestedDialogZ } from '@/components/vendas/caixa/CaixaOverlayStackContext';

/**
 * DialogContent do caixa — sobe z-index quando aberto no overlay rápido (acima do painel z-1200).
 * `nestedChild` para sheets empilhados (ex. maquininha sobre pagamento).
 */
export function CaixaDialogContent({
  className,
  overlayClassName,
  nestedChild = false,
  hideClose = false,
  ...props
}) {
  const nestedZ = useCaixaNestedDialogZ(nestedChild);

  return (
    <DialogContent
      hideClose={hideClose}
      overlayClassName={cn(nestedZ, overlayClassName)}
      className={cn(nestedZ, className)}
      {...props}
    />
  );
}
