import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

export default function FreteFilterTabs({ 
  eventos = [], 
  selectedFilter = 'todos',
  onFilterChange 
}) {
  const filters = [
    { id: 'todos', label: 'Todos', color: 'text-gray-600 dark:text-gray-400' },
    { id: 'comConta', label: 'Com Conta', color: 'text-amber-600 dark:text-amber-400' },
    { id: 'semConta', label: 'Sem Conta', color: 'text-slate-600 dark:text-slate-400' }
  ];

  const getTotal = () => {
    switch (selectedFilter) {
      case 'comConta':
        return eventos.filter(e => e.tem_conta_frete).length;
      case 'semConta':
        return eventos.filter(e => !e.tem_conta_frete).length;
      default:
        return eventos.length;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className="flex-1 rounded-2xl px-3 py-2 text-center transition-colors"
            style={{
              backgroundColor: selectedFilter === filter.id 
                ? 'rgba(0, 0, 0, 0.05)' 
                : 'transparent',
              color: 'inherit'
            }}
          >
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {filter.label}
            </div>
            <div className={`text-lg font-semibold ${filter.color}`}>
              {filter.id === 'todos' ? eventos.length : 
               filter.id === 'comConta' ? eventos.filter(e => e.tem_conta_frete).length :
               eventos.filter(e => !e.tem_conta_frete).length}
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center text-center py-2">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total selecionado</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {getTotal()}
          </p>
        </div>
      </div>
    </div>
  );
}