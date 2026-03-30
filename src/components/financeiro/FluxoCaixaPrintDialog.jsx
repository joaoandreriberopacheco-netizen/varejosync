import React from 'react';
import { Printer, FileText, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import PrintDialogFilters from '@/components/financeiro/PrintDialogFilters';

function OptionCard({ icon: IconComponent, title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-[24px] bg-white dark:bg-slate-800 px-4 py-4 text-left shadow-md transition-all hover:bg-gray-50 dark:hover:bg-slate-700"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center flex-none">
          <IconComponent className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{description}</p>
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
      <DialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-[30px] border-0 bg-white dark:bg-slate-900 p-0 shadow-2xl overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 text-left">
          <DialogTitle className="font-glacial text-xl text-gray-900 dark:text-white flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Imprimir extratos
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}