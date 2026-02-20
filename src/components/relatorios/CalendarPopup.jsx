import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CalendarPopup({ dateRange, setDateRange, onClose }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoverEnd, setHoverEnd] = useState(null);
  
  const start = dateRange.from;
  const end = dateRange.to;
  
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  
  const handleSelectDate = (day) => {
    if (!start || (start && end)) {
      setDateRange({ from: day, to: day });
    } else {
      const newEnd = day < start ? start : day;
      const newStart = day < start ? day : start;
      setDateRange({ from: newStart, to: newEnd });
      setHoverEnd(null);
    }
  };
  
  const isInRange = (day) => {
    if (!start || !end) return false;
    return isWithinInterval(day, { start, end });
  };
  
  const isStart = start && isSameDay(day, start);
  const isEnd = end && isSameDay(day, end);
  
  const renderCalendar = () => {
    const firstDay = days[0].getDay();
    const cells = [];
    
    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} />);
    }
    
    // Days
    days.forEach(day => {
      const inRange = isInRange(day);
      const isStartDay = start && isSameDay(day, start);
      const isEndDay = end && isSameDay(day, end);
      
      cells.push(
        <button
          key={day.toString()}
          onClick={() => handleSelectDate(day)}
          onMouseEnter={() => !end && setHoverEnd(day)}
          onMouseLeave={() => setHoverEnd(null)}
          className={`p-2 text-sm font-medium rounded transition ${
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
    <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50 border border-gray-200 dark:border-gray-700">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
        >
          <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-200" />
        </button>
        <div className="text-sm font-semibold text-gray-900 dark:text-white">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </div>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
        >
          <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-200" />
        </button>
      </div>
      
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center py-1">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {renderCalendar()}
      </div>
      
      {/* Date Display */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
        <p>{format(start, 'dd/MM/yyyy', { locale: ptBR })} - {format(end, 'dd/MM/yyyy', { locale: ptBR })}</p>
      </div>
      
      {/* Close Button */}
      <button
        onClick={onClose}
        className="w-full mt-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:opacity-90 transition"
      >
        Pronto
      </button>
    </div>
  );
}