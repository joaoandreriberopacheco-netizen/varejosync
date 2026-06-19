import React from 'react';
import { TrendingUp, TrendingDown, ArrowUpDown, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatKpiValor } from './FinanceiroKpiInline';

function ResumoSegment({ icon: Icon, value, valueClass, iconClass }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 tabular-nums text-[11px] font-semibold md:text-xs',
        valueClass,
      )}
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0 md:h-4 md:w-4', iconClass ?? valueClass)} aria-hidden />
      {value}
    </span>
  );
}

/**
 * Faixa compacta — receitas, despesas, variação (md+) e saldo.
 * Mobile: só 3 itens (sem variação).
 */
export default function FinanceiroResumoBar({
  receitas = 0,
  despesas = 0,
  variacao,
  saldo,
  saldoComSinal = false,
  className,
}) {
  const variacaoVal = variacao ?? receitas - despesas;
  const variacaoPos = variacaoVal >= 0;
  const posClass = 'text-[#4A5D23] dark:text-[#a4ce33]';
  const negClass = 'text-red-600 dark:text-red-400';

  const saldoDisplay =
    saldo != null
      ? saldoComSinal
        ? `${saldo >= 0 ? '+' : '−'}${formatKpiValor(Math.abs(saldo))}`
        : formatKpiValor(saldo)
      : null;

  const title = [
    `Receitas ${formatKpiValor(receitas)}`,
    `Despesas ${formatKpiValor(despesas)}`,
    `Variação ${variacaoPos ? '+' : '−'}${formatKpiValor(Math.abs(variacaoVal))}`,
    saldo != null ? `Saldo ${saldoComSinal ? saldoDisplay : formatKpiValor(saldo)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2 md:gap-3 md:overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden',
        className,
      )}
      title={title}
    >
      <ResumoSegment icon={TrendingUp} value={`+${formatKpiValor(receitas)}`} valueClass={posClass} />
      <span className="shrink-0 text-muted-foreground/35" aria-hidden>
        ·
      </span>
      <ResumoSegment
        icon={TrendingDown}
        value={`−${formatKpiValor(despesas)}`}
        valueClass={despesas > 0 ? negClass : 'text-muted-foreground/70'}
      />
      <span className="hidden shrink-0 text-muted-foreground/35 md:inline" aria-hidden>
        ·
      </span>
      <span className="hidden md:contents">
        <ResumoSegment
          icon={ArrowUpDown}
          value={`${variacaoPos ? '+' : '−'}${formatKpiValor(Math.abs(variacaoVal))}`}
          valueClass={variacaoPos ? posClass : negClass}
        />
      </span>
      {saldoDisplay != null && (
        <>
          <span className="shrink-0 text-muted-foreground/35" aria-hidden>
            ·
          </span>
          <ResumoSegment
            icon={Wallet}
            value={saldoDisplay}
            valueClass="text-foreground"
            iconClass="text-foreground/70"
          />
        </>
      )}
    </div>
  );
}
