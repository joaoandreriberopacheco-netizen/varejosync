import React, { useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

export default function ComprovanteCompra({ pedido, open, onClose }) {
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [open]);

  if (!pedido) return null;

  const formatValor = (valor) => {
    const num = parseFloat(valor) || 0;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* O max-w-2xl permite que o modal expanda bem na tela (para simular o A4), 
          mas esprema automaticamente se for aberto num ecrã pequeno ou POS */}
      <DialogContent className="max-w-2xl p-0 bg-gray-200 flex justify-center overflow-hidden">
        
        {/* Estilos de Impressão Fluida */}
        <style type="text/css" media="print">
          {`
            /* Deixamos o tamanho da página em "auto" para que a impressora decida (A4 ou 80mm) */
            @page { margin: 0.5cm; size: auto; }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body * { visibility: hidden; }
            #area-comprovante, #area-comprovante * { visibility: visible; }
            /* O container ocupa 100% da largura do papel que a impressora fornecer */
            #area-comprovante { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          `}
        </style>

        {/* Container Principal */}
        <div 
          id="area-comprovante"
          className="bg-white p-4 sm:p-8 w-full font-sans text-gray-800 shadow-lg print:shadow-none overflow-y-auto max-h-[90vh] print:max-h-none print:overflow-visible"
        >
          
          {/* Cabeçalho */}
          <div className="text-center pb-4 mb-6 border-b border-gray-100">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-red-600 mb-1">VAREJOSYNC</h1>
            <p className="text-sm text-gray-500">Obrigado pela sua preferência!</p>
          </div>

          {/* Informações do Pedido - Layout responsivo (Grid adapta-se ao espaço) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-gray-600 mb-6">
            <div>
              <p className="mb-1"><span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px] sm:text-xs">Recibo:</span> <span className="text-gray-900 font-medium">{pedido.numero}</span></p>
              <p><span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px] sm:text-xs">Data:</span> <span className="text-gray-900">{format(new Date(pedido.created_date || new Date()), 'dd/MM/yyyy HH:mm')}</span></p>
            </div>
            <div className="sm:text-right">
              <p className="mb-1"><span className="font-semibold text-gray-400 uppercase tracking-wider text-[10px] sm:text-xs">Cliente:</span> <span className="text-gray-900 font-medium">{pedido.cliente_nome}</span></p>
            </div>
          </div>

          {/* Lista de Itens - Estilo Clip Careers + Responsividade */}
          <div className="mb-6 space-y-2 sm:space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 hidden sm:block">
              Detalhes da Compra
            </h3>
            
            {pedido.itens?.map((item, idx) => (
              <div 
                key={idx} 
                /* Aqui está o "quadro sutil". O sm:flex-row coloca em linha no A4, 
                   e o padrão flex-col empilha no 80mm */
                className="border border-gray-200 bg-gray-50/50 rounded-md p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 print:border-gray-300 print:break-inside-avoid"
              >
                {/* Descrição do Produto */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] sm:text-sm text-gray-900 break-words leading-tight">
                    {item.produto_nome}
                  </p>
                  {/* Visível apenas no 80mm (Mobile/Estreito) */}
                  <p className="text-[11px] text-gray-500 mt-1 sm:hidden">
                    Qtd: {item.quantidade} x R$ {formatValor(item.preco_unitario_praticado)}
                  </p>
                </div>
                
                {/* Valores (Preço unitário e Total) */}
                <div className="flex justify-end items-end sm:items-center gap-4 sm:gap-6">
                  {/* Visível apenas no A4 (Desktop/Largo) */}
                  <div className="hidden sm:flex flex-col items-end text-sm text-gray-500">
                    <span className="text-[10px] uppercase">Qtd x Preço</span>
                    <span>{item.quantidade} x R$ {formatValor(item.preco_unitario_praticado)}</span>
                  </div>
                  
                  {/* Total do Item - Visível em ambos, mas adapta o tamanho */}
                  <div className="flex flex-col items-end">
                    <span className="hidden sm:block text-[10px] uppercase text-gray-500">Subtotal</span>
                    <span className="font-bold text-[13px] sm:text-sm text-gray-900">
                      R$ {formatValor(item.total)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Valores Totais */}
          <div className="border-t border-gray-200 pt-4 mb-6 flex flex-col items-end">
            <div className="w-full sm:w-1/2 space-y-2 text-xs sm:text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>R$ {formatValor(pedido.subtotal)}</span>
              </div>
              
              {pedido.valor_desconto > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Desconto:</span>
                  <span>- R$ {formatValor(pedido.valor_desconto)}</span>
                </div>
              )}
              
              {pedido.valor_acrescimo > 0 && (
                <div className="flex justify-between">
                  <span>Acréscimo:</span>
                  <span>+ R$ {formatValor(pedido.valor_acrescimo)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-bold text-base sm:text-lg text-gray-900 pt-3 border-t border-gray-200 mt-2">
                <span>TOTAL:</span>
                <span>R$ {formatValor(pedido.valor_total)}</span>
              </div>
            </div>
          </div>

          {/* Formas de Pagamento */}
          {pedido.pagamentos && pedido.pagamentos.length > 0 && (
            <div className="text-[11px] sm:text-xs text-gray-500 mb-6 bg-gray-50 p-3 rounded-md border border-gray-100">
              <p className="font-semibold text-gray-400 uppercase tracking-wider mb-2">Método de Pagamento</p>
              {pedido.pagamentos.map((pag, idx) => (
                <div key={idx} className="flex justify-between text-gray-900 font-medium">
                  <span>{pag.forma_pagamento}</span>
                  <span>R$ {formatValor(pag.valor)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Rodapé */}
          <div className="text-center text-[10px] sm:text-xs text-gray-400 border-t border-gray-200 pt-3">
            <p>VarejoSync ERP - Documento Auxiliar</p>
            <p>Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
          </div>

        </div>

        {/* Botões - Escondidos na impressão */}
        <div className="absolute top-4 right-4 flex gap-2 print:hidden">
           <Button variant="outline" size="sm" onClick={() => window.print()} className="shadow-sm">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose} className="shadow-sm">
            Fechar
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
