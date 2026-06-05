import React, { Suspense, lazy } from 'react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Loader2 } from 'lucide-react';

const PDVCaixa = lazy(() => import('@/components/vendas/PDVCaixa'));

function CaixaLoading() {
  return (
    <div className="flex h-full min-h-[40vh] flex-1 items-center justify-center bg-muted/40 dark:bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function CaixaRapidoPanel({ open, onOpenChange }) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleClose = () => onOpenChange(false);

  const content = (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-muted/40 dark:bg-background">
      <Suspense fallback={<CaixaLoading />}>
        {open ? (
          <PDVCaixa
            overlayMode
            onClose={handleClose}
            initialActiveTab="vendas"
            initialVendasView="aguardando"
          />
        ) : null}
      </Suspense>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="mt-0 flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col rounded-none border-0 bg-muted/40 p-0 dark:bg-background [&>div:first-child]:hidden">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-muted/40 p-0 shadow-2xl dark:bg-background [&>button.absolute]:hidden">
        <DialogHeader className="hidden" />
        {content}
      </DialogContent>
    </Dialog>
  );
}
