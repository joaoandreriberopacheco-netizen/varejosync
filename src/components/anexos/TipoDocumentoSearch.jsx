import React, { useMemo, useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function TipoDocumentoSearch({ tipos = [], value, onChange }) {
  const [query, setQuery] = useState('');

  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalized) return tipos;
    return tipos.filter((tipo) => tipo.toLowerCase().includes(normalized));
  }, [tipos, normalized]);

  const exactExists = tipos.some((tipo) => tipo.toLowerCase() === normalized);
  const canCreate = normalized && !exactExists;

  const formatLabel = (text) => text
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar ou criar tipo"
          className="h-12 rounded-2xl border-0 bg-gray-100 pl-11 shadow-sm dark:bg-gray-800"
        />
      </div>

      <div className="max-h-44 space-y-2 overflow-y-auto">
        {filtered.map((tipo) => {
          const selected = tipo === value;
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => onChange(tipo)}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm shadow-sm transition-colors ${
                selected
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              <span>{tipo}</span>
              {selected && <Check className="h-4 w-4" />}
            </button>
          );
        })}

        {canCreate && (
          <button
            type="button"
            onClick={() => {
              const novoTipo = formatLabel(query.trim());
              onChange(novoTipo, true);
              setQuery('');
            }}
            className="flex w-full items-center justify-between rounded-2xl bg-gray-100 px-4 py-3 text-left text-sm text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-300"
          >
            <span>Adicionar “{formatLabel(query.trim())}”</span>
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}