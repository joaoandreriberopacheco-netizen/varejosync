import { useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createUppercaseInputChangeHandler } from '@/lib/uppercaseInputHandlers';

const inputBase =
  'w-full bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground';

/**
 * Wizard mobile — um campo por ecrã, teclado adequado (numérico / texto / data).
 *
 * step types: decimal | text | textarea | date | datetime | choice | custom
 */
export default function MobileCampoFlow({
  steps,
  stepIndex,
  onStepIndexChange,
  onBack,
  onNext,
  onSkip,
  nextLabel = 'Próximo',
  finishLabel = 'Concluir',
  showSkip = false,
}) {
  const inputRef = useRef(null);
  const visibleSteps = useMemo(() => steps.filter((s) => !s.hidden), [steps]);
  const step = visibleSteps[stepIndex];
  const total = visibleSteps.length;
  const isLast = stepIndex >= total - 1;

  useEffect(() => {
    if (!step || step.type === 'custom' || step.type === 'choice') return;
    const t = setTimeout(() => {
      inputRef.current?.focus();
      if (step.type === 'decimal' || step.type === 'text') {
        inputRef.current?.select?.();
      }
    }, 120);
    return () => clearTimeout(t);
  }, [stepIndex, step?.id, step?.type]);

  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Enter') return;
    if (step?.type === 'textarea' && e.shiftKey) return;
    e.preventDefault();
    if (isLast) onNext?.();
    else onNext?.();
  }, [isLast, onNext, step?.type]);

  if (!step) return null;

  const progress = total > 1 ? `${stepIndex + 1} / ${total}` : null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between px-1 pb-3 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground min-h-[44px] min-w-[44px] px-2 -ml-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Voltar
        </button>
        {progress && (
          <span className="text-xs text-muted-foreground font-medium tabular-nums">{progress}</span>
        )}
        <div className="w-[72px]" />
      </div>

      <div className="flex-1 flex flex-col justify-center min-h-0 px-2 pb-4">
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{step.label}</p>
          {step.hint && (
            <p className="text-sm text-muted-foreground leading-snug px-4">{step.hint}</p>
          )}
        </div>

        <div className="w-full">
          {step.type === 'decimal' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">R$</p>
              <input
                ref={inputRef}
                autoComplete="off"
                type="text"
                inputMode="decimal"
                enterKeyHint={isLast ? 'done' : 'next'}
                value={step.value ?? ''}
                onChange={step.onChange}
                onKeyDown={handleKeyDown}
                placeholder="0,00"
                className={`${inputBase} text-center text-5xl font-semibold font-glacial tracking-tight`}
              />
            </div>
          )}

          {step.type === 'text' && (
            <input
              ref={inputRef}
              autoComplete="off"
              type="text"
              inputMode="text"
              enterKeyHint={isLast ? 'done' : 'next'}
              value={step.value ?? ''}
              onChange={step.uppercase ? createUppercaseInputChangeHandler(step.onChange) : step.onChange}
              onKeyDown={handleKeyDown}
              placeholder={step.placeholder || ''}
              className={`${inputBase} text-center text-xl font-medium px-4 py-3 p38-data-uppercase`}
            />
          )}

          {step.type === 'textarea' && (
            <textarea
              ref={inputRef}
              autoComplete="off"
              inputMode="text"
              enterKeyHint={isLast ? 'done' : 'next'}
              value={step.value ?? ''}
              onChange={step.uppercase ? createUppercaseInputChangeHandler(step.onChange) : step.onChange}
              onKeyDown={handleKeyDown}
              rows={4}
              placeholder={step.placeholder || ''}
              className={`${inputBase} text-base px-4 py-3 resize-none rounded-2xl bg-muted p38-data-uppercase`}
            />
          )}

          {step.type === 'date' && (
            <input
              ref={inputRef}
              autoComplete="off"
              type="date"
              value={step.value ?? ''}
              onChange={step.onChange}
              className={`${inputBase} text-center text-2xl font-medium h-14 rounded-2xl bg-muted`}
            />
          )}

          {step.type === 'datetime' && (
            <input
              ref={inputRef}
              autoComplete="off"
              type="datetime-local"
              value={step.value ?? ''}
              onChange={step.onChange}
              className={`${inputBase} text-center text-lg font-medium h-14 rounded-2xl bg-muted px-3`}
            />
          )}

          {step.type === 'choice' && step.options && (
            <div className="flex flex-col gap-3">
              {step.options.map((opt) => {
                const ativo = step.value === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      step.onChange(opt.value);
                      setTimeout(() => onNext?.(), 180);
                    }}
                    className={`w-full min-h-[56px] rounded-2xl text-base font-semibold transition-all active:scale-[0.98] ${
                      ativo
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-card shadow-sm text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {step.type === 'toggle' && (
            <div className="flex flex-col gap-3 items-center">
              <button
                type="button"
                onClick={() => step.onChange(!step.value)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  step.value ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 rounded-full bg-card shadow transform transition-transform ${
                    step.value ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
              <p className="text-lg font-medium text-foreground">{step.value ? step.onLabel : step.offLabel}</p>
            </div>
          )}

          {step.type === 'custom' && step.render?.()}
        </div>

        {step.preview && (
          <p className="text-center text-xs text-muted-foreground mt-4">{step.preview}</p>
        )}
      </div>

      <div className="shrink-0 flex flex-col gap-2 pt-2">
        {step.type !== 'choice' && (
          <button
            type="button"
            onClick={onNext}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground text-base font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            {isLast ? finishLabel : nextLabel}
            {!isLast && <ChevronRight className="w-5 h-5" />}
          </button>
        )}
        {showSkip && step.optional && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="w-full h-11 rounded-xl text-sm text-muted-foreground"
          >
            Saltar (opcional)
          </button>
        )}
      </div>
    </div>
  );
}
