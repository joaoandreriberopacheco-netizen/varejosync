import React from 'react';
import { Check, FileStack, FileText, Repeat } from 'lucide-react';

const options = [
  {
    id: 'Parcelado',
    label: 'Parcelado',
    description: 'Múltiplas parcelas',
    icon: FileStack,
  },
  {
    id: 'Único',
    label: 'Único',
    description: 'Pagamento único',
    icon: FileText,
  },
  {
    id: 'Recorrente',
    label: 'Recorrente',
    description: 'Despesa fixa',
    icon: Repeat,
  },
];

export default function AgefinNaturezaSelector({ value = 'Único', onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`relative rounded-2xl px-3 py-4 text-center transition-all ${
              isActive
                ? 'bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 text-gray-500 shadow-sm hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-950'
            }`}
          >
            <div className="mb-2 flex justify-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isActive ? 'bg-white/10 dark:bg-gray-200' : 'bg-white dark:bg-gray-800'}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs font-semibold leading-tight">{option.label}</p>
            {isActive && (
              <div className="absolute right-2 top-2 rounded-full bg-white/15 p-1 dark:bg-gray-200">
                <Check className="h-3 w-3" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}