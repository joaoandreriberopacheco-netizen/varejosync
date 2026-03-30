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
            periodo={filterState.periodo}
            setPeriodo={(value) => setFilterState((prev) => ({ ...prev, periodo: value }))}
            customStart={filterState.customStart}
            customEnd={filterState.customEnd}
            setCustomStart={(value) => setFilterState((prev) => ({ ...prev, customStart: value }))}
            setCustomEnd={(value) => setFilterState((prev) => ({ ...prev, customEnd: value }))}
            contas={contas}
            contasSel={filterState.contasSel}
            setContasSel={(value) => setFilterState((prev) => ({ ...prev, contasSel: value }))}
            tiposSel={filterState.tiposSel}
            setTiposSel={(value) => setFilterState((prev) => ({ ...prev, tiposSel: value }))}
            statusSel={filterState.statusSel}
            setStatusSel={(value) => setFilterState((prev) => ({ ...prev, statusSel: value }))}
            pendentes={filterState.pendentes}
            setPendentes={(value) => setFilterState((prev) => ({ ...prev, pendentes: value }))}
            cmvOnly={filterState.cmvOnly}
            setCmvOnly={(value) => setFilterState((prev) => ({ ...prev, cmvOnly: value }))}
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