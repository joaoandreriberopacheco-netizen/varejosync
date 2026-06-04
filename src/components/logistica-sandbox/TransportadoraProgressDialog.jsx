import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

function StepItem({ label, active, done }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-muted/50 px-4 py-3 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card shadow-sm">
        {done ? (
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        ) : active ? (
          <Loader2 className="h-4 w-4 animate-spin text-foreground/90" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-muted dark:bg-muted" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground dark:text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          {done ? 'Concluído' : active ? 'Em andamento...' : 'Aguardando'}
        </p>
      </div>
    </div>
  );
}

export default function TransportadoraProgressDialog({ open, currentStep = 0, steps = [], success = false, stepStatuses = [] }) {
  return (
    <Dialog open={open}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-[28px] border-0 bg-card p-0 shadow-2xl dark:bg-background">
        <div className="space-y-4 p-5">
          <div>
            <h3 className="font-glacial text-xl font-semibold text-foreground dark:text-foreground">
              {success ? 'Processo concluído' : 'Atualizando transportadora'}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {success ? 'As informações novas já estão prontas na timeline.' : 'Aguarde enquanto sincronizamos os dados.'}
            </p>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => {
              const status = stepStatuses[index] || (success ? 'done' : index === currentStep ? 'active' : index < currentStep ? 'done' : 'waiting');
              return (
                <StepItem
                  key={step}
                  label={step}
                  active={status === 'active'}
                  done={status === 'done'}
                />
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}