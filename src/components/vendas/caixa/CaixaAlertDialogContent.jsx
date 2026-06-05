import React from 'react';
import { AlertDialogContent } from '@/components/ui/alert-dialog';
import { cn } from '@/components/utils';
import { useCaixaNestedDialogZ } from '@/components/vendas/caixa/CaixaOverlayStackContext';

/** AlertDialogContent do caixa — z-index elevado no overlay rápido. */
export function CaixaAlertDialogContent({ className, overlayClassName, ...props }) {
  const nestedZ = useCaixaNestedDialogZ();

  return (
    <AlertDialogContent
      overlayClassName={cn(nestedZ, overlayClassName)}
      className={cn(nestedZ, className)}
      {...props}
    />
  );
}
