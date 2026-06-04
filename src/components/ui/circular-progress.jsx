import React from 'react';

export function CircularProgress({ value, max, currentBatch, totalBatches, processedItems, totalItems }) {
  const safeValue = Math.min(value || 0, max || 1);
  const safeMax = max || 1;
  const percentage = Math.min(100, Math.max(0, (safeValue / safeMax) * 100));
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="relative">
        <svg className="w-32 h-32 transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted-foreground dark:text-foreground/90"
          />
          {/* Progress circle */}
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-indigo-600 dark:text-indigo-500 transition-all duration-300"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-semibold text-foreground">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground/90">
          Lote {currentBatch} de {totalBatches}
        </p>
        <p className="text-xs text-muted-foreground">
          {processedItems} de {totalItems} produtos
        </p>
      </div>
    </div>
  );
}