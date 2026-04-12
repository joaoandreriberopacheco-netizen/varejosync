import React, { useState, useMemo } from 'react';
import { X, Search, Calendar, ChevronLeft } from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';

export default function FilterScreenMargem({ 
  dateRange, 
  setDateRange, 
  selectedCategory, 
  setSelectedCategory,
  selectedTags,
  setSelectedTags,
  products,
  allTags,
  onClose 
}) {
  const [currentStep, setCurrentStep] = useState('main'); // main, tags
  const [tagSearch, setTagSearch] = useState('');

  const filteredTags = useMemo(() => {
    return allTags.filter(tag => 
      tag.toLowerCase().includes(tagSearch.toLowerCase()) && !selectedTags.includes(tag)
    );
  }, [tagSearch, allTags, selectedTags]);

  const categories = [...new Set(products.map(p => p.categoria_nome).filter(Boolean))];

  if (currentStep === 'tags') {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentStep('main')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>
          <h1 className="text-xl font-glacial font-semibold text-gray-900 dark:text-white">Tags</h1>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>
        </div>

        <div className="flex-1 flex flex-col">
          {/* Search Input */}
          <div className="relative mb-6">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input autoComplete="off"
              type="text"
              placeholder="Procurar tags..."
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-base text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase">SELECIONADAS</p>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                    className="px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-80 transition"
                  >
                    {tag}
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filtered Tags - Large Buttons */}
          {filteredTags.length > 0 && (
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {filteredTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTags(prev => [...prev, tag])}
                    className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tagSearch && filteredTags.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400 text-center">
              Nenhuma tag encontrada
            </div>
          )}

          {!tagSearch && filteredTags.length === 0 && selectedTags.length === allTags.length && (
            <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400 text-center">
              Todas as tags selecionadas
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={() => setCurrentStep('main')}
          className="w-full mt-6 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-bold text-base hover:opacity-90 transition"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-glacial font-semibold text-gray-900 dark:text-white">Filtros</h1>
        <button
          onClick={onClose}
          className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        >
          <X className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="space-y-4">
          {/* Period Button */}
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 block mb-3 uppercase">Período</label>
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          </div>

          {/* Categories Section */}
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 block mb-3 uppercase">Categorias</label>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full py-4 px-4 rounded-lg font-bold text-base transition ${
                  selectedCategory === 'all'
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Todas
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full py-4 px-4 rounded-lg font-bold text-base transition text-left ${
                    selectedCategory === cat
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tags Button */}
          {allTags.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 block mb-3 uppercase">Tags</label>
              <button
                onClick={() => setCurrentStep('tags')}
                className="w-full py-4 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-bold text-base transition flex items-center justify-between"
              >
                <span>{selectedTags.length > 0 ? `${selectedTags.length} selecionada${selectedTags.length !== 1 ? 's' : ''}` : 'Selecionar tags'}</span>
                <ChevronLeft className="w-5 h-5 rotate-180" />
              </button>
              
              {/* Selected Tags Display */}
              {selectedTags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                      className="px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-xs font-medium flex items-center gap-2 hover:opacity-80 transition"
                    >
                      {tag}
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={onClose}
        className="w-full mt-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-bold text-base hover:opacity-90 transition"
      >
        Aplicar Filtros
      </button>
    </div>
  );
}