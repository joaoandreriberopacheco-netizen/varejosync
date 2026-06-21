import React, { useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function LancamentoConfirmacaoDialog({ open, mode, onCreateAnother, onFinish, successTitle, successMessage }) {
  const processing = mode === 'processing';

  useEffect(() => {
    if (!open || processing) return;
    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (key === 's') { e.preventDefault(); onCreateAnother(); }
      if (key === 'n') { e.preventDefault(); onFinish(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, processing, onCreateAnother, onFinish]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm rounded-3xl border-0 bg-card shadow-xl p-6 [&>button]:hidden">
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${processing ? 'bg-muted' : 'bg-green-50 dark:bg-green-900/20'}`}>
            {processing ? (
              <Loader2 className="w-7 h-7 text-muted-foreground dark:text-foreground/90 animate-spin" />
            ) : (
              <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground font-glacial">
              {processing ? 'Processando' : (successTitle || 'Lançamento confirmado')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {processing ? 'Aguarde enquanto salvamos o lançamento.' : (successMessage || 'Deseja adicionar outro lançamento?')}
            </p>
          </div>

          {!processing && (
            <div className="w-full flex flex-col gap-2 pt-2">
              <button
                onClick={onCreateAnother}
                className="w-full h-12 rounded-2xl bg-background dark:bg-muted text-white dark:text-foreground text-sm font-semibold"
              >
                Sim (S)
              </button>
              <button
                onClick={onFinish}
                className="w-full h-12 rounded-2xl bg-muted text-foreground text-sm font-medium"
              >
                Não (N)
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}