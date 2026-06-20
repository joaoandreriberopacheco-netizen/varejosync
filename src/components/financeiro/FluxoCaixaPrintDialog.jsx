import React from 'react';
import { Printer, FileText, LayoutGrid } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import PrintDialogFilters from '@/components/financeiro/PrintDialogFilters';

function OptionCard({ icon: IconComponent, title, description, onClick, highlight }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[24px] px-4 py-4 text-left shadow-md transition-all hover:opacity-95 ${
        highlight
          ? 'bg-primary/12 ring-2 ring-primary/30 dark:bg-primary/15'
          : 'bg-card dark:bg-muted hover:bg-muted/40 dark:hover:bg-muted'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-card shadow-sm dark:bg-card">
          <IconComponent className="h-5 w-5 text-foreground/90" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

export default function FluxoCaixaPrintDialog({
  open,
  onOpenChange,
  onBalanceteDiario,
  onExtratoPdf,
  filterState,
  setFilterState,
  contas,
}) {
  const safeFilterState = filterState || {
    periodo: 'hoje',
    customStart: '',
    customEnd: '',
    contasSel: [],
  };

  const updateFilterState = (updater) => {
    if (!setFilterState) return;
    setFilterState((prev) => updater(prev || safeFilterState));
  };

  const emitirBalancete = () => {
    onBalanceteDiario?.(safeFilterState);
    onOpenChange(false);
  };

  const emitirExtrato = () => {
    onExtratoPdf?.(safeFilterState);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,720px)] w-[calc(100vw-1rem)] max-w-md overflow-hidden rounded-[30px] border-0 bg-card p-0 shadow-2xl dark:bg-card">
        <DialogHeader className="px-5 pb-3 pt-5 text-left">
          <DialogTitle className="flex items-center gap-2 font-glacial text-xl text-foreground">
            <Printer className="h-5 w-5" />
            Relatórios
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
            Escolha o formato abaixo. Período e contas valem para balancete e extrato.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90dvh-5rem)] space-y-4 overflow-y-auto px-5 pb-5">
          <PrintDialogFilters
            periodo={safeFilterState.periodo}
            setPeriodo={(value) => updateFilterState((prev) => ({ ...prev, periodo: value }))}
            customStart={safeFilterState.customStart}
            customEnd={safeFilterState.customEnd}
            setCustomStart={(value) => updateFilterState((prev) => ({ ...prev, customStart: value }))}
            setCustomEnd={(value) => updateFilterState((prev) => ({ ...prev, customEnd: value }))}
            contas={contas || []}
            contasSel={safeFilterState.contasSel}
            setContasSel={(value) => updateFilterState((prev) => ({ ...prev, contasSel: value }))}
            showAdvancedFilters={false}
          />

          <div className="space-y-3">
            <OptionCard
              icon={LayoutGrid}
              title="Balancete diário"
              description="Mapa em T — PDV, Caixa Geral e bancos lado a lado. Só o que já está líquido no período."
              onClick={emitirBalancete}
              highlight
            />

            <OptionCard
              icon={FileText}
              title="Extrato (PDF)"
              description="Lista cronológica de lançamentos para impressão ou arquivo, com os filtros acima."
              onClick={emitirExtrato}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
