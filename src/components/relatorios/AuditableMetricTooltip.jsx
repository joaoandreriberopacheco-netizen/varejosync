import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

const cardBase =
  'rounded-2xl border border-border/40 bg-card/40 shadow-sm transition-shadow hover:shadow-md';

const cardProfit =
  'rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/90 dark:bg-emerald-950/25 shadow-sm';

export default function AuditableMetricTooltip({
  label,
  value,
  auditData,
  icon: Icon,
  variant = 'default',
  className = '',
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const surface = variant === 'profit' ? cardProfit : cardBase;

  if (!auditData) {
    return (
      <div className={`${surface} p-3 md:p-4 ${className}`}>
        <div className="flex items-start gap-2 mb-1">
          {Icon ? (
            <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          ) : null}
          <p className="text-[9px] md:text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            {label}
          </p>
        </div>
        <p
          className={`text-sm md:text-lg font-semibold tabular-nums truncate ${
            variant === 'profit'
              ? 'text-green-700 dark:text-green-400'
              : 'text-foreground'
          }`}
        >
          {value}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div
        className={`${surface} p-3 md:p-4 cursor-help`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              {Icon ? (
                <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0" />
              ) : null}
              <p className="text-[9px] md:text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                {label}
              </p>
            </div>
            <p className="text-sm md:text-lg font-semibold text-foreground tabular-nums truncate">
              {value}
            </p>
          </div>
          <HelpCircle className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0 text-muted-foreground dark:text-muted-foreground mt-0.5" />
        </div>
      </div>

      {showTooltip && (
        <div className="absolute bottom-full left-0 right-0 sm:left-auto sm:right-0 sm:w-64 mb-2 z-50 bg-card border border-border/40 rounded-xl shadow-lg p-3 text-xs">
          <p className="font-semibold text-foreground mb-2">{label} — Detalhes</p>
          <div className="space-y-1.5 text-foreground/90">
            {Object.entries(auditData).map(([key, val]) => (
              <div key={key} className="flex justify-between gap-2">
                <span className="capitalize text-muted-foreground">{key.replace(/_/g, ' ')}:</span>
                <span className="font-mono font-semibold text-foreground text-right">{val}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-border/40">
            <div className="flex justify-between gap-2 font-semibold">
              <span className="text-foreground">Total:</span>
              <span className="font-mono text-foreground text-right">{value}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
