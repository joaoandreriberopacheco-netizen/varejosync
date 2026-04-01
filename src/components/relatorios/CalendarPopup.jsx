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
    <div className={`${isModal ? '' : 'absolute top-full left-0 mt-1'} bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-200 dark:border-gray-700 ${isModal ? '' : 'p-4'}`}>
      <div className={isModal ? 'flex flex-col md:flex-row gap-6 p-6' : ''}>
       {/* Navigation */}
       <div className="flex items-center justify-between mb-3 px-1">
         <button onClick={handlePrevious} className="p-2 md:p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition flex-shrink-0">
           <ChevronLeft className="w-5 md:w-6 h-5 md:h-6 text-gray-700 dark:text-gray-200" />
         </button>
         <span className="text-xs md:text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide text-center flex-1 px-2">
           {isMobile ? (
             format(month, 'MMM yyyy', { locale: ptBR })
           ) : (
             <>
               {format(month, 'MMM', { locale: ptBR })} / {format(addMonths(month, 1), 'MMM', { locale: ptBR })} {format(month, 'yyyy')}
             </>
           )}
         </span>
         <button onClick={handleNext} className="p-2 md:p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition flex-shrink-0">
           <ChevronRight className="w-5 md:w-6 h-5 md:h-6 text-gray-700 dark:text-gray-200" />
         </button>
       </div>

      <style>{`
         .rdp { margin: 0; --rdp-cell-size: 32px; --rdp-accent-color: #1f2937; --rdp-background-color: #f0f9f0; pointer-events: auto !important; }
         @media (max-width: 767px) {
           .rdp { --rdp-cell-size: 36px; }
         }
         .rdp-caption { display: none; }
         .rdp-head_cell { color: #6b7280; font-size: 11px; font-weight: 600; }
         .rdp-cell { padding: 0; pointer-events: auto !important; }
         .rdp-day { font-size: 12px; pointer-events: auto !important; cursor: pointer; }
         @media (max-width: 767px) {
           .rdp-day { font-size: 13px; }
         }
         .rdp-day_selected { background-color: #1f2937; color: white; font-weight: bold; }
         .rdp-day_range_middle { background-color: #dcfce7; color: #1f2937; }
         .rdp-day_disabled { color: #d1d5db; }
         .dark .rdp-day_selected { background-color: white; color: #1f2937; }
         .dark .rdp-day_range_middle { background-color: #134e4a; color: white; }
         .dark .rdp-head_cell { color: #9ca3af; }
       `}</style>
      
      {/* Calendar - Single on mobile, dual on desktop */}
       <div className={isMobile ? 'flex flex-col' : 'flex'}>
         <DayPicker
           mode="range"
           selected={{ from: dateRange.from, to: dateRange.to }}
           onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
           month={month}
           locale={ptBR}
           showOutsideDays={false}
         />
         {!isMobile && (
           <>
             <div className="w-px bg-gray-200 dark:bg-gray-600 mx-1 self-stretch" />
             <DayPicker
               mode="range"
               selected={{ from: dateRange.from, to: dateRange.to }}
               onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
               month={addMonths(month, 1)}
               locale={ptBR}
               showOutsideDays={false}
             />
           </>
         )}
       </div>

      {/* Info */}
      <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 text-center">
        {dateRange.from ? (
          <p className="font-medium">{format(dateRange.from, 'dd/MM/yyyy')}{dateRange.to ? ` até ${format(dateRange.to, 'dd/MM/yyyy')}` : ''}</p>
        ) : (
          <p>Selecione o período</p>
        )}
      </div>

      <button
        onClick={onClose}
        disabled={!dateRange.from || !dateRange.to}
        className={`w-full py-2.5 md:py-2.5 mt-2 md:mt-3 rounded-lg font-semibold text-sm transition ${             
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