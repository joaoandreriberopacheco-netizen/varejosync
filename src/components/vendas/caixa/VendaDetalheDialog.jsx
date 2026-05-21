import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Ban, Printer } from 'lucide-react';
import { formatarDataHora } from '@/components/utils/dateUtils';
import VendaContextoLinha from '@/components/vendas/VendaContextoLinha';
import VendaHistoricoIntegrado from '@/components/vendas/VendaHistoricoIntegrado';
import ComprovanteCompra from '@/components/vendas/ComprovanteCompra';
import CancelarVendaCaixaDialog from '@/components/vendas/caixa/CancelarVendaCaixaDialog';
import { getContextoPedido } from '@/lib/contextoVendaIntegrado';

export default function VendaDetalheDialog({
  venda,
  onClose,
  formatValor,
  indiceContexto,
  turno,
  operadorNome,
  onVendaCancelada,
  podeCancelar = true,
}) {
  const [showCancelar, setShowCancelar] = useState(false);
  const [showComprovante, setShowComprovante] = useState(false);

  if (!venda) return null;

  const ctx = getContextoPedido(indiceContexto, venda.id);
  const jaCancelada = ctx.cancelado || (venda.status || '').toLowerCase() === 'cancelado';

  return (
    <>
      <Dialog open={!!venda} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:text-gray-200">
          <DialogHeader>
            <DialogTitle className="text-lg text-gray-800 dark:text-gray-200">
              Detalhes da Venda - {venda.numero}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <VendaContextoLinha contexto={ctx} formatValor={formatValor} />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Cliente:</span>
                <p className="font-medium text-gray-800 dark:text-gray-200">{venda.cliente_nome}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Vendedor:</span>
                <p className="font-medium text-gray-800 dark:text-gray-200">{venda.vendedor_nome}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Horário:</span>
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  {formatarDataHora(venda.created_date)}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Pagamento:</span>
                {venda.pagamentos?.map((p, idx) => (
                  <p key={idx} className="font-medium text-gray-800 dark:text-gray-200">
                    {p.forma_pagamento} - {formatValor(p.valor)}
                  </p>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Itens da Venda</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venda.itens?.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.produto_nome}</TableCell>
                      <TableCell className="text-right">{item.quantidade}</TableCell>
                      <TableCell className="text-right">{formatValor(item.preco_unitario_praticado)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatValor(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">{formatValor(venda.subtotal)}</span>
              </div>
              {venda.valor_desconto > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Desconto:</span>
                  <span className="font-medium text-red-600 dark:text-red-400">-{formatValor(venda.valor_desconto)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-800 dark:text-gray-200">Total:</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatValor(venda.valor_total)}</span>
              </div>
            </div>

            <VendaHistoricoIntegrado pedido={venda} indiceContexto={indiceContexto} />

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowComprovante(true)}>
                <Printer className="w-4 h-4 mr-1" />
                Comprovante
              </Button>
              {podeCancelar && !jaCancelada && (
                <Button variant="destructive" size="sm" onClick={() => setShowCancelar(true)}>
                  <Ban className="w-4 h-4 mr-1" />
                  Cancelar venda
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CancelarVendaCaixaDialog
        open={showCancelar}
        onOpenChange={setShowCancelar}
        pedido={venda}
        turno={turno}
        operadorNome={operadorNome}
        formatValor={formatValor}
        onSuccess={() => {
          onClose?.();
          onVendaCancelada?.();
        }}
      />

      <ComprovanteCompra
        pedido={venda}
        indiceContexto={indiceContexto}
        open={showComprovante}
        onClose={() => setShowComprovante(false)}
      />
    </>
  );
}
