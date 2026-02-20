import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CalendarPopup({ dateRange, setDateRange, onClose }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tempStart, setTempStart] = useState(dateRange.from);
  
  const start = tempStart;
  const end = dateRange.to;
  
  const month1 = currentMonth;
  const month2 = addMonths(currentMonth, 1);
  
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  
  const handleSelectDate = (day) => {
    if (!start) {
      setTempStart(day);
    } else {
      const newStart = day < start ? day : start;
      const newEnd = day < start ? start : day;
      setDateRange({ from: newStart, to: newEnd });
      setTempStart(newStart);
    }
  };
  
  const isInRange = (day) => {
    if (!start) return false;
    if (!end) return isSameDay(day, start);
    return isWithinInterval(day, { start, end });
  };
  
  const renderCalendar = (monthDate) => {
    const days = eachDayOfInterval({ start: startOfMonth(monthDate), end: endOfMonth(monthDate) });
    const firstDay = days[0].getDay();
    const cells = [];
    
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} />);
    }
    
    days.forEach(day => {
      const inRange = isInRange(day);
      const isStartDay = start && isSameDay(day, start);
      const isEndDay = end && isSameDay(day, end);
      
      cells.push(
        <button
          key={day.toString()}
          onClick={() => handleSelectDate(day)}
          className={`p-1.5 text-xs font-medium rounded transition h-8 ${
            isStartDay || isEndDay
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : inRange
              ? 'bg-green-100 dark:bg-green-900/30 text-gray-900 dark:text-green-300'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {format(day, 'd')}
        </button>
      );
    });
    
    return cells;
  };
  
  return (
    <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-5 z-50 border border-gray-200 dark:border-gray-700 w-auto max-w-2xl">
      {/* Navegação superior */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">
          {format(month1, 'MMMM', { locale: ptBR })} / {format(month2, 'MMMM', { locale: ptBR })}
        </div>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        >
          <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>
      </div>

      {/* Dois meses lado a lado */}
      <div className="grid grid-cols-2 gap-8 mb-4">
        {/* Mês 1 */}
        <div>
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center mb-2">
            {format(month1, 'MMMM yyyy', { locale: ptBR })}
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center py-1 w-7">
                {day[0]}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar(month1)}
          </div>
        </div>
        
        {/* Mês 2 */}
        <div>
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center mb-2">
            {format(month2, 'MMMM yyyy', { locale: ptBR })}
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center py-1 w-7">
                {day[0]}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar(month2)}
          </div>
        </div>
      </div>
      
      {/* Range selecionado */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 mb-3 text-center font-medium">
        <p>{format(start, 'dd/MM/yyyy')}{end ? ` até ${format(end, 'dd/MM/yyyy')}` : ' (selecione o final)'}</p>
      </div>
      
      <button
        onClick={onClose}
        disabled={!end}
        className={`w-full py-2.5 rounded-lg font-semibold text-sm transition ${
          end 
            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90' 
            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
        }`}
      >
        {end ? 'Pronto' : 'Selecione intervalo'}
      </button>
    </div>
  );
}