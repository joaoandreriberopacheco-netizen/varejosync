import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';

export default function CalendarPopup({ dateRange, setDateRange, onClose, isModal = false }) {
   const [month, setMonth] = useState(new Date());
   const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

   useEffect(() => {
     const handleResize = () => setIsMobile(window.innerWidth < 768);
     window.addEventListener('resize', handleResize);
     return () => window.removeEventListener('resize', handleResize);
   }, []);

   const handlePrevious = () => setMonth(subMonths(month, 1));
   const handleNext = () => setMonth(addMonths(month, 1));
  
  return (
    <div className={`${isModal ? 'w-full' : 'absolute top-full left-0 mt-1 p-4'} rounded-2xl bg-white dark:bg-gray-800 shadow-xl z-50 border border-gray-200 dark:border-gray-700`}>
      <style>{`
        .rdp { margin: 0; --rdp-cell-size: 34px; --rdp-accent-color: #1f2937; --rdp-background-color: #dcfce7; }
        .rdp-caption { display: none; }
        .rdp-months { display: flex; gap: 12px; }
        .rdp-month { margin: 0; }
        .rdp-table { width: 100%; border-collapse: collapse; }
        .rdp-head_cell { color: #6b7280; font-size: 11px; font-weight: 600; padding: 0 0 10px; text-transform: uppercase; }
        .rdp-cell { padding: 0; }
        .rdp-day { width: 34px; height: 34px; font-size: 12px; border-radius: 10px; cursor: pointer; }
        .rdp-day_selected { background-color: #1f2937; color: white; font-weight: 700; }
        .rdp-day_range_middle { background-color: #dcfce7; color: #1f2937; border-radius: 0; }
        .rdp-day_range_start { border-radius: 10px 0 0 10px; }
        .rdp-day_range_end { border-radius: 0 10px 10px 0; }
        .rdp-day_disabled { color: #d1d5db; }
        .dark .rdp { --rdp-accent-color: #f8fafc; --rdp-background-color: #134e4a; }
        .dark .rdp-head_cell { color: #9ca3af; }
        .dark .rdp-day_selected { background-color: #f8fafc; color: #111827; }
        .dark .rdp-day_range_middle { background-color: #134e4a; color: #f8fafc; }
        @media (max-width: 767px) {
          .rdp { --rdp-cell-size: 38px; }
          .rdp-months { display: block; }
          .rdp-day { width: 38px; height: 38px; font-size: 13px; }
        }
      `}</style>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <button onClick={handlePrevious} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>

          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              {isMobile
                ? format(month, 'MMM yyyy', { locale: ptBR })
                : `${format(month, 'MMM', { locale: ptBR })} / ${format(addMonths(month, 1), 'MMM', { locale: ptBR })} ${format(month, 'yyyy')}`}
            </p>
          </div>

          <button onClick={handleNext} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>
        </div>

        <div className={`overflow-x-auto ${isMobile ? '' : 'overflow-visible'}`}>
          <div className="min-w-fit">
            <DayPicker
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
              month={month}
              numberOfMonths={isMobile ? 1 : 2}
              locale={ptBR}
              showOutsideDays={false}
            />
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 text-center text-xs text-gray-600 dark:text-gray-400">
          {dateRange.from ? (
            <p className="font-medium">{format(dateRange.from, 'dd/MM/yyyy')}{dateRange.to ? ` até ${format(dateRange.to, 'dd/MM/yyyy')}` : ''}</p>
          ) : (
            <p>Selecione o período</p>
          )}
        </div>

        <button
          onClick={onClose}
          disabled={!dateRange.from || !dateRange.to}
          className={`w-full py-2.5 rounded-xl font-semibold text-sm transition ${
            dateRange.from && dateRange.to
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          {dateRange.from && dateRange.to ? 'Pronto' : 'Selecione intervalo'}
        </button>
      </div>
    </div>
  );
}