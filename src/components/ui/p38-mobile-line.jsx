import React from 'react';
import { cn } from '@/components/utils';
import { p38Table } from '@/lib/p38TableSurfaces';
import { p38Accent } from '@/lib/p38ThemeSurfaces';

const ACCENT_BORDER = {
  default: 'border-l-transparent',
  success: p38Accent.success.border,
  warning: p38Accent.warning.border,
  info: p38Accent.info.border,
  danger: p38Accent.danger.border,
  muted: p38Accent.muted.border,
  none: 'border-l-transparent',
};

/** Ponto de status semântico (verde, amarelo, ciano, vermelho). */
export function P38StatusDot({ tone = 'success', className }) {
  const dotClass =
    tone === 'warning'
      ? p38Accent.warning.dot
      : tone === 'info'
        ? p38Accent.info.dot
        : tone === 'danger'
          ? p38Accent.danger.dot
          : tone === 'muted'
            ? p38Accent.muted.dot
            : p38Accent.success.dot;

  return <span className={cn('inline-block w-1.5 h-1.5 rounded-full shrink-0', dotClass, className)} aria-hidden />;
}

/** Linha compacta para listas mobile — inspirada no Relatório de Margem. */
export function P38MobileLine({
  as: Component = 'div',
  onClick,
  title,
  subtitle,
  meta,
  value,
  valueSub,
  trailing,
  accent = 'default',
  striped = false,
  className,
  children,
  ...props
}) {
  const rowClass = cn(
    p38Table.mobileLine,
    ACCENT_BORDER[accent] ?? ACCENT_BORDER.default,
    striped && 'bg-secondary/15 dark:bg-secondary/20',
    onClick && p38Table.mobileLineInteractive,
    className
  );

  if (children) {
    return (
      <Component className={rowClass} onClick={onClick} {...props}>
        {children}
      </Component>
    );
  }

  return (
    <Component
      className={cn(rowClass, 'flex items-center gap-2', onClick && 'min-h-[52px]')}
      onClick={onClick}
      {...props}
    >
      <div className="flex-1 min-w-0">
        {title ? <div className={p38Table.mobileLineTitle}>{title}</div> : null}
        {subtitle ? <div className={p38Table.mobileLineSubtitle}>{subtitle}</div> : null}
        {meta ? <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 min-w-0', p38Table.mobileLineMeta)}>{meta}</div> : null}
      </div>
      {(value || valueSub || trailing) && (
        <div className="flex items-center gap-1 shrink-0 max-w-[42%]">
          <div className="flex flex-col items-end gap-0.5 min-w-0">
            {value ? <div className={p38Table.mobileLineValue}>{value}</div> : null}
            {valueSub ? <div className={p38Table.mobileLineValueSub}>{valueSub}</div> : null}
          </div>
          {trailing}
        </div>
      )}
    </Component>
  );
}

/** Contentor de lista mobile com borda P38 (sem cards com margem). */
export const P38MobileLineList = React.forwardRef(function P38MobileLineList({ className, children, ...props }, ref) {
  return (
    <div ref={ref} className={cn(p38Table.mobileListShell, className)} {...props}>
      {children}
    </div>
  );
});
P38MobileLineList.displayName = 'P38MobileLineList';

/** Chip métrico horizontal (Receita, Lucro, etc.) — scroll horizontal opcional. */
export function P38MobileMetric({ label, value, tone = 'default', className }) {
  const valueClass =
    tone === 'success'
      ? cn('font-semibold', p38Accent.success.text)
      : tone === 'danger'
        ? cn('font-semibold', p38Accent.danger.text)
        : tone === 'muted'
          ? 'text-muted-foreground'
          : 'text-foreground font-medium';

  return (
    <div className={cn('flex-shrink-0 min-w-[4.25rem] max-w-[5.75rem]', className)}>
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground leading-none truncate">{label}</p>
      <p className={cn('text-[11px] tabular-nums mt-0.5 truncate', valueClass)}>{value}</p>
    </div>
  );
}
