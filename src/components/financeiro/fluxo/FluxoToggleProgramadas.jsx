import React from 'react';
import { CalendarClock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

/** Toggle fixo — incluir contas a pagar/receber na lista do fluxo. */
export default function FluxoToggleProgramadas({
  checked,
  onCheckedChange,
  qtdProgramadas = 0,
  className,
}) {
  return (
    <label
      className={cn(
        'flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border border-border/40 bg-card/50 px-3 py-2.5 dark:border-white/10 dark:bg-[#26262e]/60',
        className,
      )}
    >
      <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold leading-tight text-foreground">
          Incluir a pagar e receber
        </p>
        <p className="truncate text-[10px] text-muted-foreground">
          {checked
            ? qtdProgramadas > 0
              ? `${qtdProgramadas} — vencidas e deste mês`
              : 'Vencidas e vencimento neste mês'
            : 'Mostra saldo previsto se estiver ligado'}
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label="Incluir contas a pagar e receber" />
    </label>
  );
}
