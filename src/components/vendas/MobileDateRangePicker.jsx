import React, { useMemo, useState } from 'react';
import { addMonths, format, setMonth, setYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Calendar } from '@/components/ui/calendar';

const MONTHS = Array.from({ length: 12 }, (_, index) => ({
  value: index,
  label: format(new Date(2026, index, 1), 'MMMM', { locale: ptBR }),
}));

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
  return format(date, 'dd MMM yyyy', { locale: ptBR });
};

const createYears = (centerYear) => {
  const start = Math.floor(centerYear / 10) * 10;
  return Array.from({ length: 12 }, (_, index) => start - 1 + index);
};

function MonthPanel({ monthDate, onPrev, onNext, onSelectDay, start, end, mode, setMode, onPickMonth, onPickYear }) {
  const years = createYears(monthDate.getFullYear());

  return (
    <div className="rounded-3xl bg-gray-50 dark:bg-slate-950/60 p-3 shadow-sm min-w-[300px]">
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          type="button"
          onClick={onPrev}
          className="h-9 w-9 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-100 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode(mode === 'months' ? 'days' : 'months')}
            className="px-3 py-1.5 rounded-full text-sm font-medium text-gray-900 dark:text-white bg-gray-200 dark:bg-slate-800 capitalize"
          >
            {format(monthDate, 'MMMM', { locale: ptBR })}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === 'years' ? 'days' : 'years')}
            className="px-3 py-1.5 rounded-full text-sm font-medium text-gray-900 dark:text-white bg-gray-200 dark:bg-slate-800"
          >
            {format(monthDate, 'yyyy')}
          </button>
        </div>

        <button
          type="button"
          onClick={onNext}
          className="h-9 w-9 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-100 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {mode === 'days' && (
        <Calendar
          mode="range"
          month={monthDate}
          selected={{ from: start, to: end }}
          onDayClick={onSelectDay}
          locale={ptBR}
          className="p-0"
          classNames={{
            months: 'flex',
            month: 'space-y-4 w-full',
            caption: 'hidden',
            table: 'w-full border-collapse',
            head_cell: 'text-gray-500 dark:text-gray-400 rounded-md w-10 font-normal text-[0.8rem]',
            row: 'flex w-full mt-2',
            cell: 'h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-slate-200 dark:[&:has([aria-selected])]:bg-slate-800',
            day: 'h-10 w-10 p-0 rounded-full font-normal text-gray-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-slate-800',
            day_selected: 'bg-slate-900 text-white hover:bg-slate-900 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-200',
            day_today: 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white',
            day_range_middle: 'aria-selected:bg-slate-200 aria-selected:text-slate-900 dark:aria-selected:bg-slate-800 dark:aria-selected:text-white',
            day_outside: 'text-gray-300 dark:text-gray-600 opacity-50',
          }}
        />
      )}

      {mode === 'months' && (
        <div className="grid grid-cols-3 gap-2 pt-2">
          {MONTHS.map((month) => (
            <button
              key={month.value}
              type="button"
              onClick={() => onPickMonth(month.value)}
              className={`h-11 rounded-2xl text-sm capitalize ${monthDate.getMonth() === month.value ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-200'}`}
            >
              {month.label}
            </button>
          ))}
        </div>
      )}

      {mode === 'years' && (
        <div className="grid grid-cols-3 gap-2 pt-2">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => onPickYear(year)}
              className={`h-11 rounded-2xl text-sm ${monthDate.getFullYear() === year ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-200'}`}
            >
              {year}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MobileDateRangePicker({ startDate, endDate, onApply, onClear }) {
  const [open, setOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [leftMonth, setLeftMonth] = useState(toDate(startDate) || new Date());
  const [leftMode, setLeftMode] = useState('days');
  const [rightMode, setRightMode] = useState('days');

  const rightMonth = useMemo(() => addMonths(leftMonth, 1), [leftMonth]);
  const start = useMemo(() => toDate(tempStart), [tempStart]);
  const end = useMemo(() => toDate(tempEnd), [tempEnd]);

  const handleOpen = () => {
    const baseMonth = toDate(startDate) || new Date();
    setTempStart(startDate);
    setTempEnd(endDate);
    setLeftMonth(baseMonth);
    setLeftMode('days');
    setRightMode('days');
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
          <CalendarDays className="w-4 h-4 opacity-80" />
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
                <MonthPanel
                  monthDate={leftMonth}
                  onPrev={() => setLeftMonth(addMonths(leftMonth, -1))}
                  onNext={() => setLeftMonth(addMonths(leftMonth, 1))}
                  onSelectDay={handleSelectDay}
                  start={start}
                  end={end}
                  mode={leftMode}
                  setMode={setLeftMode}
                  onPickMonth={(month) => {
                    setLeftMonth(setMonth(leftMonth, month));
                    setLeftMode('days');
                  }}
                  onPickYear={(year) => {
                    setLeftMonth(setYear(leftMonth, year));
                    setLeftMode('months');
                  }}
                />
                <MonthPanel
                  monthDate={rightMonth}
                  onPrev={() => setLeftMonth(addMonths(leftMonth, -1))}
                  onNext={() => setLeftMonth(addMonths(leftMonth, 1))}
                  onSelectDay={handleSelectDay}
                  start={start}
                  end={end}
                  mode={rightMode}
                  setMode={setRightMode}
                  onPickMonth={(month) => {
                    const updated = setMonth(rightMonth, month);
                    setLeftMonth(addMonths(updated, -1));
                    setRightMode('days');
                  }}
                  onPickYear={(year) => {
                    const updated = setYear(rightMonth, year);
                    setLeftMonth(addMonths(updated, -1));
                    setRightMode('months');
                  }}
                />
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