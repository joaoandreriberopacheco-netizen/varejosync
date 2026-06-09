import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { P38MobileLineList } from '@/components/ui/p38-mobile-line';
import { P38_FIELD_SURFACE } from './financeiroP38';

/** Rótulo de grupo — Hoje/Ontem ou data curta (mesmo padrão Fluxo e Contas). */
export function formatFinanceiroGrupoLabel(k, hStr, oStr) {
  if (k === 'sem-data' || k === 'sem-vencimento') return 'Sem data';
  if (k === hStr) return 'Hoje';
  if (k === oStr) return 'Ontem';
  const d = new Date(`${k}T12:00:00`);
  if (Number.isNaN(d.getTime())) return k;
  if (k > hStr) return `${format(d, "d 'de' MMMM", { locale: ptBR })} (previsto)`;
  return format(d, "d 'de' MMMM", { locale: ptBR });
}

export const formatFinanceiroValor = (v) =>
  `R$ ${(Math.round((v || 0) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Cabeçalho de grupo colapsável — Fluxo de Caixa e Contas Abertas. */
export function FinanceiroGrupo({
  label,
  labelClassName,
  receitas = 0,
  despesas = 0,
  variant = 'default',
  card = false,
  children,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const liquido = receitas - despesas;
  const showBreakdown = receitas > 0 && despesas > 0;
  const overdue = variant === 'overdue';

  const negClass = overdue ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

  const content = (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'group flex w-full min-w-0 items-center justify-between gap-2 px-1 py-1.5',
          card ? 'px-3 py-2.5' : 'mb-0.5 border-b border-border/50 dark:border-white/10',
        )}
      >
        <p
          className={cn(
            'min-w-0 max-w-[42%] truncate text-left text-[11px] font-semibold uppercase tracking-wide text-foreground/75 sm:max-w-none sm:tracking-widest',
            labelClassName,
          )}
        >
          {label}
        </p>
        <div className="flex min-w-0 shrink items-center gap-1 sm:gap-1.5">
          {showBreakdown && receitas > 0 && (
            <span className="hidden text-[11px] font-semibold tabular-nums text-[#4A5D23] sm:inline dark:text-[#a4ce33]">
              +{formatFinanceiroValor(receitas)}
            </span>
          )}
          {showBreakdown && despesas > 0 && (
            <span className={cn('hidden text-[11px] font-semibold tabular-nums sm:inline', negClass)}>
              −{formatFinanceiroValor(despesas)}
            </span>
          )}
          <span
            className={cn(
              'shrink-0 text-[11px] font-bold tabular-nums',
              liquido >= 0 ? 'text-[#4A5D23] dark:text-[#a4ce33]' : negClass,
            )}
          >
            {liquido >= 0 ? '+' : '−'}
            {formatFinanceiroValor(Math.abs(liquido))}
          </span>
          <ChevronRight
            className={cn('h-3 w-3 shrink-0 text-foreground/50 transition-transform', open && 'rotate-90')}
          />
        </div>
      </button>
      {open && (
        <P38MobileLineList className={cn('block md:!block', card ? 'rounded-none' : 'rounded-lg')}>
          {children}
        </P38MobileLineList>
      )}
    </>
  );

  if (card) {
    return (
      <div className={cn('w-full min-w-0 overflow-hidden rounded-xl border border-amber-500/25 dark:border-amber-400/20', P38_FIELD_SURFACE)}>
        <div className="border-l-2 border-amber-500/70 dark:border-amber-400/60">
          {content}
        </div>
      </div>
    );
  }

  return <div className="w-full min-w-0">{content}</div>;
}

export function FinanceiroListaEstado({
  loading,
  vazio,
  vazioMensagem,
  vazioIcon: VazioIcon,
  children,
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (vazio) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-card py-12 dark:border-white/10 dark:bg-[#26262e]/40">
        {VazioIcon && <VazioIcon className="h-9 w-9 text-muted-foreground/40" />}
        <p className="text-sm text-muted-foreground">{vazioMensagem}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full max-w-full space-y-2 overflow-x-hidden pb-2 md:pb-0">
      {children}
    </div>
  );
}
