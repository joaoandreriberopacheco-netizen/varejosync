import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button';
import { Check, GripVertical } from 'lucide-react';
import { ALL_QUICK_ACTIONS } from './quickActions';

export default function PersonalizarHomeDialog({ isOpen, onClose, selected, onSave, allowedActions }) {
  const [localSelected, setLocalSelected] = useState(selected || []);

  // Filtra para mostrar apenas ações permitidas pelo perfil
  const availableActions = allowedActions
    ? ALL_QUICK_ACTIONS.filter(a => allowedActions.includes(a.id))
    : ALL_QUICK_ACTIONS;

  const toggle = (id) => {
    setLocalSelected(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onSave(localSelected);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto dark:bg-gray-900 dark:border-gray-700">
        <DialogHeader>
           <DialogTitle className="text-base font-semibold text-gray-900 dark:text-white">
             Personalizar Tela Inicial
           </DialogTitle>
           <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
             Escolha os atalhos que deseja exibir (máx. 6)
           </p>
         </DialogHeader>

        <div className="grid grid-cols-2 gap-2 py-2">
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