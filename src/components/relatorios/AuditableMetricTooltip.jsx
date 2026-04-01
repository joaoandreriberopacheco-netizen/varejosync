import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export default function AuditableMetricTooltip({ label, value, auditData, formatMoney }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!auditData) {
    return (
      <div className="p-2.5 md:p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">{label}</p>
        <p className="text-xs md:text-lg md:text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className="p-2.5 md:p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 cursor-help hover:bg-gray-100 dark:hover:bg-gray-700/50 transition"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] md:text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">{label}</p>
            <p className="text-xs md:text-lg md:text-xl font-semibold text-gray-900 dark:text-white truncate">{value}</p>
          </div>
          <div className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0 rounded-full border border-gray-300 dark:border-gray-600 mt-0.5" />
        </div>
      </div>

      {/* Tooltip / Popover */}
      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 w-64 text-xs">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{label} — Detalhes</p>
          <div className="space-y-1.5 text-gray-700 dark:text-gray-300">
            {Object.entries(auditData).map(([key, val]) => (
              <div key={key} className="flex justify-between gap-2">
                <span className="capitalize text-gray-600 dark:text-gray-400">{key.replace(/_/g, ' ')}:</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-white text-right">{val}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between gap-2 font-semibold">
              <span className="text-gray-900 dark:text-white">Total:</span>
              <span className="font-mono text-gray-900 dark:text-white text-right">{value}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}