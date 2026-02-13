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
            <h1 className="text-2xl font-black tracking-tight">MANAH ERP</h1>
            <p className="text-xs font-semibold">Sistema de Gestão Integrada</p>
            <p className="text-sm font-bold mt-2">SENHA DE ATENDIMENTO</p>
          </div>

          {/* Senha de Atendimento em Destaque */}
          {preVenda.senha_atendimento && (
            <div className="text-center bg-gray-200 border-2 border-black rounded-lg py-6 mb-4">
              <p className="text-xs font-black uppercase tracking-widest mb-2">SENHA</p>
              <p className="text-6xl font-black font-mono tracking-tight">{preVenda.senha_atendimento.slice(-4)}</p>
              <p className="text-xs font-semibold mt-2 text-gray-600">{preVenda.senha_atendimento}</p>
            </div>
          )}

          {/* Informações Resumidas */}
          <div className="space-y-1.5 text-sm mb-4">
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

          {/* Resumo de Itens */}
          <div className="border-t-2 border-b-2 border-dashed border-black py-3 mb-3">
            <div className="text-sm font-black mb-2">RESUMO DO PEDIDO</div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="font-semibold">Total de itens:</span>
                <span className="font-bold">{preVenda.itens?.reduce((acc, item) => acc + item.quantidade, 0) || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Produtos diferentes:</span>
                <span className="font-bold">{preVenda.itens?.length || 0}</span>
              </div>
            </div>
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
              ⏳ AGUARDANDO ATENDIMENTO NO CAIXA
            </p>
            <p className="text-xs font-semibold mt-1">Apresente esta senha no caixa para pagamento</p>
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