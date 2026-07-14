import React from 'react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const LABEL = 'Incluir lançamentos em aberto';

/** Toggle fixo — incluir lançamentos em aberto na lista do fluxo. */
export default function FluxoToggleProgramadas({
  checked,
  onCheckedChange,
  className,
}) {
  return (
    <label
      className={cn(
        'flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border border-border/40 bg-card/50 px-2.5 py-2 dark:border-white/10 dark:bg-[#26262e]/60',
        className,
      )}
    >
      <span className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-wide text-foreground">
        {LABEL}
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={LABEL}
        className="shrink-0"
      />
    </label>
  );
}
