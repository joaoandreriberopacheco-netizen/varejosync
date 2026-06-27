import { ChevronDown } from 'lucide-react';
import { cn } from '@/components/utils';
import { ABCD_FILTER_VALUES, ABCD_FILTER_LABELS } from '@/lib/filterProdutos';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const CHIP_BASE =
  'h-8 min-w-[2rem] px-2 rounded-lg text-xs font-semibold transition-colors border border-transparent';
const CHIP_ACTIVE =
  'bg-[#4a5240] text-white border-[#4a5240] dark:bg-[#a4ce33] dark:text-[#1f1d22] dark:border-[#a4ce33]';
const CHIP_IDLE = 'bg-muted/80 text-muted-foreground hover:bg-muted';

const MOBILE_OPTIONS = [
  { value: 'all', label: 'Todas' },
  ...ABCD_FILTER_VALUES.map((value) => ({
    value,
    label: ABCD_FILTER_LABELS[value] || value,
  })),
];

function mobileAbcdLabel(abcd) {
  const current = abcd || 'all';
  if (current === 'all') return 'ABC';
  return current;
}

/** Atalho A/B/C/D na barra de busca — desktop: chips; mobile: botão compacto com seletor. */
export default function ProdutosAbcdQuickFilter({ abcd = 'all', onChange }) {
  const current = abcd || 'all';
  const isActive = current !== 'all';

  return (
    <>
      {/* Mobile: seletor compacto (libera espaço na barra de filtros) */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'desktop-layout:hidden flex h-10 flex-shrink-0 items-center gap-0.5 rounded-xl bg-muted/80 px-2.5 text-xs font-semibold transition-colors',
              isActive
                ? 'text-[#4a5240] ring-2 ring-[#4a5240]/40 dark:text-[#a4ce33] dark:ring-[#a4ce33]/40'
                : 'text-muted-foreground',
            )}
            title="Filtrar por curva ABCD"
            aria-label={`Curva ABCD: ${isActive ? `classe ${current}` : 'todas as classes'}`}
          >
            <span>{mobileAbcdLabel(current)}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-auto min-w-[9rem] rounded-xl border-border/40 bg-card p-1.5 shadow-lg dark:bg-muted dark:border-border/40"
        >
          <div className="flex flex-col gap-0.5" role="listbox" aria-label="Curva ABCD">
            {MOBILE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="option"
                aria-selected={current === value}
                onClick={() => onChange(value)}
                className={cn(
                  'flex h-9 w-full items-center justify-between rounded-lg px-3 text-left text-xs font-medium transition-colors',
                  current === value
                    ? 'bg-[#4a5240] text-white dark:bg-[#a4ce33] dark:text-[#1f1d22]'
                    : 'text-foreground hover:bg-muted/80',
                )}
              >
                <span>{label}</span>
                {value !== 'all' && (
                  <span className="text-[10px] font-bold opacity-80">{value}</span>
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Desktop: chips inline */}
      <div
        className="hidden desktop-layout:flex items-center gap-0.5 flex-shrink-0 rounded-xl bg-muted p-0.5"
        role="group"
        aria-label="Filtrar por curva ABCD"
      >
        <button
          type="button"
          onClick={() => onChange('all')}
          className={cn(CHIP_BASE, 'px-2.5 font-medium', current === 'all' ? CHIP_ACTIVE : CHIP_IDLE)}
          title="Todas as classes ABCD"
          aria-pressed={current === 'all'}
        >
          Tod
        </button>
        {ABCD_FILTER_VALUES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={cn(CHIP_BASE, current === value ? CHIP_ACTIVE : CHIP_IDLE)}
            title={`Classe ${value}`}
            aria-pressed={current === value}
          >
            {value}
          </button>
        ))}
      </div>
    </>
  );
}
