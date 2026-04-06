import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const TZ = 'America/Rio_Branco';
const formatarDataHoraLocal = (data) => data ? new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}).format(new Date(data)) : '—';

export default function VendaDetalheDialog({ venda, onClose, formatValor }) {
  if (!venda) return null;
  return (
    <Dialog open={!!venda} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:text-gray-200">
        <DialogHeader>
          <DialogTitle className="text-lg text-gray-800 dark:text-gray-200">
            Detalhes da Venda - {venda.numero}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
                {formatarDataHoraLocal(venda.created_date)}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}