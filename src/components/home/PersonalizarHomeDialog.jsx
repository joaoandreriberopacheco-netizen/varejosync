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
      <DialogContent className="max-w-sm mx-auto dark:bg-card dark:border-border">
        <DialogHeader>
           <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
             Personalizar Tela Inicial
           </DialogTitle>
           <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
             Toque para incluir ou remover. Até {MAX_ATALHOS} atalhos na grade da tela inicial.
           </p>
         </DialogHeader>

        <div className="grid grid-cols-3 gap-2 py-2 max-h-[min(70vh,28rem)] overflow-y-auto">
          {availableActions.map(action => {
            const Icon = action.icon;
            const isSelected = localSelected.includes(action.id);
            return (
              <button
                key={action.id}
                onClick={() => toggle(action.id)}
                className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-medium truncate">{action.label}</span>
                {isSelected && <Check className="w-3 h-3 ml-auto flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl dark:border-gray-700 dark:text-gray-300">
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