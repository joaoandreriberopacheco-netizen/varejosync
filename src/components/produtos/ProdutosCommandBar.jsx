import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TrendingUp } from 'lucide-react';
import { CATALOG_SORT_OPTIONS } from '@/lib/catalogProdutoPerformance';

export default function ProdutosCommandBar({
  sortOrder,
  setSortOrder,
  viewMode,
  setViewMode,
}) {
  const currentSort = CATALOG_SORT_OPTIONS.find((opt) => opt.id === sortOrder) || CATALOG_SORT_OPTIONS[0];

  return (
    <div className="flex items-center justify-between py-2 flex-none flex-wrap gap-2 w-full min-w-0 max-w-full overflow-x-hidden px-3 md:px-0">
      <div className="text-xs text-foreground/90 flex items-center gap-2 min-w-0 flex-1 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 flex-shrink-0" title={`Ordenar: ${currentSort.label}`}>
              <TrendingUp className="w-3.5 h-3.5 rotate-90" />
              <span className="hidden sm:inline max-w-[180px] truncate">{currentSort.label}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="dark:bg-muted dark:border-border/40 max-h-[70vh] overflow-y-auto">
            <DropdownMenuLabel className="text-xs">Ordenar catálogo</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {CATALOG_SORT_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.id}
                onClick={() => setSortOrder(opt.id)}
                className={`dark:text-foreground dark:hover:bg-primary/90 text-xs ${sortOrder === opt.id ? 'font-semibold' : ''}`}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="hidden desktop-layout:flex items-center gap-2 flex-wrap">
        <div className="flex items-center bg-muted rounded p-0.5 gap-0.5">
          <button onClick={() => setViewMode('dinamica')} className={`text-[10px] px-2 py-1 rounded transition-colors ${viewMode === 'dinamica' ? 'bg-white dark:bg-muted text-foreground/90 shadow-sm font-medium' : 'text-muted-foreground'}`}>Tree Grid</button>
          <button onClick={() => setViewMode('plana')} className={`text-[10px] px-2 py-1 rounded transition-colors ${viewMode === 'plana' ? 'bg-white dark:bg-muted text-foreground/90 shadow-sm font-medium' : 'text-muted-foreground'}`}>Plana</button>
        </div>
      </div>
    </div>
  );
}
