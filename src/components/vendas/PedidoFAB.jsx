import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Download, Printer, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import FormularioPedidoImpresso from './FormularioPedidoImpresso';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { openPrintWindowOrShareHtml, shareOrDownloadBlob, shouldUseMobileDocumentExport } from '@/lib/mobilePrintAndShare';

export default function PedidoFAB({ pedido, onSave, isSaving, isDisabled, empresa }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handlePrint = async () => {
    const element = document.getElementById('formulario-impresso');
    if (!element) return;

    const doc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Pedido ${pedido.numero}</title>
          <style>
            body { font-family: Courier New, monospace; font-size: 12px; margin: 20px; }
            pre { white-space: pre-wrap; word-wrap: break-word; }
          </style>
        </head>
        <body>
          <pre>${element.textContent}</pre>
        </body>
      </html>
    `;
    try {
      await openPrintWindowOrShareHtml(doc, `pedido-${pedido.numero || 'novo'}.html`, `Pedido ${pedido.numero || ''}`);
    } catch {
      /* popup bloqueado */
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('formulario-impresso');
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    const name = `Pedido-${pedido.numero || 'novo'}.pdf`;
    const blob = pdf.output('blob');
    if (shouldUseMobileDocumentExport()) {
      await shareOrDownloadBlob(blob, name, 'application/pdf', `Pedido ${pedido.numero || ''}`);
    } else {
      pdf.save(name);
    }
  };

  return (
    <>
      {/* FAB Button */}
      <div className="fixed right-6 z-[55] p38-bottom-fab-high">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center ${
            isOpen
              ? 'bg-gray-700 dark:bg-gray-600'
              : 'bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500'
          } text-white`}
          title="Menu de ações"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Save className="w-6 h-6" />}
        </button>

        {/* Menu expansível */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 flex flex-col gap-2">
            <button
              onClick={() => {
                onSave();
                setIsOpen(false);
              }}
              disabled={isSaving || isDisabled}
              className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600 text-white shadow-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50"
              title="Salvar pedido"
            >
              <Save className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                setShowPreview(true);
                setIsOpen(false);
              }}
              disabled={isSaving || isDisabled}
              className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50"
              title="Visualizar formulário"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Dialog de Visualização e Impressão */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 p-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Formulário - Pedido {pedido.numero}
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                size="sm"
                className="dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
              >
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 bg-white dark:bg-gray-800">
            <div id="formulario-impresso" className="text-sm">
              <FormularioPedidoImpresso pedido={pedido} empresa={empresa} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}