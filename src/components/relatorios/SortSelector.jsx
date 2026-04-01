import React, { useState } from 'react';
import { ChevronDown, Type, TrendingUp, DollarSign, Percent, Scale } from 'lucide-react';

export default function SortSelector({ sortField, setSortField, sortOrder, setSortOrder }) {
  const [showCriteria, setShowCriteria] = useState(false);
  const [showDirection, setShowDirection] = useState(false);

  const sortOptions = [
    { field: 'nome', label: 'Nome', icon: Type },
    { field: 'lucro_total', label: 'Lucro', icon: DollarSign },
    { field: 'total_recebido', label: 'Receita', icon: TrendingUp },
    { field: 'markup_percentual', label: 'Markup %', icon: Percent },
    { field: 'margem_percentual', label: 'Margem %', icon: Scale }
  ];

  const currentOption = sortOptions.find(opt => opt.field === sortField);
  const CurrentIcon = currentOption?.icon || Type;

  const handleFieldChange = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'nome' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="flex gap-2">
      {/* Critério Selecionado - Clicável */}
      <div className="relative flex-1">
        <button
          onClick={() => setShowCriteria(!showCriteria)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition"
        >
          <CurrentIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">{currentOption?.label}</span>
        </button>

        {showCriteria && (
          <div className="absolute top-full left-0 mt-2 w-56 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-2 space-y-1 z-20 shadow-lg">
            {sortOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.field}
                  onClick={() => {
                    handleFieldChange(opt.field);
                    setShowCriteria(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition rounded-md ${
                    sortField === opt.field
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Seta para Sentido */}
      <div className="relative">
        <button
          onClick={() => setShowDirection(!showDirection)}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition"
        >
          <ChevronDown className={`w-4 h-4 text-gray-700 dark:text-gray-300 transition ${
            sortOrder === 'desc' ? 'rotate-180' : ''
          }`} />
        </button>

        {showDirection && (
          <div className="absolute top-full right-0 mt-2 w-32 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-1 space-y-1 z-20 shadow-lg">
            {sortField === 'nome' ? (
              <>
                <button
                  onClick={() => {
                    setSortOrder('asc');
                    setShowDirection(false);
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-md transition text-left ${
                    sortOrder === 'asc'
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  A → Z
                </button>
                <button
                  onClick={() => {
                    setSortOrder('desc');
                    setShowDirection(false);
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-md transition text-left ${
                    sortOrder === 'desc'
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Z → A
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setSortOrder('desc');
                    setShowDirection(false);
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-md transition text-left ${
                    sortOrder === 'desc'
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  ↓ Maior
                </button>
                <button
                  onClick={() => {
                    setSortOrder('asc');
                    setShowDirection(false);
                  }}
                  className={`w-full px-3 py-2 text-sm rounded-md transition text-left ${
                    sortOrder === 'asc'
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  ↑ Menor
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}