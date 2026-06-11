import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/components/utils';
import {
  CATALOG_NUMERIC_METRIC_FIELDS,
  NUMERIC_COMPARISON_OPERATORS,
} from '@/lib/catalogNumericFilters';

const MOBILE_FILTER_SELECT =
  'bg-muted/80 border-none h-9 text-xs w-full rounded-xl';

function FilterSectionLabel({ children }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
      {children}
    </p>
  );
}

/**
 * Filtro numérico reutilizável: métrica (markup, margem, preços…) + operador + valor(es).
 */
export default function ProdutosNumericMetricFilter({
  filters,
  setFilters,
  handleFilterChange,
  sectionLabel = 'Métrica numérica',
}) {
  const metricaCampo = filters.metricaCampo || 'all';
  const metricaOperador = filters.metricaOperador || 'all';
  const metricActive = metricaCampo !== 'all' && metricaOperador !== 'all';

  return (
    <div className="space-y-1.5 desktop-layout:contents">
      <div className="desktop-layout:hidden">
        <FilterSectionLabel>{sectionLabel}</FilterSectionLabel>
      </div>
      <div className="grid grid-cols-2 gap-2 desktop-layout:contents">
        <div className="col-span-2 desktop-layout:col-auto">
          <Select
            value={metricaCampo}
            onValueChange={(v) =>
              setFilters((prev) => ({
                ...prev,
                metricaCampo: v,
                ...(v === 'all'
                  ? {
                      metricaOperador: 'all',
                      metricaValor: '',
                      metricaValorAte: '',
                    }
                  : null),
              }))
            }
          >
            <SelectTrigger className={cn(MOBILE_FILTER_SELECT, 'desktop-layout:h-9 desktop-layout:rounded-lg')}>
              <SelectValue placeholder="Métrica" />
            </SelectTrigger>
            <SelectContent className="dark:bg-muted dark:border-border/40">
              {CATALOG_NUMERIC_METRIC_FIELDS.map(({ value, label }) => (
                <SelectItem key={value} value={value} className="text-sm md:text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 desktop-layout:col-auto">
          <Select
            value={metricaOperador}
            onValueChange={(v) =>
              setFilters((prev) => ({
                ...prev,
                metricaOperador: v,
                metricaValorAte: v === 'between' ? prev.metricaValorAte : '',
              }))
            }
            disabled={metricaCampo === 'all'}
          >
            <SelectTrigger
              className={cn(
                MOBILE_FILTER_SELECT,
                'desktop-layout:h-9 desktop-layout:rounded-lg disabled:opacity-50',
              )}
            >
              <SelectValue placeholder="Comparação" />
            </SelectTrigger>
            <SelectContent className="dark:bg-muted dark:border-border/40">
              {NUMERIC_COMPARISON_OPERATORS.map(({ value, label }) => (
                <SelectItem key={value} value={value} className="text-sm md:text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Input
          inputMode="decimal"
          placeholder={metricaOperador === 'between' ? 'De' : 'Valor'}
          disabled={!metricActive}
          className="bg-muted/80 border-none h-9 text-xs rounded-xl disabled:opacity-50 desktop-layout:rounded-lg"
          value={filters.metricaValor || ''}
          onChange={(e) => handleFilterChange('metricaValor', e.target.value)}
        />

        {metricaOperador === 'between' && (
          <Input
            inputMode="decimal"
            placeholder="Até"
            disabled={!metricActive}
            className="bg-muted/80 border-none h-9 text-xs rounded-xl disabled:opacity-50 desktop-layout:rounded-lg"
            value={filters.metricaValorAte || ''}
            onChange={(e) => handleFilterChange('metricaValorAte', e.target.value)}
          />
        )}
      </div>
    </div>
  );
}
