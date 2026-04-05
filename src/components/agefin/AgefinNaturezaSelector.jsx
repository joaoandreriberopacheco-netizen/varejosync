import React from 'react';
import { Check } from 'lucide-react';

export default function AgefinNaturezaSelector({ value, onChange }) {
  const options = [
    {
      id: 'Parcelado',
      label: 'Parcelado',
      description: 'Múltiplas parcelas',
      icon: '📋',
    },
    {
      id: 'Único',
      label: 'Único',
      description: 'Pagamento único',
      icon: '📄',
    },
    {
      id: 'Recorrente',
      label: 'Recorrente',
      description: 'Despesa fixa',
      icon: '🔄',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={`relative p-3 rounded-2xl transition-all ${
            value === option.id
              ? 'bg-blue-600 text-white shadow-lg scale-105'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <div className="text-2xl mb-1">{option.icon}</div>
          <p className="text-xs font-semibold leading-tight">{option.label}</p>
          {value === option.id && (
            <div className="absolute top-1 right-1 bg-white dark:bg-gray-900 rounded-full p-0.5">
              <Check className="w-3 h-3 text-blue-600" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}