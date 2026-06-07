import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useBreakpoint, useIsTablet } from '@/hooks/use-breakpoint';

/** Gera páginas visíveis com reticências para muitas páginas. */
export function getVisiblePageNumbers(current, total, { siblingCount = 1 } = {}) {
  if (total <= 1) return total === 1 ? [0] : [];

  const pages = new Set([0, total - 1]);
  for (let i = current - siblingCount; i <= current + siblingCount; i += 1) {
    if (i >= 0 && i < total) pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];

  for (let i = 0; i < sorted.length; i += 1) {
    const page = sorted[i];
    if (i > 0 && page - sorted[i - 1] > 1) {
      result.push('ellipsis');
    }
    result.push(page);
  }

  return result;
}

/**
 * Paginação P38 — compacta em phone/tablet (alvos de toque ≥44px),
 * numérica com reticências em desktop.
 */
export function P38Paginator({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  className,
  itemLabel = 'itens',
}) {
  const breakpoint = useBreakpoint();
  const isTablet = useIsTablet();
  const isCompact = breakpoint !== 'desktop';
  const from = totalItems === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalItems);

  if (totalPages <= 1) return null;

  const goPrev = () => onPageChange(Math.max(0, page - 1));
  const goNext = () => onPageChange(Math.min(totalPages - 1, page + 1));

  const navButtonClass = isTablet
    ? 'h-12 w-12 min-h-[48px] min-w-[48px] shrink-0'
    : isCompact
      ? 'h-11 w-11 min-h-[44px] min-w-[44px] shrink-0'
      : 'h-9 w-9';

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-t border-border/40 bg-card px-4 py-3',
        className
      )}
    >
      <span className="text-xs md:max-lg:text-sm text-muted-foreground tabular-nums shrink-0">
        {from}–{to} de {totalItems} {itemLabel}
      </span>

      <div className="flex items-center gap-1 min-w-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={navButtonClass}
          disabled={page === 0}
          onClick={goPrev}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {isCompact ? (
          <span className="px-2 text-sm md:max-lg:text-base font-medium text-foreground tabular-nums whitespace-nowrap">
            {page + 1} / {totalPages}
          </span>
        ) : (
          <div className="flex items-center gap-0.5">
            {getVisiblePageNumbers(page, totalPages).map((entry, idx) =>
              entry === 'ellipsis' ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="flex h-9 w-9 items-center justify-center text-muted-foreground"
                  aria-hidden
                >
                  <MoreHorizontal className="h-4 w-4" />
                </span>
              ) : (
                <button
                  key={entry}
                  type="button"
                  onClick={() => onPageChange(entry)}
                  aria-label={`Página ${entry + 1}`}
                  aria-current={entry === page ? 'page' : undefined}
                  className={cn(
                    'h-9 min-w-9 rounded px-2 text-sm transition-colors tabular-nums',
                    entry === page
                      ? 'bg-primary font-semibold text-primary-foreground dark:bg-muted dark:text-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  {entry + 1}
                </button>
              )
            )}
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={navButtonClass}
          disabled={page >= totalPages - 1}
          onClick={goNext}
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
