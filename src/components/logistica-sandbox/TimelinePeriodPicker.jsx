import React, { useMemo } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function TimelinePeriodPicker({ range, onChange }) {
  const label = useMemo(() => {
    if (!range?.from && !range?.to) return 'Selecionar período';
    if (range?.from && range?.to) return `${format(range.from, 'dd/MM/yyyy')} → ${format(range.to, 'dd/MM/yyyy')}`;
    if (range?.from) return `${format(range.from, 'dd/MM/yyyy')} → ...`;
    return 'Selecionar período';
  }, [range]);

  const days = useMemo(() => {
    const today = new Date();
    const from = startOfMonth(subMonths(today, 1));
    const to = endOfMonth(addMonths(today, 1));
    return eachDayOfInterval({ from, to });
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 md:p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shadow-sm">
          <CalendarDays className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Período</p>
          <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">Escolha manualmente a janela de tempo</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((day) => {
          const active = range?.from && format(range.from, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
          const isToday = format(new Date(), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
          return (
            <button
              key={format(day, 'yyyy-MM-dd')}
              type="button"
              onClick={() => onChange({ from: day, to: addMonths(day, 0) })}
              className={`flex-shrink-0 rounded-2xl px-3 py-3 shadow-sm min-w-[72px] ${active ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}
            >
              <div className="text-[10px] uppercase tracking-wide opacity-70">{format(day, 'MMM')}</div>
              <div className="text-base font-semibold leading-none mt-1">{format(day, 'dd')}</div>
              <div className="text-[10px] mt-1 opacity-70">{isToday ? 'Hoje' : format(day, 'EEE')}</div>
            </button>
          );
        })}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex-shrink-0 justify-center rounded-2xl border-0 shadow-sm bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 h-[72px] w-[56px] px-0">
              <CalendarDays className="w-4 h-4" />
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