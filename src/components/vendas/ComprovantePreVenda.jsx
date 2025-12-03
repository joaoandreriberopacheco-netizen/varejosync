import React, { useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

export default function ComprovantePreVenda({ preVenda, open, onClose }) {
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [open]);

  if (!preVenda) return null;

  const formatValor = (valor) => {
    const num = parseFloat(valor) || 0;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0">
        <div className="bg-white p-6 text-black" style={{ fontFamily: 'Courier New, monospace', fontSize: '13px', fontWeight: 500 }}>
          {/* Cabeçalho */}
          <div className="text-center border-b-2 border-dashed border-black pb-4 mb-4">
            <h1 className="text-2xl font-black tracking-tight">VAREJOSYNC</h1>
            <p className="text-xs font-semibold">Sistema de Gestão Integrada</p>
            <p className="text-sm font-bold mt-2">PRÉ-VENDA / TICKET</p>
          </div>

          {/* Informações da Pré-Venda */}
          <div className="space-y-1.5 text-sm mb-4">
            <div className="flex justify-between">
              <span className="font-semibold">Ticket:</span>
              <span className="font-black">{preVenda.numero}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Data:</span>
              <span className="font-bold">{format(new Date(preVenda.created_date || new Date()), 'dd/MM/yyyy HH:mm')}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Cliente:</span>
              <span className="font-bold">{preVenda.cliente_nome}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Vendedor:</span>
              <span className="font-bold">{preVenda.vendedor_nome}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Método:</span>
              <span className="font-bold">{preVenda.metodo_entrega}</span>
            </div>
          </div>

          {/* Itens */}
          <div className="border-t-2 border-b-2 border-dashed border-black py-3 mb-3">
            <div className="text-sm font-black mb-3">ITENS</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black">
                  <th className="text-left font-bold pb-1 w-10">QTD</th>
                  <th className="text-left font-bold pb-1">DESCRIÇÃO</th>
                  <th className="text-right font-bold pb-1 w-20">PREÇO</th>
                  <th className="text-right font-bold pb-1 w-24">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {[...(preVenda.itens || [])]
                  .sort((a, b) => a.produto_nome.localeCompare(b.produto_nome))
                  .map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-300 last:border-b-0">
                    <td className="font-semibold py-1">{item.quantidade}</td>
                    <td className="font-semibold py-1">{item.produto_nome}</td>
                    <td className="text-right font-semibold py-1">R$ {formatValor(item.preco_unitario_praticado)}</td>
                    <td className="text-right font-black py-1">R$ {formatValor(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totais */}
          <div className="space-y-1.5 text-sm mb-4">
            <div className="flex justify-between">
              <span className="font-semibold">Subtotal:</span>
              <span className="font-bold">R$ {formatValor(preVenda.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Desconto:</span>
              <span className="font-bold">- R$ {formatValor(preVenda.valor_desconto || 0)}</span>
            </div>
            {preVenda.valor_acrescimo > 0 && (
              <div className="flex justify-between">
                <span className="font-semibold">Acréscimo:</span>
                <span className="font-bold">+ R$ {formatValor(preVenda.valor_acrescimo)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl pt-2 border-t-2 border-black">
              <span className="font-black">TOTAL:</span>
              <span className="font-black">R$ {formatValor(preVenda.valor_total)}</span>
            </div>
          </div>

          {/* Status */}
          <div className="bg-gray-100 border-2 border-black rounded p-3 mb-4 text-center">
            <p className="font-black text-sm">
              {preVenda.status === 'Aguardando Caixa' 
                ? '⏳ AGUARDANDO PAGAMENTO NO CAIXA' 
                : '✓ PRONTO PARA PAGAMENTO'}
            </p>
            <p className="text-xs font-semibold mt-1">Apresente este ticket no caixa</p>
          </div>

          {/* Rodapé */}
          <div className="text-center text-sm border-t-2 border-dashed border-black pt-4">
            <p className="font-semibold">Este não é um comprovante fiscal</p>
            <p className="mt-2 font-bold">{format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
          </div>

          {/* Botões (não aparecem na impressão) */}
          <div className="mt-6 flex justify-center gap-3 print:hidden">
            <Button onClick={() => window.print()} className="gap-2 bg-gray-800 hover:bg-gray-700">
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
            <Button variant="outline" onClick={onClose} className="border-gray-800 text-gray-800">
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}