import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

function StepDots({ step, total = 3 }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i < step ? 'w-5 bg-gray-900 dark:bg-white' : i === step ? 'w-5 bg-gray-400 dark:bg-gray-500' : 'w-2 bg-gray-200 dark:bg-gray-700'
          }`}
        />
      ))}
    </div>
  );
}

export default function ConsumoFormHeader({ isDesktop, mobileStep, stepLabels, onBack }) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      </button>
      <div className="flex-1">
        <p className="text-base font-bold text-gray-900 dark:text-white">Novo consumo interno</p>
        {!isDesktop && (
          <div className="flex items-center gap-2">
            <StepDots step={mobileStep} />
            <span className="text-xs text-gray-400">{stepLabels[mobileStep]}</span>
          </div>
        )}
      </div>
      {isDesktop && (
        <div className="flex items-center gap-1">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-600">{label}</span>
              {i < stepLabels.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-700" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}