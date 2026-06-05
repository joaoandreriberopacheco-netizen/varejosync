import React, { useEffect, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

/**
 * Pergunta "Imprimir?" antes de abrir a tela de comprovante.
 * Sim: clique, S ou Enter. Não: clique, N ou Esc.
 */
export default function ConfirmarImpressaoDialog({ open, onOpenChange, onSim, onNao }) {
  const simRef = useRef(null);
  const respostaRef = useRef(null);

  const fecharCom = (resposta) => {
    if (!open || respostaRef.current) return;
    respostaRef.current = resposta;
    if (resposta === 'sim') {
      onSim?.();
    } else {
      onNao?.();
    }
    onOpenChange?.(false);
  };

  useEffect(() => {
    if (!open) {
      respostaRef.current = null;
      return undefined;
    }

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (key === 's' || key === 'enter') {
        e.preventDefault();
        fecharCom('sim');
      } else if (key === 'n' || key === 'escape') {
        e.preventDefault();
        fecharCom('nao');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onSim, onNao, onOpenChange]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => simRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  const handleOpenChange = (next) => {
    if (!next && open && !respostaRef.current) {
      fecharCom('nao');
      return;
    }
    onOpenChange?.(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md rounded-[28px] border-0 bg-card p-5 shadow-2xl sm:w-full sm:max-w-lg sm:p-6 dark:bg-background">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-xl">Imprimir?</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Deseja abrir a tela de impressão do comprovante?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-2xl border-0 bg-muted text-foreground hover:bg-muted/80 sm:w-auto sm:min-w-[120px]"
            onClick={() => fecharCom('nao')}
          >
            Não <span className="ml-1 text-xs text-muted-foreground">(N / Esc)</span>
          </Button>
          <Button
            ref={simRef}
            type="button"
            className="w-full rounded-2xl bg-background text-white hover:bg-primary dark:bg-card dark:text-foreground sm:w-auto sm:min-w-[120px]"
            onClick={() => fecharCom('sim')}
          >
            Sim <span className="ml-1 text-xs opacity-80">(S / Enter)</span>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
