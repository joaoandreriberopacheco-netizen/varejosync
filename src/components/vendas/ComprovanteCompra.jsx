import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Share2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ComprovanteCompra({ pedido, open, onClose }) {
  const printedRef = useRef(false);

  useEffect(() => {
    if (open && !printedRef.current) {
      printedRef.current = true;
      setTimeout(() => {
        window.print();
      }, 500);
    }
    if (!open) {
      printedRef.current = false;
    }
  }, [open]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pedido ${pedido.numero || 'Nº'}`,
          text: `Comprovante de pedido - ${pedido.cliente_nome}`,
        });
      } catch (err) {
        console.log('Compartilhamento cancelado ou não suportado');
      }
    } else {
      window.print();
    }
  };

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
            body { 
              margin: 0; 
              padding: 0; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
              color: #000 !important;
            }
            body * { visibility: hidden; }
            #area-comprovante, #area-comprovante * { visibility: visible; }
            /* O container ocupa 100% da largura do papel que a impressora fornecer */
            #area-comprovante { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
            
            /* Força preto em todos os textos na impressão */
            * {
              color: #000 !important;
            }
            /* Aumenta peso da fonte para impressão nítida */
            h1, h2, h3 {
              font-weight: 900 !important;
            }
            .font-semibold, .font-bold {
              font-weight: 800 !important;
            }
            .font-black {
              font-weight: 900 !important;
            }
            /* Bordas pretas sólidas */
            .border-gray-200, .border-gray-400, .border-black {
              border-color: #000 !important;
            }
          `}
        </style>

        {/* Container Principal */}
        <div 
          id="area-comprovante"
          className="bg-white p-4 sm:p-8 w-full font-sans text-gray-800 shadow-lg print:shadow-none overflow-y-auto max-h-[90vh] print:max-h-none print:overflow-visible"
        >
          
          {/* Cabeçalho */}
          <div className="text-center pb-4 mb-6 border-b-2 border-black">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-black mb-2">VAREJOSYNC</h1>
            <p className="text-base font-bold text-black">Obrigado pela sua preferência!</p>
          </div>

          {/* Informações do Pedido - Layout responsivo (Grid adapta-se ao espaço) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm sm:text-base mb-6 pb-6 border-b-2 border-black">
            <div>
              <p className="mb-2"><span className="font-bold text-black uppercase">Recibo:</span> <span className="text-black font-bold">{pedido.numero}</span></p>
              <p><span className="font-bold text-black uppercase">Data:</span> <span className="text-black font-bold">{format(new Date(pedido.created_date || new Date()), 'dd/MM/yyyy HH:mm')}</span></p>
            </div>
            <div className="sm:text-right">
              <p className="mb-2"><span className="font-bold text-black uppercase">Cliente:</span> <span className="text-black font-bold">{pedido.cliente_nome}</span></p>
            </div>
          </div>

          {/* Lista de Itens - Simples e Legível */}
          <div className="mb-6">
            <h3 className="text-base font-black text-black uppercase mb-4 pb-2 border-b border-black">
              Itens do Pedido
            </h3>
            
            {pedido.itens?.map((item, idx) => (
              <div 
                key={idx} 
                className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-400"
              >
                {/* Descrição do Produto */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base sm:text-lg text-black break-words leading-tight">
                    {item.produto_nome}
                  </p>
                  {/* Visível apenas no 80mm (Mobile/Estreito) */}
                  <p className="text-sm font-bold text-black mt-2 sm:hidden">
                    Qtd: <span className="font-black text-2xl">{item.quantidade}</span> x R$ {formatValor(item.preco_unitario_praticado)}
                  </p>
                </div>
                
                {/* Valores (Preço unitário e Total) */}
                <div className="flex justify-end items-center gap-8 sm:gap-10">
                  {/* Quantidade e Preço - Visível apenas no A4 (Desktop/Largo) */}
                  <div className="hidden sm:flex flex-col items-center min-w-[70px]">
                    <span className="text-xs font-bold uppercase text-black mb-1">Qtd</span>
                    <span className="font-black text-3xl text-black">{item.quantidade}</span>
                  </div>
                  
                  <div className="hidden sm:flex flex-col items-end min-w-[100px]">
                    <span className="text-xs font-bold uppercase text-black mb-1">Preço Un.</span>
                    <span className="font-bold text-base text-black">R$ {formatValor(item.preco_unitario_praticado)}</span>
                  </div>
                  
                  {/* Total do Item - Visível em ambos */}
                  <div className="flex flex-col items-end min-w-[100px]">
                    <span className="text-xs font-bold uppercase text-black mb-1 hidden sm:block">Total</span>
                    <span className="font-black text-base sm:text-lg text-black">
                      R$ {formatValor(item.total)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Valores Totais */}
          <div className="border-t-2 border-black pt-6 mb-6 flex flex-col items-end">
            <div className="w-full sm:w-1/2 space-y-3 text-sm sm:text-base">
              <div className="flex justify-between font-bold text-black">
                <span>Subtotal:</span>
                <span>R$ {formatValor(pedido.subtotal)}</span>
              </div>
              
              {pedido.valor_desconto > 0 && (
                <div className="flex justify-between font-bold text-black">
                  <span>Desconto:</span>
                  <span>- R$ {formatValor(pedido.valor_desconto)}</span>
                </div>
              )}
              
              {pedido.valor_acrescimo > 0 && (
                <div className="flex justify-between font-bold text-black">
                  <span>Acréscimo:</span>
                  <span>+ R$ {formatValor(pedido.valor_acrescimo)}</span>
                </div>
              )}
              
              <div className="flex justify-between font-black text-xl sm:text-2xl text-black pt-4 border-t-2 border-black mt-3">
                <span>TOTAL:</span>
                <span>R$ {formatValor(pedido.valor_total)}</span>
              </div>
            </div>
          </div>

          {/* Formas de Pagamento */}
          {pedido.pagamentos && pedido.pagamentos.length > 0 && (
            <div className="text-sm sm:text-base mb-6 pb-6 border-b-2 border-black">
              <p className="font-black text-black uppercase mb-3">Formas de Pagamento</p>
              {pedido.pagamentos.map((pag, idx) => (
                <div key={idx} className="flex justify-between text-black font-bold py-2">
                  <span>{pag.forma_pagamento}</span>
                  <span>R$ {formatValor(pag.valor)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Rodapé */}
          <div className="text-center text-xs sm:text-sm font-bold text-black border-t-2 border-black pt-4">
            <p>VarejoSync ERP - Documento Auxiliar</p>
            <p className="mt-2">Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
          </div>

        </div>

        {/* Botões - Escondidos na impressão */}
        <div className="absolute top-4 right-4 flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handleShare} className="shadow-sm">
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
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