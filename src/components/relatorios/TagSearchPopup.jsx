import React, { useMemo, useState } from 'react';
import { X, Search } from 'lucide-react';

export default function TagSearchPopup({ allTags, selectedTags, setSelectedTags, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return allTags;
    return allTags.filter(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, allTags]);
  
  const unselected = filtered.filter(tag => !selectedTags.includes(tag));
  
  return (
    <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 z-50 border border-gray-200 dark:border-gray-700 w-64 max-h-72 overflow-hidden flex flex-col">
      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
          className="w-full pl-7 pr-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Selecionadas</p>
          <div className="flex flex-wrap gap-1">
            {selectedTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded text-xs font-medium hover:opacity-80 transition"
              >
                {tag}
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Available Tags */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {unselected.length > 0 ? (
          unselected.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTags(prev => [...prev, tag])}
              className="w-full text-left px-2 py-1.5 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition"
            >
              {tag}
            </button>
          ))
        ) : (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
            {searchTerm ? 'Nenhuma tag encontrada' : 'Todas selecionadas'}
          </div>
        )}
      </div>
      
      {/* Close Button */}
      <button
        onClick={onClose}
        className="w-full mt-2 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium rounded hover:opacity-90 transition"
      >
        Fechar
      </button>
    </div>
  );
}