import React, { Suspense, lazy, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { QUICK_ACCESS_Z } from '@/lib/quickAccessOverlay';

const PDVCaixa = lazy(() => import('@/components/vendas/PDVCaixa'));

function CaixaLoading() {
  return (
    <div className="flex h-full min-h-[40vh] flex-1 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function CaixaRapidoPanel({ open, onOpenChange }) {
  const handleClose = () => onOpenChange(false);

  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const shell = (
    <div
      className="fixed inset-0 flex min-h-0 flex-col overflow-hidden touch-none"
      style={{ zIndex: QUICK_ACCESS_Z.panel }}
      role="dialog"
      aria-modal="true"
      aria-label="Caixa rápido"
    >
      {/* Vidro: bloqueia toque/clique na tela de baixo (ex. autorizar venda no PDV) */}
      <div
        className="absolute inset-0 bg-background/75 backdrop-blur-md dark:bg-background/85"
        aria-hidden
        onClick={(event) => event.stopPropagation()}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/95 shadow-2xl ring-1 ring-border/40 dark:bg-background/95 touch-auto">
        <Suspense fallback={<CaixaLoading />}>
          <PDVCaixa
            overlayMode
            onClose={handleClose}
            initialActiveTab="vendas"
            initialVendasView="aguardando"
          />
        </Suspense>
      </div>
    </div>
  );

  return createPortal(shell, document.body);
}
