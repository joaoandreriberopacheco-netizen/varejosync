import React from 'react';
import { ListFilter, Search, X } from 'lucide-react';

export default function FluvialSearchBar({ value, onChange, onToggleFilters, filtersOpen }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-3xl bg-white dark:bg-gray-800 shadow-sm px-3 py-2.5 flex items-center gap-2.5 min-w-0">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Buscar barco"
          className="w-full bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
        />
        {value ? (
          <button type="button" onClick={() => onChange('')} className="text-gray-400 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onToggleFilters}
        className={`w-11 h-11 rounded-2xl shadow-sm flex items-center justify-center flex-shrink-0 ${filtersOpen ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}
      >
        <ListFilter className="w-4 h-4" />
      </button>
    </div>
  );
}