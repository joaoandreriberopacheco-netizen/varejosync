import React from 'react';
import { CalendarDays } from 'lucide-react';

export default function TimelineDatePicker({ value, onChange, compact = false }) {
  return (
    <div className={`bg-card rounded-3xl shadow-sm ${compact ? 'p-4' : 'p-5'}`}>
      <div className={`flex items-center gap-3 ${compact ? 'mb-2' : 'mb-3'}`}>
        <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center shadow-sm">
          <CalendarDays className="w-5 h-5 text-foreground/90" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Simulador</p>
          <p className="text-sm text-foreground dark:text-foreground font-medium">Ver situação em uma data projetada</p>
        </div>
      </div>
      <input autoComplete="off"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl bg-muted/40 dark:bg-muted border-0 shadow-sm px-4 py-3 text-sm text-foreground dark:text-foreground"
      />
    </div>
  );
}