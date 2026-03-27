import React, { useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function SearchableFilterSelect({
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  options,
  className
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedLabel = useMemo(() => {
    return options.find((option) => option.value === value)?.label || placeholder;
  }, [options, value, placeholder]);

  const filteredOptions = useMemo(() => {
    const normalized = query.toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, query]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className={cn(
          'w-full h-12 px-4 rounded-xl justify-between bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-slate-700 border-0 shadow-none',
          className
        )}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className="w-4 h-4 opacity-60" />
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="border-0 rounded-t-[28px] bg-white dark:bg-slate-900 px-4 pb-6">
          <DrawerHeader className="px-0 pb-3 text-left">
            <DrawerTitle className="font-glacial text-gray-900 dark:text-white">{placeholder}</DrawerTitle>
          </DrawerHeader>

          <div className="space-y-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-12 rounded-xl border-0 bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />

            <div className="max-h-[48vh] overflow-y-auto space-y-1 rounded-2xl bg-gray-50 dark:bg-slate-950/40 p-2">
              {filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={cn(
                      'w-full flex items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition-colors',
                      isSelected
                        ? 'bg-slate-200 dark:bg-slate-800 text-gray-900 dark:text-white'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-800/80'
                    )}
                  >
                    <span>{option.label}</span>
                    {isSelected && <Check className="w-4 h-4" />}
                  </button>
                );
              })}

              {filteredOptions.length === 0 && (
                <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Nenhum resultado encontrado.
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}