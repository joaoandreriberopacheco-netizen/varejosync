import React from 'react';
import { Printer, FileText, Filter, LayoutGrid } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import PrintDialogFilters from '@/components/financeiro/PrintDialogFilters';

function OptionCard({ icon: IconComponent, title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-[24px] bg-card dark:bg-muted px-4 py-4 text-left shadow-md transition-all hover:bg-muted/40 dark:hover:bg-muted"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-card dark:bg-card shadow-sm flex items-center justify-center flex-none">
          <IconComponent className="w-5 h-5 text-foreground/90" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
    </button>
  );
}

export default function FluxoCaixaPrintDialog({
  open,
  onOpenChange,
  onPrintExtratoCompleto,
  onPrintExtratoFiltrado,
  onOpenCorteDiario,
  filterState,
  setFilterState,
  contas,
}) {
  const safeFilterState = filterState || {
    periodo: 'mes',
    customStart: '',
    customEnd: '',
    contasSel: [],
    tiposSel: [],
    statusSel: [],
    pendentes: false,
    cmvOnly: false,
  };

  const updateFilterState = (updater) => {
    if (!setFilterState) return;
    setFilterState((prev) => updater(prev || safeFilterState));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-[30px] border-0 bg-card dark:bg-card p-0 shadow-2xl overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 text-left">
          <DialogTitle className="font-glacial text-xl text-foreground flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Imprimir extratos
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Escolha abaixo o tipo de extrato que deseja gerar para impressão ou PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-4 space-y-4">
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
            tiposSel={safeFilterState.tiposSel}
            setTiposSel={(value) => updateFilterState((prev) => ({ ...prev, tiposSel: value }))}
            statusSel={safeFilterState.statusSel}
            setStatusSel={(value) => updateFilterState((prev) => ({ ...prev, statusSel: value }))}
            pendentes={safeFilterState.pendentes}
            setPendentes={(value) => updateFilterState((prev) => ({ ...prev, pendentes: value }))}
            cmvOnly={safeFilterState.cmvOnly}
            setCmvOnly={(value) => updateFilterState((prev) => ({ ...prev, cmvOnly: value }))}
          />

          <OptionCard
            icon={FileText}
            title="Extrato completo"
            description="Gera um extrato geral, sem considerar os filtros próprios deste diálogo."
            onClick={onPrintExtratoCompleto}
          />

          <OptionCard
            icon={Filter}
            title="Extrato filtrado"
            description="Usa os filtros definidos aqui no diálogo para gerar o extrato."
            onClick={onPrintExtratoFiltrado}
          />

          <OptionCard
            icon={LayoutGrid}
            title="Corte diário"
            description="Mapa relacional em T: PDV, Caixa Geral e bancos — só o que já está líquido no período."
            onClick={() => {
              onOpenChange(false);
              onOpenCorteDiario?.();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}