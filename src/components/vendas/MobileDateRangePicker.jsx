import React, { useMemo, useState } from 'react';
import { format, addMonths, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Calendar } from '@/components/ui/calendar';

const toDate = (value) => {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const toValue = (date) => {
  if (!date) return '';
  return format(date, 'yyyy-MM-dd');
};

const formatLabel = (date) => {
  if (!date) return 'Selecionar';
  return format(date, "dd MMM yyyy", { locale: ptBR });
};

export default function MobileDateRangePicker({ startDate, endDate, onApply, onClear }) {
  const [open, setOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const start = useMemo(() => toDate(tempStart), [tempStart]);
  const end = useMemo(() => toDate(tempEnd), [tempEnd]);

  const handleOpen = () => {
    setTempStart(startDate);
    setTempEnd(endDate);
    setOpen(true);
  };

  const handleSelectDay = (date) => {
    const picked = toValue(date);

    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(picked);
      setTempEnd('');
      return;
    }

    if (tempStart && !tempEnd) {
      if (date < toDate(tempStart)) {
        setTempEnd(tempStart);
        setTempStart(picked);
      } else {
        setTempEnd(picked);
      }
    }
  };

  const summary = startDate && endDate
    ? `${formatLabel(toDate(startDate))} - ${formatLabel(toDate(endDate))}`
    : startDate
      ? `${formatLabel(toDate(startDate))} - ...`
      : 'Período';

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={handleOpen}
        className="w-full h-12 rounded-2xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 justify-between px-4 text-gray-700 dark:text-gray-100"
      >
        <span className="flex items-center gap-2 truncate">
          <CalendarDays className="w-4 h-4 opacity-70" />
          <span className="truncate">{summary}</span>
        </span>
      </Button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="border-0 rounded-t-[28px] bg-white dark:bg-slate-900 px-4 pb-6">
          <DrawerHeader className="px-0 pb-2 text-left">
            <DrawerTitle className="font-glacial text-gray-900 dark:text-white">Período</DrawerTitle>
          </DrawerHeader>

          <div className="space-y-4">
            <div className="rounded-2xl bg-gray-100 dark:bg-slate-800 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400 mb-2">Ida e volta</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-500 dark:text-gray-400 mb-1">De</div>
                  <div className="font-medium text-gray-900 dark:text-white">{formatLabel(start)}</div>
                </div>
                <div>
                  <div className="text-gray-500 dark:text-gray-400 mb-1">Até</div>
                  <div className="font-medium text-gray-900 dark:text-white">{formatLabel(end)}</div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4 min-w-max">
                {[0, 1].map((offset) => (
                  <div key={offset} className="rounded-2xl bg-gray-50 dark:bg-slate-950/50 p-3 shadow-sm">
                    <Calendar
                      mode="range"
                      month={addMonths(new Date(), offset)}
                      selected={{ from: start, to: end }}
                      onDayClick={handleSelectDay}
                      locale={ptBR}
                      className="p-0"
                      classNames={{
                        months: 'flex',
                        month: 'space-y-4 min-w-[280px]',
                        caption: 'flex justify-center pt-1 relative items-center mb-2',
                        caption_label: 'text-sm font-medium text-gray-900 dark:text-white',
                        nav_button: 'h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 border-0',
                        table: 'w-full border-collapse',
                        head_cell: 'text-gray-400 rounded-md w-9 font-normal text-[0.8rem]',
                        cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-slate-200 dark:[&:has([aria-selected])]:bg-slate-800',
                        day: 'h-9 w-9 p-0 rounded-full font-normal text-gray-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-slate-800',
                        day_selected: 'bg-slate-900 text-white hover:bg-slate-900 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-200',
                        day_today: 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white',
                        day_range_middle: 'aria-selected:bg-slate-200 aria-selected:text-slate-900 dark:aria-selected:bg-slate-800 dark:aria-selected:text-white',
                        day_outside: 'text-gray-300 dark:text-gray-600 opacity-50',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 h-11 rounded-2xl text-gray-500 dark:text-gray-400"
                onClick={() => {
                  setTempStart('');
                  setTempEnd('');
                  onClear();
                  setOpen(false);
                }}
              >
                Limpar
              </Button>
              <Button
                type="button"
                className="flex-1 h-11 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
                onClick={() => {
                  onApply(tempStart, tempEnd);
                  setOpen(false);
                }}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}