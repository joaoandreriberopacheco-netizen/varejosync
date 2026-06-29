import React, { useMemo, useState } from 'react';
import { Search, X, SlidersHorizontal, Package, FilterX, Tag, Layers, Building2 } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import SearchableFilterSelect from '@/components/compras/SearchableFilterSelect';
import { useCompactShell } from '@/hooks/use-breakpoint';
import { cn } from '@/lib/utils';

const SECTION_CARD = 'rounded-2xl border border-border/40 bg-muted/20 dark:bg-muted/10 p-3.5 space-y-3';

function FilterSection({ title, icon: Icon, children }) {
  return (
    <section className={SECTION_CARD}>
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" /> : null}
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ActiveFilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-teal-600/90 dark:bg-teal-700 text-white">
      <span className="max-w-[180px] truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-black/10 transition-colors"
        aria-label={`Remover filtro ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function QuickFilterToggle({ label, checked, onCheckedChange }) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-none transition-colors whitespace-nowrap',
        checked
          ? 'bg-teal-600/12 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200 font-medium'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted/80 hover:text-foreground/80',
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full shrink-0',
          checked ? 'bg-teal-600 dark:bg-teal-400' : 'bg-muted-foreground/35',
        )}
        aria-hidden
      />
      {label}
    </button>
  );
}

function FiltrosPainel({
  categoryFilter,
  onCategoryFilter,
  categorias,
  supplierFilter,
  onSupplierFilter,
  fornecedores,
  selectedTags,
  onSelectedTags,
  allTags,
  tagSearch,
  onTagSearch,
  hidePending,
  onHidePending,
  roundingMode,
  onRoundingMode,
}) {
  return (
    <div className="space-y-3">
      <FilterSection title="Categoria" icon={Layers}>
        <SearchableFilterSelect
          value={categoryFilter}
          onChange={onCategoryFilter}
          placeholder="Todas Categorias"
          searchPlaceholder="Buscar categoria..."
          options={[
            { value: 'all', label: 'Todas Categorias' },
            ...categorias.map((c) => ({ value: c.id, label: c.nome })),
          ]}
        />
      </FilterSection>

      <FilterSection title="Fornecedor" icon={Building2}>
        <SearchableFilterSelect
          value={supplierFilter}
          onChange={onSupplierFilter}
          placeholder="Todos Fornecedores"
          searchPlaceholder="Buscar fornecedor..."
          options={[
            { value: 'all', label: 'Todos Fornecedores' },
            ...fornecedores.map((f) => ({ value: f.id, label: f.nome })),
          ]}
        />
      </FilterSection>

      <FilterSection title="Tags" icon={Tag}>
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <ActiveFilterChip
                key={tag}
                label={tag}
                onRemove={() => onSelectedTags(selectedTags.filter((t) => t !== tag))}
              />
            ))}
          </div>
        )}
        <div className="relative">
          <Input
            placeholder="Buscar tag..."
            value={tagSearch}
            onChange={(e) => onTagSearch(e.target.value)}
            className="bg-card border border-border/30 h-11 rounded-xl"
          />
          {tagSearch && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl shadow-lg border border-border/40 max-h-40 overflow-y-auto z-10">
              {allTags
                .filter((t) => t.toLowerCase().includes(tagSearch.toLowerCase()) && !selectedTags.includes(t))
                .slice(0, 10)
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      onSelectedTags([...selectedTags, tag]);
                      onTagSearch('');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-muted/40 text-sm"
                  >
                    {tag}
                  </button>
                ))}
            </div>
          )}
        </div>
      </FilterSection>

      <FilterSection title="Embalagem" icon={Package}>
        <Select value={roundingMode} onValueChange={onRoundingMode}>
          <SelectTrigger className="h-11 bg-card border border-border/30 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Automático (mais próximo)</SelectItem>
            <SelectItem value="up">Arredondar para cima</SelectItem>
            <SelectItem value="down">Arredondar para baixo</SelectItem>
            <SelectItem value="none">Quantidade exata</SelectItem>
          </SelectContent>
        </Select>
      </FilterSection>
    </div>
  );
}

export default function FiltrosSugestaoCompra({
  searchTerm,
  onSearchTerm,
  categoryFilter,
  onCategoryFilter,
  categorias,
  supplierFilter,
  onSupplierFilter,
  fornecedores,
  selectedTags,
  onSelectedTags,
  allTags,
  tagSearch,
  onTagSearch,
  hidePending,
  onHidePending,
  roundingMode,
  onRoundingMode,
  onLimparFiltros,
}) {
  const isMobile = useCompactShell();
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [
    categoryFilter !== 'all',
    supplierFilter !== 'all',
    selectedTags.length > 0,
    hidePending,
    roundingMode !== 'auto',
  ].filter(Boolean).length;

  const activeChips = useMemo(() => {
    const chips = [];
    if (categoryFilter !== 'all') {
      const cat = categorias.find((c) => c.id === categoryFilter);
      chips.push({
        key: 'cat',
        label: cat?.nome || 'Categoria',
        onRemove: () => onCategoryFilter('all'),
      });
    }
    if (supplierFilter !== 'all') {
      const f = fornecedores.find((x) => x.id === supplierFilter);
      chips.push({
        key: 'sup',
        label: f?.nome || 'Fornecedor',
        onRemove: () => onSupplierFilter('all'),
      });
    }
    selectedTags.forEach((tag) => {
      chips.push({
        key: `tag-${tag}`,
        label: tag,
        onRemove: () => onSelectedTags(selectedTags.filter((t) => t !== tag)),
      });
    });
    if (hidePending) {
      chips.push({
        key: 'pending',
        label: 'Sem pendentes',
        onRemove: () => onHidePending(false),
      });
    }
    if (roundingMode !== 'auto') {
      chips.push({
        key: 'round',
        label: `Arredondamento: ${roundingMode}`,
        onRemove: () => onRoundingMode('auto'),
      });
    }
    return chips;
  }, [
    categoryFilter,
    supplierFilter,
    selectedTags,
    hidePending,
    roundingMode,
    categorias,
    fornecedores,
    onCategoryFilter,
    onSupplierFilter,
    onSelectedTags,
    onHidePending,
    onRoundingMode,
  ]);

  const limpar = () => {
    onLimparFiltros();
    onTagSearch('');
  };

  const painelProps = {
    categoryFilter,
    onCategoryFilter,
    categorias,
    supplierFilter,
    onSupplierFilter,
    fornecedores,
    selectedTags,
    onSelectedTags,
    allTags,
    tagSearch,
    onTagSearch,
    hidePending,
    onHidePending,
    roundingMode,
    onRoundingMode,
  };

  const searchBar = (
    <div className="relative min-w-0 flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        autoComplete="off"
        value={searchTerm}
        onChange={(e) => onSearchTerm(e.target.value)}
        placeholder="Buscar produto..."
        className="h-12 w-full rounded-2xl border border-border/30 bg-card pl-10 pr-10 text-sm text-foreground/90 shadow-sm outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-teal-300 dark:bg-muted dark:text-foreground dark:focus:ring-teal-600"
      />
      {searchTerm ? (
        <button
          type="button"
          onClick={() => onSearchTerm('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Limpar busca"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );

  const filterToggleButton = (
    <button
      type="button"
      onClick={isMobile ? () => setShowFilters(true) : undefined}
      className={cn(
        'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-all',
        'bg-muted dark:bg-muted text-foreground/90',
        !isMobile && showFilters && 'ring-2 ring-teal-500/40 bg-teal-50 dark:bg-teal-950/30',
      )}
      title="Filtros"
      aria-label="Filtros"
      aria-expanded={showFilters}
    >
      <SlidersHorizontal className="h-5 w-5" />
      {activeFilterCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-semibold leading-none text-white dark:bg-teal-500">
          {activeFilterCount > 9 ? '9+' : activeFilterCount}
        </span>
      )}
    </button>
  );

  const quickToggles = (
    <div className="flex flex-wrap items-center gap-1.5">
      <QuickFilterToggle
        label="Ocultar em trânsito"
        checked={hidePending}
        onCheckedChange={onHidePending}
      />
    </div>
  );

  if (isMobile) {
    return (
      <div className="space-y-2.5">
        <div className="flex gap-2.5">
          {searchBar}
          {filterToggleButton}
        </div>
        {quickToggles}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map((chip) => (
              <ActiveFilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
            ))}
            <button
              type="button"
              onClick={limpar}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline px-1"
            >
              Limpar tudo
            </button>
          </div>
        )}
        <Drawer open={showFilters} onOpenChange={setShowFilters}>
          <DrawerContent className="max-h-[92vh] border-0 rounded-t-[28px] bg-card px-4 pb-0 dark:bg-card">
            <DrawerHeader className="px-0 pb-1 text-left shrink-0">
              <DrawerTitle className="font-glacial text-foreground">Filtros</DrawerTitle>
              {activeFilterCount > 0 ? (
                <p className="text-xs text-muted-foreground">{activeFilterCount} filtro(s) ativo(s)</p>
              ) : null}
            </DrawerHeader>
            <div className="overflow-y-auto pb-4 -mx-1 px-1 max-h-[calc(92vh-9rem)]">
              <FiltrosPainel {...painelProps} />
            </div>
            <div className="sticky bottom-0 -mx-4 border-t border-border/40 bg-card/95 px-4 py-3 backdrop-blur-sm dark:bg-card/95">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={limpar}
                  className="h-11 flex-1 rounded-2xl bg-muted text-sm text-muted-foreground"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="h-11 flex-1 rounded-2xl bg-teal-600 text-sm text-white dark:bg-teal-500"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <Collapsible open={showFilters} onOpenChange={setShowFilters} className="space-y-2.5">
      <div className="flex items-center gap-2.5">
        {searchBar}
        <CollapsibleTrigger asChild>{filterToggleButton}</CollapsibleTrigger>
        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={limpar}
            className="hidden lg:inline-flex h-10 items-center gap-1 rounded-xl px-3 text-xs text-muted-foreground hover:bg-muted/60 transition-colors"
          >
            <FilterX className="h-3.5 w-3.5" />
            Limpar filtros
          </button>
        ) : null}
      </div>
      {quickToggles}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <ActiveFilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
          ))}
        </div>
      )}
      <CollapsibleContent>
        <div className="rounded-2xl border border-border/40 bg-card/80 p-4 shadow-sm dark:bg-card/60">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
            <SlidersHorizontal className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            Filtros avançados
          </div>
          <FiltrosPainel {...painelProps} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
