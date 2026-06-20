import React, { useEffect, useState } from 'react';
import { Printer, FileText, LayoutGrid } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import PrintDialogFilters from '@/components/financeiro/PrintDialogFilters';

const DEFAULT_FILTERS = {
  periodo: 'hoje',
  customStart: '',
  customEnd: '',
  contasSel: [],
};

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
  initialFilters,
  contas,
}) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  useEffect(() => {
    if (!open) return;
    const contasAtivasIds = (contas || []).filter((c) => c.ativo !== false).map((c) => c.id);
    setFilters({
      ...DEFAULT_FILTERS,
      ...(initialFilters || {}),
      contasSel: initialFilters?.contasSel?.length ? initialFilters.contasSel : contasAtivasIds,
    });
  }, [open, initialFilters, contas]);

  const patchFilters = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const emitirBalancete = () => {
    onBalanceteDiario?.({ ...filters });
    onOpenChange(false);
  };

  const emitirExtrato = () => {
    onExtratoPdf?.({ ...filters });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[70]"
        className="z-[70] max-h-[min(90dvh,720px)] w-[calc(100vw-1rem)] max-w-md gap-0 overflow-visible rounded-[30px] border-0 bg-card p-0 shadow-2xl dark:bg-card"
      >
        <DialogHeader className="px-5 pb-3 pt-5 text-left">
          <DialogTitle className="flex items-center gap-2 font-glacial text-xl text-foreground">
            <Printer className="h-5 w-5" />
            Relatórios
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
            Escolha o formato abaixo. Período e contas valem para balancete e extrato.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90dvh-5rem)] space-y-4 overflow-y-auto overflow-x-visible px-5 pb-5">
          <PrintDialogFilters
            periodo={filters.periodo}
            setPeriodo={(value) => patchFilters({ periodo: value })}
            customStart={filters.customStart}
            customEnd={filters.customEnd}
            setCustomStart={(value) => patchFilters({ customStart: value })}
            setCustomEnd={(value) => patchFilters({ customEnd: value })}
            contas={contas || []}
            contasSel={filters.contasSel}
            setContasSel={(value) => patchFilters({ contasSel: value })}
            showAdvancedFilters={false}
            inDialog
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
