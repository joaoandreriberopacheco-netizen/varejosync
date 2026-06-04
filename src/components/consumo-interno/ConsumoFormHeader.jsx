import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

function StepDots({ step, total = 3 }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i < step ? 'w-5 bg-background dark:bg-card' : i === step ? 'w-5 bg-muted-foreground/40 dark:bg-muted/400' : 'w-2 bg-muted'
          }`}
        />
      ))}
    </div>
  );
}

export default function ConsumoFormHeader({ isDesktop, mobileStep, stepLabels, onBack }) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border/40 bg-card px-4 py-3 dark:border-border/40 dark:bg-background">
      <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <ArrowLeft className="h-5 w-5 text-foreground/90" />
      </button>
      <div className="flex-1">
        <p className="text-base font-bold text-foreground">Novo consumo interno</p>
        {!isDesktop && (
          <div className="flex items-center gap-2">
            <StepDots step={mobileStep} />
            <span className="text-xs text-muted-foreground">{stepLabels[mobileStep]}</span>
          </div>
        )}
      </div>
      {isDesktop && (
        <div className="flex items-center gap-1">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-xs font-semibold text-muted-foreground">{label}</span>
              {i < stepLabels.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground dark:text-foreground/90" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}