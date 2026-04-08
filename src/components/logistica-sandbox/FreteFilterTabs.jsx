import React from 'react';

export default function FreteFilterTabs({ 
  selectedFilter = 'todos',
  onFilterChange 
}) {
  const filters = [
    { id: 'todos', label: 'Todos' },
    { id: 'comConta', label: 'Com Conta' },
    { id: 'semConta', label: 'Sem Conta' }
  ];

  return (
    <div className="flex items-center gap-2">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={`flex-1 px-3 py-2 rounded-2xl text-xs font-medium transition-colors ${
            selectedFilter === filter.id
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}