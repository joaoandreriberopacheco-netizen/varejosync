import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Columns, TrendingUp } from 'lucide-react';
import MassTagGenerator from '../produtos/MassTagGenerator';
import { LevelControl } from '../produtos/treegrid/TreeGrid';

export default function ProdutosCommandBar({
  filteredProdutos,
  loadData,
  sortOrder,
  setSortOrder,
  viewMode,
  setViewMode,
  treeLevel,
  setTreeLevel,
  setIsColumnSelectorOpen,
}) {
  return (
    <div className="flex items-center justify-between py-2 flex-none flex-wrap gap-2">
      <div className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-3">
        <span>{filteredProdutos.length} produto{filteredProdutos.length !== 1 ? 's' : ''}</span>
        {filteredProdutos.length > 0 && (
          <>
            <MassTagGenerator products={filteredProdutos} onComplete={loadData} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                  {sortOrder === 'az' ? <TrendingUp className="w-3.5 h-3.5 rotate-90" /> : <TrendingUp className="w-3.5 h-3.5 -rotate-90" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="dark:bg-gray-800 dark:border-gray-700">
                <DropdownMenuItem onClick={() => setSortOrder('az')} className="dark:text-gray-200 dark:hover:bg-gray-700 text-xs">A → Z</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOrder('za')} className="dark:text-gray-200 dark:hover:bg-gray-700 text-xs">Z → A</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
      <div className="hidden md:flex items-center gap-2 flex-wrap">
        {viewMode === 'dinamica' && <LevelControl level={treeLevel} onChange={setTreeLevel} />}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded p-0.5 gap-0.5">
          <button onClick={() => setViewMode('dinamica')} className={`text-[10px] px-2 py-1 rounded transition-colors ${viewMode === 'dinamica' ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm font-medium' : 'text-gray-400 dark:text-gray-500'}`}>Tree Grid</button>
          <button onClick={() => setViewMode('plana')} className={`text-[10px] px-2 py-1 rounded transition-colors ${viewMode === 'plana' ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm font-medium' : 'text-gray-400 dark:text-gray-500'}`}>Plana</button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsColumnSelectorOpen(true)} className="h-7 px-2 text-xs dark:text-gray-300">
          <Columns className="w-3.5 h-3.5 text-gray-700 dark:text-gray-400" />
          <span className="ml-1.5 text-gray-700 dark:text-gray-300">Colunas</span>
        </Button>
      </div>
    </div>
  );
}