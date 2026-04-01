import React from 'react';
import { ArrowUpDown } from 'lucide-react';

export default function SortSelector({ sortField, setSortField, sortOrder, setSortOrder }) {
  const sortOptions = [
    { field: 'nome', label: 'Nome', icon: '📝' },
    { field: 'lucro_total', label: 'Lucro', icon: '💰' },
    { field: 'total_recebido', label: 'Receita', icon: '📈' },
    { field: 'markup_percentual', label: 'Markup %', icon: '📊' },
    { field: 'margem_percentual', label: 'Margem %', icon: '⚖️' }
  ];

  const handleFieldChange = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'nome' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Ordenar por</label>
      
      <div className="grid grid-cols-2 gap-2">
        {sortOptions.map((opt) => (
          <button
            key={opt.field}
            onClick={() => handleFieldChange(opt.field)}
            className={`px-2.5 py-2 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 ${
              sortField === opt.field
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <span>{opt.icon}</span>
            <span className="hidden sm:inline">{opt.label}</span>
            {sortField === opt.field && (
              <span className="text-[11px] font-bold">
                {sortOrder === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </button>
        ))}
      </div>

      {sortField === 'nome' && (
        <div className="flex gap-1.5">
          <button
            onClick={() => setSortOrder('asc')}
            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition ${
              sortOrder === 'asc'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            A → Z
          </button>
          <button
            onClick={() => setSortOrder('desc')}
            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition ${
              sortOrder === 'desc'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Z → A
          </button>
        </div>
      )}
    </div>
  );
}