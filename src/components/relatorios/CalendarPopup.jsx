import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';

export default function CalendarPopup({ dateRange, setDateRange, onClose }) {
  const [month, setMonth] = useState(new Date());
  
  const handleSelect = (day) => {
    const start = dateRange.from;
    const end = dateRange.to;
    
    if (!start || (start && end)) {
      // Novo intervalo começando
      setDateRange({ from: day, to: undefined });
    } else {
      // Completar intervalo
      const newStart = day < start ? day : start;
      const newEnd = day < start ? start : day;
      setDateRange({ from: newStart, to: newEnd });
    }
  };
  
  const handlePrevious = () => setMonth(subMonths(month, 2));
  const handleNext = () => setMonth(addMonths(month, 2));
  
  return (
    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 z-50 border border-gray-200 dark:border-gray-700 w-80 min-w-max">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevious}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {format(month, 'MMM', { locale: ptBR })} / {format(addMonths(month, 1), 'MMM', { locale: ptBR })} {format(month, 'yyyy')}
        </span>
        <button
          onClick={handleNext}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        >
          <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>
      </div>

      {/* Calendário */}
      <style>{`
        .rdp {
          margin: 0;
          --rdp-cell-size: 28px;
          --rdp-accent-color: #1f2937;
          --rdp-background-color: #f0f9f0;
        }
        .rdp-caption { display: none; }
        .rdp-head_cell { color: #6b7280; font-size: 12px; font-weight: 600; }
        .rdp-cell { padding: 0; }
        .rdp-day { font-size: 12px; }
        .rdp-day_selected { background-color: #1f2937; color: white; font-weight: bold; }
        .rdp-day_range_middle { background-color: #dcfce7; color: #1f2937; }
        .rdp-day_disabled { color: #d1d5db; }
        .dark .rdp-day_selected { background-color: white; color: #1f2937; }
        .dark .rdp-day_range_middle { background-color: #134e4a; color: white; }
        .dark .rdp-head_cell { color: #9ca3af; }
      `}</style>
      
      <div className="flex gap-2">
        <DayPicker
          mode="range"
          selected={{ from: dateRange.from, to: dateRange.to }}
          onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
          month={month}
          locale={ptBR}
          showOutsideDays={false}
        />
        <DayPicker
          mode="range"
          selected={{ from: dateRange.from, to: dateRange.to }}
          onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
          month={addMonths(month, 1)}
          locale={ptBR}
          showOutsideDays={false}
        />
      </div>

      {/* Info */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 text-center font-medium">
        {dateRange.from ? (
          <>
            <p>{format(dateRange.from, 'dd/MM/yyyy')}{dateRange.to ? ` até ${format(dateRange.to, 'dd/MM/yyyy')}` : ''}</p>
          </>
        ) : (
          <p>Selecione o período</p>
        )}
      </div>

      {/* Button */}
      <button
        onClick={onClose}
        disabled={!dateRange.from || !dateRange.to}
        className={`w-full py-2.5 mt-3 rounded-lg font-semibold text-sm transition ${
          dateRange.from && dateRange.to
            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
        }`}
      >
        {dateRange.from && dateRange.to ? 'Pronto' : 'Selecione intervalo'}
      </button>
    </div>
  );
}