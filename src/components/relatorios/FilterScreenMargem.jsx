import React, { useState, useMemo } from 'react';
import { X, Calendar } from 'lucide-react';
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
  const [tagSearch, setTagSearch] = useState('');

  const filteredTags = useMemo(() => {
    return allTags
      .filter(tag => tag.toLowerCase().includes(tagSearch.toLowerCase()) && !selectedTags.includes(tag));
  }, [tagSearch, allTags, selectedTags]);

  const categories = [...new Set(products.map(p => p.categoria_nome).filter(Boolean))];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
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

        <div className="space-y-6">
          {/* Data Range */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <label className="text-lg font-semibold text-gray-900 dark:text-white">Período</label>
            </div>
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          </div>

          {/* Categories */}
          <div>
            <label className="text-lg font-semibold text-gray-900 dark:text-white block mb-4">Categorias</label>
            <div className="space-y-3">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full py-3 px-4 rounded-lg font-medium transition text-left ${
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
                  className={`w-full py-3 px-4 rounded-lg font-medium transition text-left ${
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

          {/* Tags */}
          {allTags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <label className="text-lg font-semibold text-gray-900 dark:text-white">Tags</label>
              </div>

              {/* Search Input */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Procurar tags..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Selected Tags - Horizontal Stack */}
              {selectedTags.length > 0 && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex flex-wrap gap-2 justify-end">
                    {selectedTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                        className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-80 transition"
                      >
                        {tag}
                        <X className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Tags */}
              <div className="space-y-2">
                {filteredTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedTags(prev => [...prev, tag]);
                      setTagSearch('');
                    }}
                    className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition text-left font-medium"
                  >
                    {tag}
                  </button>
                ))}
                {tagSearch && filteredTags.length === 0 && (
                  <p className="text-center py-4 text-gray-500 dark:text-gray-400">Nenhuma tag encontrada</p>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={onClose}
            className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-bold text-lg hover:opacity-90 transition mt-8"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}