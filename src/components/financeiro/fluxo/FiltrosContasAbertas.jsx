import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import FinanceiroFiltrosShell, { FinanceiroSummaryChip } from './FinanceiroFiltrosShell';
import { P38_CHIP_ACTIVE, P38_CHIP_INACTIVE } from './financeiroP38';

const PERIODOS = [
  { v: 'vencidas', l: 'Vencidas' },
  { v: 'hoje', l: 'Hoje' },
  { v: 'semana', l: '7 dias' },
  { v: 'mes', l: 'Mês' },
  { v: 'futuras', l: 'Futuras' },
  { v: 'todas', l: 'Todas' },
  { v: 'personalizado', l: 'Personalizado' },
];

const TIPOS = [
  { v: 'todos', l: 'Todos' },
  { v: 'Receita', l: 'A Receber' },
  { v: 'Despesa', l: 'A Pagar' },
  { v: 'compras', l: 'Compras' },
];

export default function FiltrosContasAbertas({
  search,
  onSearch,
  filtersOpen,
  onFiltersOpenChange,
  periodo,
  onPeriodo,
  cs,
  ce,
  onCs,
  onCe,
  tipoFiltro,
  onTipoFiltro,
  mostrarPagas,
  onMostrarPagas,
  totalFiltrados,
  onLimparFiltros,
  footerActions,
}) {
  const hasActiveFilters =
    periodo !== 'mes' ||
    tipoFiltro !== 'todos' ||
    mostrarPagas ||
    !!cs ||
    !!ce;

  const periodoLabel = PERIODOS.find((p) => p.v === periodo)?.l || 'Período';
  const tipoLabel = TIPOS.find((t) => t.v === tipoFiltro)?.l;

  return (
    <FinanceiroFiltrosShell
      search={search}
      onSearch={onSearch}
      searchPlaceholder="Buscar lançamento, fornecedor..."
      filtersOpen={filtersOpen}
      onFiltersOpenChange={onFiltersOpenChange}
      hasActiveFilters={hasActiveFilters}
      onLimparFiltros={onLimparFiltros}
      totalLabel={`${totalFiltrados} lançamento${totalFiltrados !== 1 ? 's' : ''}`}
      footerActions={footerActions}
      summaryChips={
        <>
          {periodo !== 'mes' && <FinanceiroSummaryChip>{periodoLabel}</FinanceiroSummaryChip>}
          {tipoFiltro !== 'todos' && <FinanceiroSummaryChip>{tipoLabel}</FinanceiroSummaryChip>}
          {mostrarPagas && (
            <FinanceiroSummaryChip className="text-green-700 dark:text-green-400">Pagas</FinanceiroSummaryChip>
          )}
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Período</p>
          <div className="flex flex-wrap gap-1.5">
            {PERIODOS.map((p) => (
              <button
                key={p.v}
                type="button"
                onClick={() => onPeriodo(p.v)}
                className={`rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors ${periodo === p.v ? P38_CHIP_ACTIVE : P38_CHIP_INACTIVE}`}
              >
                {p.l}
              </button>
            ))}
          </div>
        </div>

        {periodo === 'personalizado' && (
          <div className="flex gap-2">
            <input
              autoComplete="off"
              type="date"
              value={cs}
              onChange={(e) => onCs(e.target.value)}
              className="min-w-0 flex-1 rounded-lg bg-secondary/80 px-2.5 py-2 text-sm text-foreground outline-none dark:bg-[#383e47]"
            />
            <input
              autoComplete="off"
              type="date"
              value={ce}
              onChange={(e) => onCe(e.target.value)}
              className="min-w-0 flex-1 rounded-lg bg-secondary/80 px-2.5 py-2 text-sm text-foreground outline-none dark:bg-[#383e47]"
            />
          </div>
        )}

        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Tipo</p>
          <div className="flex flex-wrap gap-1.5">
            {TIPOS.map(({ v, l }) => (
              <button
                key={v}
                type="button"
                onClick={() => onTipoFiltro(v)}
                className={`rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors ${tipoFiltro === v ? P38_CHIP_ACTIVE : P38_CHIP_INACTIVE}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Exibição</p>
          <button
            type="button"
            onClick={() => onMostrarPagas((p) => !p)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors ${mostrarPagas ? P38_CHIP_ACTIVE : P38_CHIP_INACTIVE}`}
          >
            <CheckCircle2 className="h-3 w-3" /> Pagas
          </button>
        </div>
      </div>
    </FinanceiroFiltrosShell>
  );
}
