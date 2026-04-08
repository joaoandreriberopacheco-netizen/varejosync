import React from 'react';
import { Search, X } from 'lucide-react';

export default function FreteSearchBar({ value, onChange, placeholder = 'Buscar embarcação...' }) {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-2xl px-3 py-2.5 shadow-sm border border-gray-200 dark:border-gray-700">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}