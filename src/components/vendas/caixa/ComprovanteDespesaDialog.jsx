import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { openPrintWindowOrShareHtml } from '@/lib/mobilePrintAndShare';

export default function ComprovanteDespesaDialog({ open, onOpenChange, despesaCriada, currentUser, formatValor }) {
  const printComprovante = async () => {
    const html = `<html><head><title>Comprovante Despesa</title>
      <style>body{font-family:monospace;font-size:13px;padding:20px;max-width:320px;margin:0 auto}
      .center{text-align:center}.dashed{border-top:2px dashed #aaa;margin:12px 0}.big{font-size:22px;font-weight:bold}.row{display:flex;justify-content:space-between;margin:6px 0}
      </style></head><body>
      <div class="center"><b>VAREJOSYNC</b><br/><small>Comprovante de Despesa</small></div>
      <div class="dashed"></div>
      <div class="row"><span>Data/Hora:</span><span>${format(new Date(), 'dd/MM/yyyy HH:mm')}</span></div>
      <div class="row"><span>Operador:</span><span>${currentUser?.full_name}</span></div>
      <div class="row"><span>Categoria:</span><span>${despesaCriada?.categoria}</span></div>
      <div class="row"><span>Descrição:</span><span>${despesaCriada?.descricao}</span></div>
      <div class="dashed"></div>
      <div class="row big"><span>VALOR:</span><span>-R$ ${(despesaCriada?.valor || 0).toFixed(2).replace('.', ',')}</span></div>
      <div class="dashed"></div>
      <div class="center"><small>Não é comprovante fiscal</small></div>
      </body></html>`;
    try {
      await openPrintWindowOrShareHtml(html, 'comprovante-despesa.html', 'Comprovante de despesa', { windowFeatures: 'width=400,height=600' });
    } catch {
      /* popup bloqueado */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center flex-shrink-0">
          <button onClick={() => onOpenChange(false)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" style={{ minWidth: '44px', minHeight: '44px' }}>
            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">Comprovante</h2>
          <button onClick={printComprovante} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" style={{ minWidth: '44px', minHeight: '44px' }}>
            <Printer className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-xs bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden" style={{ fontFamily: 'Courier New, monospace' }}>
            <div className="px-6 py-5 text-center border-b-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="text-base font-bold text-gray-900 dark:text-white">VAREJOSYNC</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Comprovante de Despesa</div>
            </div>
            <div className="px-6 py-4 space-y-2">
              {[
                { l: 'Data/Hora', v: format(new Date(), 'dd/MM/yyyy HH:mm') },
                { l: 'Operador', v: currentUser?.full_name },
                { l: 'Categoria', v: despesaCriada?.categoria },
                { l: 'Descrição', v: despesaCriada?.descricao },
              ].map(({ l, v }) => (
                <div key={l} className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">{l}:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 text-right max-w-[60%]">{v}</span>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t-2 border-b-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">VALOR</span>
                <span className="text-2xl font-bold font-glacial text-red-600 dark:text-red-400">
                  −{formatValor(despesaCriada?.valor)}
                </span>
              </div>
            </div>
            <div className="px-6 py-4 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">Não é comprovante fiscal</p>
            </div>
          </div>

          <div className="mt-6 flex gap-3 w-full max-w-xs">
            <button onClick={() => onOpenChange(false)} className="flex-1 h-12 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-medium" style={{ minHeight: '48px' }}>
              Fechar
            </button>
            <button onClick={printComprovante} className="flex-1 h-12 rounded-2xl font-medium text-white bg-red-600" style={{ minHeight: '48px' }}>
              <span className="flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Imprimir</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}