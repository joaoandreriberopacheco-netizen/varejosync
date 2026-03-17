import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { RefreshCw, Calendar, ChevronRight } from 'lucide-react';

const OPCOES = [
  { value: 'apenas_esta',  label: 'Apenas esta',          desc: 'Altera somente este lançamento' },
  { value: 'todas',        label: 'Todas',                 desc: 'Altera todas do grupo (exceto pagas)' },
  { value: 'futuras',      label: 'Esta e futuras',        desc: 'A partir desta data (exceto pagas)' },
  { value: 'passadas',     label: 'Esta e anteriores',     desc: 'Até esta data (exceto pagas)' },
];

export default function RecorrenciaEscopoDialog({ open, onClose, onConfirm }) {
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-xs p-0 gap-0 dark:bg-gray-900 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Lançamento recorrente</p>
        </div>
        <p className="text-xs text-gray-400 px-5 pb-3">Como deseja aplicar a alteração?</p>
        <div className="h-px bg-gray-100 dark:bg-gray-800" />
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {OPCOES.map(op => (
            <button
              key={op.value}
              onClick={() => { onConfirm(op.value); onClose(); }}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{op.label}</p>
                <p className="text-[0.65rem] text-gray-400 mt-0.5">{op.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-none" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}