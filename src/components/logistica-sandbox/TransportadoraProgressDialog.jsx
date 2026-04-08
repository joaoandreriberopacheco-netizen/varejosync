import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

function StepItem({ label, active, done }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-gray-50 dark:bg-gray-800 px-4 py-3 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white dark:bg-gray-900 shadow-sm">
        {done ? (
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        ) : active ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-700 dark:text-gray-200" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {done ? 'Concluído' : active ? 'Em andamento...' : 'Aguardando'}
        </p>
      </div>
    </div>
  );
}

export default function TransportadoraProgressDialog({ open, currentStep = 0, steps = [], success = false }) {
  return (
    <Dialog open={open}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-[28px] border-0 bg-white p-0 shadow-2xl dark:bg-gray-900">
        <div className="space-y-4 p-5">
          <div>
            <h3 className="font-glacial text-xl font-semibold text-gray-900 dark:text-gray-100">
              {success ? 'Processo concluído' : 'Atualizando transportadora'}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {success ? 'As informações novas já estão prontas na timeline.' : 'Aguarde enquanto sincronizamos os dados.'}
            </p>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <StepItem
                key={step}
                label={step}
                active={!success && index === currentStep}
                done={success || index < currentStep}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}