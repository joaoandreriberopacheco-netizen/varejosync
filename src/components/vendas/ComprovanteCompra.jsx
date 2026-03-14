import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Share2 } from "lucide-react";
import { format } from 'date-fns';

export default function ComprovanteCompra({ pedido, open, onOpenChange }) {
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        handlePrint();
      }, 500);
    }
  }, [open]);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Recibo ${pedido.numero}`,
          text: `Comprovante de compra - ${pedido.numero}\nTotal: R$ ${pedido.valor_total?.toFixed(2)}`,
        });
      } catch (err) {
        console.log('Compartilhamento cancelado');
      }
    }
  };

  if (!pedido) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 bg-white dark:bg-gray-900">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #comprovante-print, #comprovante-print * { visibility: visible; }
            #comprovante-print { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%;
              background: white !important;
              color: black !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            #comprovante-print * {
              color: #000 !important;
              background: transparent !important;
              text-shadow: none !important;
            }
            #comprovante-print .font-bold {
              font-weight: 700 !important;
            }
            .no-print { display: none !important; }
            @page { 
              size: 80mm auto; 
              margin: 5mm;
            }
          }
        `}</style>

        {!isPrinting && (
          <div className="no-print flex gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
            <Button onClick={handlePrint} className="flex-1 bg-gray-900 text-white hover:bg-gray-800">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button onClick={handleShare} variant="outline" className="flex-1">
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar
            </Button>
          </div>
        )}

        <div id="comprovante-print" className="p-6 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          {/* Cabeçalho */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold mb-1 tracking-wider">VAREJOSYNC</h2>
            <p className="text-xs">Obrigado pela sua preferência!</p>
          </div>

          <div className="border-t border-dashed border-gray-400 my-3"></div>

          {/* Número do Recibo */}
          <div className="text-center text-base font-bold mb-3">
            RECIBO Nº {pedido.numero || pedido.senha_atendimento}
          </div>

          {/* Informações */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div>
              <div>DATA:</div>
              <div className="text-center font-bold">{format(new Date(pedido.created_date), 'dd/MM/yyyy')}</div>
            </div>
            <div>
              <div>CLIENTE:</div>
              <div className="text-center font-bold uppercase">{pedido.cliente_nome || 'AVULSO'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            <div>
              <div>HORA:</div>
              <div className="text-center font-bold">{format(new Date(pedido.created_date), 'HH:mm')}</div>
            </div>
            <div>
              <div>VEND.:</div>
              <div className="text-center font-bold uppercase">{pedido.vendedor_nome || 'SISTEMA'}</div>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-400 my-3"></div>

          {/* Itens */}
          <table className="w-full text-xs mb-3">
            <thead>
              <tr className="border-b border-dashed border-gray-400">
                <th className="text-left pb-1 font-bold">DESC.</th>
                <th className="text-right pb-1 font-bold">QTD</th>
                <th className="text-right pb-1 font-bold">PREÇO</th>
                <th className="text-right pb-1 font-bold">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {pedido.itens?.map((item, idx) => (
                <tr key={idx}>
                  <td className="text-left uppercase py-1 pr-1">{item.produto_nome}</td>
                  <td className="text-right py-1">{item.quantidade}</td>
                  <td className="text-right py-1">{item.preco_unitario_praticado?.toFixed(2)}</td>
                  <td className="text-right font-bold py-1">{item.total?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed border-gray-400 my-3"></div>

          {/* Subtotal */}
          <div className="flex justify-between text-xs mb-2">
            <span>Subtotal:</span>
            <span>{pedido.subtotal?.toFixed(2)}</span>
          </div>

          {pedido.valor_desconto > 0 && (
            <div className="flex justify-between text-xs mb-2">
              <span>Desconto:</span>
              <span>-{pedido.valor_desconto?.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t border-dashed border-gray-400 my-3"></div>

          {/* Total */}
          <div className="flex justify-between text-base font-bold mb-3">
            <span>TOTAL:</span>
            <span>R$ {pedido.valor_total?.toFixed(2)}</span>
          </div>

          <div className="border-t border-dashed border-gray-400 my-3"></div>

          {/* Formas de Pagamento */}
          <div className="text-xs font-bold uppercase mb-2">PAGAMENTO:</div>
          {pedido.pagamentos?.map((pag, idx) => (
            <div key={idx} className="flex justify-between text-xs mb-1">
              <span className="uppercase">{pag.forma_pagamento}</span>
              <span className="font-bold">R$ {pag.valor?.toFixed(2)}</span>
            </div>
          ))}

          {/* Rodapé */}
          <div className="text-center mt-6 text-xs text-gray-600 dark:text-gray-400">
            <p>VAREJOSYNC ERP</p>
            <p>{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}