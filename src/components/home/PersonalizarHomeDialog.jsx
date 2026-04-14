import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { quickActionsAtivos } from './quickActions';

const MAX_ATALHOS = 9;

export default function PersonalizarHomeDialog({ isOpen, onClose, selected, onSave, allowedActions }) {
  const [localSelected, setLocalSelected] = useState(selected || []);

  useEffect(() => {
    if (isOpen) setLocalSelected(selected || []);
  }, [isOpen, selected]);

  const ativos = quickActionsAtivos();
  const availableActions =
    allowedActions === undefined
      ? ativos
      : ativos.filter((a) => allowedActions.includes(a.id));

  const toggle = (id) => {
    setLocalSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_ATALHOS) return prev;
      return [...prev, id];
    });
  };

  const handleSave = () => {
    onSave(localSelected);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="mx-auto flex max-h-[min(92dvh,40rem)] min-h-0 max-w-md flex-col gap-0 overflow-hidden p-0 dark:border-border dark:bg-card sm:max-w-lg">
        <DialogHeader className="shrink-0 space-y-1 border-b border-gray-100 px-4 pb-3 pt-4 dark:border-gray-800">
          <DialogTitle className="text-left text-base font-semibold text-gray-900 dark:text-white">
            Personalizar Tela Inicial
          </DialogTitle>
          <p className="text-left text-xs text-gray-500 dark:text-gray-400">
            Toque para incluir ou remover. Até {MAX_ATALHOS} atalhos na grade da tela inicial.
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {availableActions.map((action) => {
              const Icon = action.icon;
              const isSelected = localSelected.includes(action.id);
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => toggle(action.id)}
                  className={`relative flex min-h-[5.25rem] flex-col items-center justify-center gap-2 rounded-2xl px-2 py-3 text-center transition-all ${
                    isSelected
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'border border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 dark:bg-gray-900/15">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <Icon className="h-5 w-5 shrink-0 opacity-90" />
                  <span className="line-clamp-3 w-full px-0.5 text-[11px] font-medium leading-snug sm:text-xs">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-gray-100 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 dark:border-gray-800 dark:bg-card sm:px-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl dark:border-gray-700 dark:text-gray-300"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={localSelected.length === 0}
            className="flex-1 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            Salvar ({localSelected.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
