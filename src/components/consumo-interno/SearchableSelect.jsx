import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, X } from 'lucide-react';

export default function SearchableSelect({
  items = [],
  value = '',
  onChange = () => {},
  placeholder = 'Buscar...',
  onAddNew = () => {},
  displayField = 'nome',
  idField = 'id',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Atualiza label quando value muda
  useEffect(() => {
    if (value) {
      const item = items.find(i => String(i[idField]) === String(value) || i[displayField] === value);
      setSelectedLabel(item ? item[displayField] : value);
    } else {
      setSelectedLabel('');
    }
  }, [value, items, idField, displayField]);

  // Filtra itens por busca
  const filtered = items.filter(item =>
    item[displayField].toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (item) => {
    onChange(item[displayField]);
    setSelectedLabel(item[displayField]);
    setSearch('');
    setIsOpen(false);
  };

  const handleAddNew = () => {
    const nextValue = search.trim();
    if (nextValue) {
      onAddNew(nextValue);
      setSelectedLabel(nextValue);
      onChange(nextValue);
      setSearch('');
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange('');
    setSelectedLabel('');
    setSearch('');
  };

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0 w-full">
      {/* Trigger */}
      <div className="flex h-12 w-full items-center gap-2 rounded-2xl border-0 bg-gray-100 px-3 shadow-sm dark:bg-gray-900 overflow-hidden">
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
        <input autoComplete="off"
          ref={inputRef}
          type="text"
          placeholder={selectedLabel || placeholder}
          value={isOpen ? search : ''}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 placeholder-gray-500 outline-none dark:text-white dark:placeholder-gray-400"
        />
        {selectedLabel && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-[60] mt-1 max-h-60 overflow-y-auto rounded-2xl border-0 bg-white shadow-lg dark:bg-gray-800">
          {filtered.length > 0 ? (
            <>
              {filtered.map((item) => (
                <button
                  key={item[idField]}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full px-4 py-3 text-left text-sm text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  {item[displayField]}
                </button>
              ))}
              {search && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleAddNew}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-t border-gray-100 dark:border-gray-700"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar: "{search}"
                </button>
              )}
            </>
          ) : search ? (
            <button
              type="button"
              onClick={handleAddNew}
              className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <Plus className="h-4 w-4" />
              Adicionar: "{search}"
            </button>
          ) : (
            <div className="px-4 py-3 text-center text-xs text-gray-400">
              Nenhum resultado
            </div>
          )}
        </div>
      )}
    </div>
  );
}