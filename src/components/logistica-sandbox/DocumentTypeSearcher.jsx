import React, { useState, useMemo } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const DEFAULT_TYPES = [
  'Comprovante',
  'Boleto',
  'Nota Fiscal',
  'Contrato',
  'Orçamento',
  'Outro'
];

export default function DocumentTypeSearcher({ 
  selectedTypes = [], 
  onTypesChange,
  isOpen,
  onOpenChange 
}) {
  const [search, setSearch] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);
  const [newType, setNewType] = useState('');
  const [customTypes, setCustomTypes] = useState([]);

  const allTypes = useMemo(() => {
    const combined = [...DEFAULT_TYPES, ...customTypes];
    return [...new Set(combined)];
  }, [customTypes]);

  const filteredTypes = useMemo(() => {
    return allTypes.filter(type =>
      type.toLowerCase().includes(search.toLowerCase())
    );
  }, [allTypes, search]);

  const handleAddType = (type) => {
    if (!selectedTypes.includes(type)) {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const handleRemoveType = (type) => {
    onTypesChange(selectedTypes.filter(t => t !== type));
  };

  const handleCreateNew = () => {
    if (newType.trim() && !allTypes.includes(newType.trim())) {
      const trimmed = newType.trim();
      setCustomTypes([...customTypes, trimmed]);
      handleAddType(trimmed);
      setNewType('');
      setShowNewInput(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Tipos de Documento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar ou criar tipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-2xl border-gray-200 dark:border-gray-700"
              autoFocus
            />
          </div>

          {/* Selected Types */}
          {selectedTypes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTypes.map(type => (
                <div
                  key={type}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                >
                  {type}
                  <button
                    onClick={() => handleRemoveType(type)}
                    className="hover:opacity-70"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Type Options */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredTypes.map(type => (
              <button
                key={type}
                onClick={() => handleAddType(type)}
                className={`w-full text-left px-4 py-2.5 rounded-xl transition-colors ${
                  selectedTypes.includes(type)
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Create New */}
          {!showNewInput ? (
            <button
              onClick={() => setShowNewInput(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Novo tipo</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Digite novo tipo..."
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateNew();
                  if (e.key === 'Escape') {
                    setShowNewInput(false);
                    setNewType('');
                  }
                }}
                className="rounded-xl border-gray-200 dark:border-gray-700 text-sm"
                autoFocus
              />
              <button
                onClick={handleCreateNew}
                className="px-3 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium text-sm hover:opacity-90"
              >
                Criar
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}