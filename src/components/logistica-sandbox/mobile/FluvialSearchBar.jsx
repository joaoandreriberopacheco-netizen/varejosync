import React from 'react';
import { Search, X } from 'lucide-react';

export default function FluvialSearchBar({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-3xl bg-white dark:bg-gray-800 shadow-sm px-3 py-2.5 flex items-center gap-2.5 min-w-0">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Buscar embarcação"
          className="w-full bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
        />
        {value ? (
          <button type="button" onClick={() => onChange('')} className="text-gray-400 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}