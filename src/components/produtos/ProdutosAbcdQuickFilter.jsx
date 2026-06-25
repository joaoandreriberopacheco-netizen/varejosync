import { cn } from '@/components/utils';
import { ABCD_FILTER_VALUES } from '@/lib/filterProdutos';

const CHIP_BASE =
  'h-8 min-w-[2rem] px-2 rounded-lg text-xs font-semibold transition-colors border border-transparent';
const CHIP_ACTIVE =
  'bg-[#4a5240] text-white border-[#4a5240] dark:bg-[#a4ce33] dark:text-[#1f1d22] dark:border-[#a4ce33]';
const CHIP_IDLE = 'bg-muted/80 text-muted-foreground hover:bg-muted';

/** Atalho A/B/C/D na barra de busca — sempre visível sem abrir o painel de filtros. */
export default function ProdutosAbcdQuickFilter({ abcd = 'all', onChange }) {
  const current = abcd || 'all';

  return (
    <div
      className="flex items-center gap-0.5 flex-shrink-0 rounded-xl bg-muted p-0.5"
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
  );
}
