import React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/components/utils";
// imports removed to avoid dependencies

// Simple DateRangePicker using native HTML5 date inputs to avoid dependencies issues
// but styled to look integrated
export function DatePickerWithRange({ className, date, setDate }) {
  const handleFromChange = (e) => {
    const newDate = e.target.value ? new Date(e.target.value) : undefined;
    // Adjust for timezone offset to ensure we get the correct calendar day
    if (newDate) {
        const offset = newDate.getTimezoneOffset();
        newDate.setMinutes(newDate.getMinutes() + offset);
    }
    setDate({ ...date, from: newDate });
  };

  const handleToChange = (e) => {
    const newDate = e.target.value ? new Date(e.target.value) : undefined;
    if (newDate) {
        const offset = newDate.getTimezoneOffset();
        newDate.setMinutes(newDate.getMinutes() + offset);
    }
    setDate({ ...date, to: newDate });
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center gap-2 bg-card border border-border/40 rounded-md p-1">
        <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                <CalendarIcon className="w-4 h-4" />
            </span>
            <input autoComplete="off" 
                type="date"
                className="w-full pl-8 pr-2 py-1 text-sm bg-transparent border-none focus:ring-0 outline-none text-foreground/90"
                value={date?.from ? format(date.from, 'yyyy-MM-dd') : ''}
                onChange={handleFromChange}
                placeholder="Início"
            />
        </div>
        <span className="text-muted-foreground">-</span>
        <div className="relative flex-1">
            <input autoComplete="off" 
                type="date"
                className="w-full px-2 py-1 text-sm bg-transparent border-none focus:ring-0 outline-none text-foreground/90 text-right"
                value={date?.to ? format(date.to, 'yyyy-MM-dd') : ''}
                onChange={handleToChange}
                placeholder="Fim"
            />
        </div>
      </div>
    </div>
  );
}