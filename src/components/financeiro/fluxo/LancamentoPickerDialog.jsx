import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/** Camadas do stack de diálogos do formulário de lançamento. */
export const Z_LANCAMENTO = {
  backdrop: 59,
  form: 60,
  pickerOverlay: 68,
  picker: 70,
  confirmOverlay: 72,
  confirm: 72,
};

const pickerSheetClass =
  'fixed z-[70] gap-0 border-0 bg-background p-0 shadow-2xl duration-200 ' +
  'inset-x-0 bottom-0 top-auto max-h-[min(88dvh,640px)] w-full max-w-none translate-x-0 translate-y-0 rounded-t-[28px] ' +
  'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom ' +
  'sm:inset-auto sm:left-[50%] sm:top-[50%] sm:max-h-[85dvh] sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl ' +
  'sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%] sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]';

/**
 * Dialog de picker acima do NovoLancamentoDialog (z-60).
 * Mobile: bottom sheet; desktop: centrado.
 */
export default function LancamentoPickerDialog({
  open,
  onOpenChange,
  title,
  children,
  className,
  bodyClassName,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[68] bg-black/70"
        className={cn(pickerSheetClass, className)}
      >
        <DialogHeader className="shrink-0 px-5 pt-5 pb-2 text-left">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5', bodyClassName)}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Classes para diálogos de confirmação / data acima do formulário. */
export function lancamentoStackDialogClass(extra = '') {
  return cn('z-[72] sm:max-w-sm', extra);
}

export const lancamentoStackOverlayClass = 'z-[72] bg-black/70';
