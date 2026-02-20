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
      cells.push(<div key={`empty-${i}`} className="w-9 h-9" />);
    }
    
    days.forEach(day => {
      const inRange = isInRange(day);
      const isStartDay = start && isSameDay(day, start);
      const isEndDay = end && isSameDay(day, end);
      
      cells.push(
        <button
          key={day.toString()}
          onClick={() => handleSelectDate(day)}
          className={`w-9 h-9 text-xs font-medium rounded transition flex items-center justify-center ${
            isStartDay || isEndDay
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : inRange
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          {format(day, 'd')}
        </button>
      );
    });
    
    return cells;
  };
  
  return (
    <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50 border border-gray-200 dark:border-gray-700 w-auto">
      {/* Dois meses lado a lado */}
      <div className="grid grid-cols-2 gap-6 mb-4">
        {/* Mês 1 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-200" />
            </button>
            <div className="text-sm font-semibold text-gray-900 dark:text-white text-center flex-1">
              {format(month1, 'MMMM', { locale: ptBR })}
            </div>
            <div className="w-6" />
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center py-1 w-9 h-6">
                {day.substring(0, 1)}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar(month1)}
          </div>
        </div>
        
        {/* Mês 2 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="w-6" />
            <div className="text-sm font-semibold text-gray-900 dark:text-white text-center flex-1">
              {format(month2, 'MMMM', { locale: ptBR })}
            </div>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
            >
              <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-200" />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center py-1 w-9 h-6">
                {day.substring(0, 1)}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar(month2)}
          </div>
        </div>
      </div>
      
      {/* Range selecionado */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 mb-3 text-center">
        <p>{format(start, 'dd/MM/yyyy')}{end ? ` - ${format(end, 'dd/MM/yyyy')}` : ' (selecione o final)'}</p>
      </div>
      
      <button
        onClick={onClose}
        disabled={!end}
        className={`w-full py-2 rounded-lg font-medium transition ${
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