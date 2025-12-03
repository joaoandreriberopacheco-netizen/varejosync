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
      <DialogContent className="max-w-md p-0">
        <div className="bg-white p-6" style={{ fontFamily: 'Courier New, monospace', fontSize: '12px' }}>
          {/* Cabeçalho */}
          <div className="text-center border-b-2 border-dashed border-gray-400 pb-4 mb-4">
            <h1 className="text-xl font-bold">VAREJOSYNC</h1>
            <p className="text-xs">Sistema de Gestão Integrada</p>
            <p className="text-xs mt-2">COMPROVANTE DE VENDA</p>
          </div>

          {/* Informações do Pedido */}
          <div className="space-y-1 text-xs mb-4">
            <div className="flex justify-between">
              <span>Pedido:</span>
              <span className="font-bold">{pedido.numero}</span>
            </div>
            <div className="flex justify-between">
              <span>Data:</span>
              <span>{format(new Date(pedido.created_date || new Date()), 'dd/MM/yyyy HH:mm')}</span>
            </div>
            <div className="flex justify-between">
              <span>Cliente:</span>
              <span>{pedido.cliente_nome}</span>
            </div>
            <div className="flex justify-between">
              <span>Vendedor:</span>
              <span>{pedido.vendedor_nome}</span>
            </div>
          </div>

          {/* Itens */}
          <div className="border-t-2 border-b-2 border-dashed border-gray-400 py-3 mb-3">
            <div className="text-xs font-bold mb-2">ITENS</div>
            {pedido.itens?.map((item, idx) => (
              <div key={idx} className="mb-2">
                <div className="font-medium">{item.produto_nome}</div>
                <div className="flex justify-between text-xs">
                  <span>{item.quantidade} x R$ {formatValor(item.preco_unitario_praticado)}</span>
                  <span className="font-bold">R$ {formatValor(item.total)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totais */}
          <div className="space-y-1 text-xs mb-4">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>R$ {formatValor(pedido.subtotal)}</span>
            </div>
            {pedido.valor_desconto > 0 && (
              <div className="flex justify-between">
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
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-300">
              <span>TOTAL:</span>
              <span>R$ {formatValor(pedido.valor_total)}</span>
            </div>
          </div>

          {/* Formas de Pagamento */}
          {pedido.pagamentos && pedido.pagamentos.length > 0 && (
            <div className="border-t-2 border-dashed border-gray-400 pt-3 mb-4">
              <div className="text-xs font-bold mb-2">PAGAMENTO</div>
              {pedido.pagamentos.map((pag, idx) => (
                <div key={idx} className="flex justify-between text-xs mb-1">
                  <span>{pag.forma_pagamento}</span>
                  <span>R$ {formatValor(pag.valor)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Rodapé */}
          <div className="text-center text-xs border-t-2 border-dashed border-gray-400 pt-4">
            <p>Obrigado pela preferência!</p>
            <p className="mt-2">{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
          </div>

          {/* Botão de Impressão (não aparece na impressão) */}
          <div className="mt-6 flex justify-center gap-3 print:hidden">
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}