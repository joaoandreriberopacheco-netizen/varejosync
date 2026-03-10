import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import QRCode from 'qrcode';

export default function LiberacaoEntrega({ open, onClose, pedido, cliente }) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    if (open && pedido?.id) {
      QRCode.toDataURL(pedido.id, {
        width: 150,
        margin: 0,
        color: { dark: '#000000', light: '#FFFFFF' }
      }).then(url => {
        setQrCodeUrl(url);
      });
    }
  }, [open, pedido?.id]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [open]);

  const formatValor = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };

  if (!pedido) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 bg-gray-100 flex justify-center overflow-hidden max-h-[95vh]">
        
        {/* Estilos de Impressão Fluida */}
        <style type="text/css" media="print">
          {`
            @page { margin: 0; size: auto; }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            body * { visibility: hidden; }
            #area-liberacao, #area-liberacao * { visibility: visible; }
            /* Na impressora, tira o padding para aproveitar os 80mm na totalidade */
            #area-liberacao { position: absolute; left: 0; top: 0; width: 100%; padding: 3mm; }
          `}
        </style>

        {/* Área imprimível - Fundo branco, sem caixas arredondadas */}
        <div 
          id="area-liberacao"
          className="bg-white w-full p-4 sm:p-8 font-sans text-gray-900 overflow-y-auto print:shadow-none"
        >
          {/* Botões (Visíveis apenas no ecrã) */}
          <div className="flex justify-end gap-2 mb-4 print:hidden">
            <Button onClick={() => window.print()} size="sm" className="h-8">
              <Printer className="w-3 h-3 mr-2" /> Imprimir
            </Button>
            <Button variant="outline" onClick={onClose} size="sm" className="h-8">
              <X className="w-3 h-3 mr-1" /> Fechar
            </Button>
          </div>

          {/* Cabeçalho */}
          <div className="text-center pb-3 border-b-2 border-gray-800 mb-4">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight uppercase">Liberação para Entrega</h1>
            <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest mt-1">Documento de Controle Interno</p>
          </div>

          {/* Secção de Dados (Layout Plano, estilo Talão) */}
          <div className="flex flex-col sm:flex-row gap-6 mb-6">
            
            {/* Coluna de Info (Esquerda no A4, Topo no 80mm) */}
            <div className="flex-1 text-xs sm:text-sm space-y-1.5">
              
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500">Pedido:</span>
                <span className="font-bold text-base">{pedido.numero}</span>
              </div>
              
              {pedido.senha_atendimento && (
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500">Senha:</span>
                  <span className="font-bold">{pedido.senha_atendimento}</span>
                </div>
              )}
              
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500">Data/Hora:</span>
                <span>{new Date(pedido.created_date).toLocaleDateString('pt-BR')} às {new Date(pedido.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              
              <div className="flex justify-between border-b border-gray-100 pb-1 mt-2">
                <span className="text-gray-500">Cliente:</span>
                <span className="font-bold truncate max-w-[200px]">{pedido.cliente_nome}</span>
              </div>
              
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500">Entrega:</span>
                <span className="font-bold uppercase">
                  {pedido.metodo_entrega === 'Delivery' ? '🚚 Delivery' : '🏪 Retirada no Balcão'}
                </span>
              </div>

            </div>

            {/* Coluna QR Code (Direita no A4, Fundo no 80mm) */}
            <div className="w-full sm:w-48 flex flex-col items-center justify-center pt-2 sm:pt-0">
              <span className="text-[10px] font-bold text-gray-800 mb-1 text-center">ESCANEIE PARA SEPARAR</span>
              {qrCodeUrl && (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  className="w-28 h-28 sm:w-32 sm:h-32 mb-1"
                />
              )}
            </div>
          </div>

          {/* Itens do Pedido (Estilo ClipCareers + Talão) */}
          <div className="mb-6">
            <div className="bg-gray-100 text-[10px] sm:text-xs font-bold text-gray-600 uppercase px-2 py-1.5 flex justify-between mb-1">
              <span>Qtd / Produto</span>
              <span>Total</span>
            </div>
            
            {pedido.itens?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start py-2 border-b border-gray-100 print:break-inside-avoid px-1">
                <div className="flex gap-2 min-w-0 pr-2">
                  <span className="font-bold text-sm">{item.quantidade}x</span>
                  <div className="flex flex-col">
                    <span className="font-medium text-[12px] sm:text-sm break-words leading-tight">{item.produto_nome}</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">Unit: {formatValor(item.preco_unitario_praticado)}</span>
                  </div>
                </div>
                <div className="font-bold text-[12px] sm:text-sm whitespace-nowrap">
                  {formatValor(item.total)}
                </div>
              </div>
            ))}
          </div>

          {/* Totais */}
          <div className="flex flex-col items-end text-xs sm:text-sm mb-8 pr-1">
            <div className="w-full sm:w-1/2 space-y-1">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal:</span>
                <span>{formatValor(pedido.subtotal)}</span>
              </div>
              {pedido.valor_desconto > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Desconto:</span>
                  <span>-{formatValor(pedido.valor_desconto)}</span>
                </div>
              )}
              {pedido.valor_frete > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Frete:</span>
                  <span>{formatValor(pedido.valor_frete)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm sm:text-base border-t border-gray-800 pt-1 mt-1">
                <span>VALOR TOTAL:</span>
                <span>{formatValor(pedido.valor_total)}</span>
              </div>
            </div>
          </div>

          {/* Assinaturas / Controle */}
          <div className="border-t-2 border-gray-800 pt-4 print:break-inside-avoid">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <p className="text-[10px] text-gray-500 mb-4">Separado por:</p>
                <div className="border-b border-gray-400"></div>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 mb-4">Data/Hora:</p>
                <div className="border-b border-gray-400"></div>
              </div>
              <div className="sm:col-span-2 mt-2">
                <p className="text-[10px] text-gray-500 mb-6">Assinatura do Recebedor:</p>
                <div className="border-b border-gray-400"></div>
              </div>
            </div>
          </div>

          {/* Rodapé */}
          <div className="text-center text-[9px] text-gray-400 mt-6 pt-2">
            <p>VarejoSync ERP</p>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
