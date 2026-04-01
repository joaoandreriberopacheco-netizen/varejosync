import React, { useState } from 'react';
import { ChevronDown, Type, TrendingUp, DollarSign, Percent, Scale } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function SortSelector({ sortField, setSortField, sortOrder, setSortOrder }) {
  const [isOpen, setIsOpen] = useState(false);

  const sortOptions = [
    { field: 'nome', label: 'Nome', icon: Type },
    { field: 'lucro_total', label: 'Lucro', icon: DollarSign },
    { field: 'total_recebido', label: 'Receita', icon: TrendingUp },
    { field: 'markup_percentual', label: 'Markup %', icon: Percent },
    { field: 'margem_percentual', label: 'Margem %', icon: Scale }
  ];

  const currentOption = sortOptions.find(opt => opt.field === sortField);
  const CurrentIcon = currentOption?.icon || Type;

  const handleFieldChange = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'nome' ? 'asc' : 'desc');
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="w-full flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition">
          <div className="flex items-center gap-2.5">
            <CurrentIcon className="w-4 h-4 md:w-5 md:h-5 text-gray-700 dark:text-gray-300" />
            <span className="text-sm md:text-base font-medium text-gray-900 dark:text-white">{currentOption?.label}</span>
            {sortField !== 'nome' && (
              <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                {sortOrder === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
          <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="space-y-1">
          {sortOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.field}
                onClick={() => {
                  handleFieldChange(opt.field);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition rounded-md ${
                  sortField === opt.field
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{opt.label}</span>
                {sortField === opt.field && (
                  <span className="text-xs font-bold text-gray-500">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        
        {sortField === 'nome' && (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            <div className="p-1 space-y-1">
              <button
                onClick={() => {
                  setSortOrder('asc');
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-sm rounded-md transition ${
                  sortOrder === 'asc'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                A → Z
              </button>
              <button
                onClick={() => {
                  setSortOrder('desc');
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-sm rounded-md transition ${
                  sortOrder === 'desc'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                Z → A
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}