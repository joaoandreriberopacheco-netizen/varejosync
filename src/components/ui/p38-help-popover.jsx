import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/**
 * Ícone de ajuda compacto — abre explicações ao toque/clique (mobile-friendly).
 */
export function P38HelpPopover({
  label = 'Ajuda sobre esta tela',
  children,
  className,
  iconClassName,
  side = 'bottom',
  align = 'start',
  size = 'default',
}) {
  const sizeClass = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
  const iconSizeClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground/75 transition-colors hover:bg-muted/80 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            sizeClass,
            className,
          )}
          aria-label={label}
        >
          <HelpCircle className={cn(iconSizeClass, iconClassName)} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="max-w-[min(20rem,calc(100vw-2rem))] space-y-2 p-3.5 text-left text-xs leading-relaxed normal-case"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
