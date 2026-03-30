import React from 'react';
import { Printer, FileText, Filter, CalendarDays, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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

export default function FluxoCaixaPrintDialog({ open, onOpenChange, onPrintExtratoCompleto, onPrintExtratoFiltrado, contasSelecionadasLabel, periodoLabel }) {
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

        <div className="px-5 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white dark:bg-slate-800 px-3 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="text-[11px] uppercase tracking-wide">Período</span>
              </div>
              <p className="text-xs font-medium text-gray-800 dark:text-gray-100">{periodoLabel}</p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-800 px-3 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <Wallet className="w-3.5 h-3.5" />
                <span className="text-[11px] uppercase tracking-wide">Contas</span>
              </div>
              <p className="text-xs font-medium text-gray-800 dark:text-gray-100">{contasSelecionadasLabel}</p>
            </div>
          </div>

          <OptionCard
            icon={FileText}
            title="Extrato completo"
            description="Gera um extrato geral, sem considerar a visualização filtrada da tela."
            onClick={onPrintExtratoCompleto}
          />

          <OptionCard
            icon={Filter}
            title="Visualização atual"
            description="Usa exatamente o que está sendo exibido agora na tela, com todo o conjunto de filtros ativos."
            onClick={onPrintExtratoFiltrado}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}