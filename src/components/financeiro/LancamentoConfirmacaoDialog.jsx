import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function LancamentoConfirmacaoDialog({ open, mode, onCreateAnother, onFinish }) {
  const processing = mode === 'processing';

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm rounded-3xl border-0 bg-white dark:bg-gray-900 shadow-xl p-6 [&>button]:hidden">
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${processing ? 'bg-gray-100 dark:bg-gray-800' : 'bg-green-50 dark:bg-green-900/20'}`}>
            {processing ? (
              <Loader2 className="w-7 h-7 text-gray-500 dark:text-gray-300 animate-spin" />
            ) : (
              <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-glacial">
              {processing ? 'Processando' : 'Lançamento confirmado'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {processing ? 'Aguarde enquanto salvamos o lançamento.' : 'Deseja realizar outro lançamento ou concluir?'}
            </p>
          </div>

          {!processing && (
            <div className="w-full flex flex-col gap-2 pt-2">
              <button
                onClick={onCreateAnother}
                className="w-full h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm font-medium"
              >
                Realizar outro lançamento
              </button>
              <button
                onClick={onFinish}
                className="w-full h-12 rounded-2xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold"
              >
                Concluir
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}