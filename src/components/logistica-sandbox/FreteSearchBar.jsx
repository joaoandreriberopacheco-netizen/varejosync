import React from 'react';
import { Search, X } from 'lucide-react';

export default function FreteSearchBar({ value, onChange, placeholder = 'Buscar embarcação...' }) {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-card rounded-2xl px-3 py-2.5 shadow-sm border border-border/40">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input autoComplete="off"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}