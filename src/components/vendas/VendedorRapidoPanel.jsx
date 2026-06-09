import React, { Suspense, lazy, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { cleanupQuickAccessPortalLayers, QUICK_ACCESS_Z } from '@/lib/quickAccessOverlay';

const PDVVendedor = lazy(() => import('@/components/vendas/PDVVendedor'));

function VendedorLoading() {
  return (
    <div className="flex h-full min-h-[40vh] flex-1 items-center justify-center bg-muted/40 dark:bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function VendedorRapidoPanel({ open, onOpenChange, sessionKey = 0 }) {
  const handleClose = () => {
    cleanupQuickAccessPortalLayers();
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      cleanupQuickAccessPortalLayers();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const shell = (
    <div
      className="fixed inset-0 flex min-h-0 flex-col overflow-hidden bg-muted/40 dark:bg-background"
      style={{ zIndex: QUICK_ACCESS_Z.panel }}
      role="dialog"
      aria-modal="true"
      aria-label="PDV vendedor"
    >
      <Suspense fallback={<VendedorLoading />}>
        <PDVVendedor key={sessionKey} overlayMode onClose={handleClose} />
      </Suspense>
    </div>
  );

  return createPortal(shell, document.body);
}
