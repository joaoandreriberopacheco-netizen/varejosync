import React, { useMemo, useState } from 'react';
import { Check, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

/**
 * Busca incremental, ordenação alfabética (pt-BR).
 * Se o texto não corresponder a nenhum tipo existente, oferece criar tipo personalizado.
 */
export default function TipoDocumentoSearch({ tipos = [], value, onChange, onAdicionarTipoNovo }) {
  const [query, setQuery] = useState('');

  const normalized = query.trim().toLowerCase();
  const sortedTipos = useMemo(
    () => [...tipos].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })),
    [tipos]
  );

  const filtered = useMemo(() => {
    if (!normalized) return sortedTipos;
    return sortedTipos.filter((tipo) => tipo.toLowerCase().includes(normalized));
  }, [sortedTipos, normalized]);

  const trimmedQuery = query.trim();
  const exactMatch =
    trimmedQuery.length > 0 &&
    sortedTipos.some((t) => t.localeCompare(trimmedQuery, 'pt-BR', { sensitivity: 'base' }) === 0);
  const showAdicionar = trimmedQuery.length > 0 && !exactMatch;

  const aplicarTipoPersonalizado = () => {
    if (!trimmedQuery) return;
    onChange(trimmedQuery);
    onAdicionarTipoNovo?.(trimmedQuery);
    setQuery('');
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar tipo de documento (A–Z)"
          className="h-12 rounded-2xl border-0 bg-gray-100 pl-11 shadow-sm dark:bg-gray-800"
          autoComplete="off"
        />
      </div>

      {showAdicionar && (
        <button
          type="button"
          onClick={aplicarTipoPersonalizado}
          className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-3 text-left text-sm text-gray-700 shadow-sm transition-colors dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
        >
          <Plus className="h-4 w-4 flex-none text-lime-600 dark:text-lime-400" />
          <span>
            <span className="font-medium">Adicionar tipo </span>
            <span className="text-gray-900 dark:text-white">«{trimmedQuery}»</span>
          </span>
        </button>
      )}

      <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {filtered.map((tipo) => {
          const selected = tipo === value;
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => {
                onChange(tipo);
                setQuery('');
              }}
              className={`flex min-h-14 w-full items-center justify-between rounded-2xl px-4 py-4 text-left text-sm shadow-sm transition-colors ${
                selected
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
              }`}
            >
              <span className="font-medium">{tipo}</span>
              {selected && <Check className="h-4 w-4 flex-none" />}
            </button>
          );
        })}

        {filtered.length === 0 && !showAdicionar && (
          <div className="rounded-2xl bg-gray-100 px-4 py-4 text-sm text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-400">
            Nenhum tipo encontrado. Digite acima para sugerir um novo tipo.
          </div>
        )}
      </div>
    </div>
  );
}
