import React, { useMemo } from 'react';
import { addDays, format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const quickOptions = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
  { label: '180 dias', days: 180 },
];

export default function TimelinePeriodPicker({ range, onChange }) {
  const label = useMemo(() => {
    if (!range?.from && !range?.to) return 'Selecionar período';
    if (range?.from && range?.to) return `${format(range.from, 'dd/MM/yyyy')} → ${format(range.to, 'dd/MM/yyyy')}`;
    if (range?.from) return `${format(range.from, 'dd/MM/yyyy')} → ...`;
    return 'Selecionar período';
  }, [range]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shadow-sm">
          <CalendarDays className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Período</p>
          <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">Escolha manualmente a janela de tempo</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickOptions.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onChange({ from: new Date(), to: addDays(new Date(), option.days) })}
            className="px-3 py-2 rounded-2xl bg-gray-50 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-300 shadow-sm"
          >
            {option.label}
          </button>
        ))}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start rounded-2xl border-0 shadow-sm bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 h-10 px-3">
              <CalendarDays className="w-4 h-4 mr-2" />
              Calendário
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0 rounded-3xl border-0 shadow-xl bg-white dark:bg-gray-800">
            <Calendar
              mode="range"
              numberOfMonths={typeof window !== 'undefined' && window.innerWidth >= 1024 ? 2 : 1}
              selected={range}
              onSelect={onChange}
              className="rounded-3xl"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="text-sm text-gray-900 dark:text-gray-100">{label}</div>
    </div>
  );
}