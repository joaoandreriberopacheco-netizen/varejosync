import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Receipt, Truck, FileText, User, CalendarDays, Package } from 'lucide-react';

const formatCurrency = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
};

export default function PedidoCompraResumoDialog({ open, onOpenChange, pedido }) {
  if (!pedido) return null;

  const itens = pedido.itens || [];
  const subtotal = itens.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
  const total = Number(pedido.valor_total) || 0;
  const diferenca = total - subtotal;
  const desconto = diferenca < 0 ? Math.abs(diferenca) : 0;
  const acrescimo = diferenca > 0 ? diferenca : 0;
  const formaPagamento = pedido.forma_pagamento || pedido.condicao_pagamento || '—';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[calc(100vw-1.5rem)] max-h-[88vh] p-0 overflow-hidden rounded-3xl border-0 shadow-2xl bg-white dark:bg-gray-900">
        <DialogHeader className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white font-glacial flex items-center gap-2">
                <Receipt className="w-5 h-5 text-gray-400" />
                {pedido.numero || 'Pedido de Compra'}
              </DialogTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {pedido.fornecedor_nome || 'Fornecedor não informado'}
              </p>
            </div>
            <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 border-0 shadow-sm">
              {pedido.status || '—'}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(88vh-76px)]">
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/70 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Cabeçalho</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-gray-500 dark:text-gray-400">Fornecedor</span><span className="text-right text-gray-900 dark:text-gray-100">{pedido.fornecedor_nome || '—'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500 dark:text-gray-400">Emissão</span><span className="text-right text-gray-900 dark:text-gray-100">{formatDate(pedido.data_emissao || pedido.created_date)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500 dark:text-gray-400">Prazo de entrega</span><span className="text-right text-gray-900 dark:text-gray-100">{formatDate(pedido.data_prevista_entrega)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500 dark:text-gray-400">Forma de pagamento</span><span className="text-right text-gray-900 dark:text-gray-100">{formaPagamento}</span></div>
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/70 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Log</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-gray-500 dark:text-gray-400">Criado por</span><span className="text-right text-gray-900 dark:text-gray-100">{pedido.created_by || '—'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500 dark:text-gray-400">Criado em</span><span className="text-right text-gray-900 dark:text-gray-100">{formatDate(pedido.created_date)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-gray-500 dark:text-gray-400">Atualizado em</span><span className="text-right text-gray-900 dark:text-gray-100">{formatDate(pedido.updated_date)}</span></div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Itens</h3>
              </div>
              <div className="space-y-2">
                {itens.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum item informado</p>
                ) : (
                  itens.map((item, index) => (
                    <div key={`${item.produto_id || item.produto_nome || 'item'}-${index}`} className="rounded-2xl bg-gray-50 dark:bg-gray-900/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.produto_nome || 'Item'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {Number(item.quantidade) || 0} {item.unidade_medida || 'un'} × {formatCurrency(item.custo_unitario || 0)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{formatCurrency(item.total || 0)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Totais</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Subtotal</span><span className="text-gray-900 dark:text-gray-100">{formatCurrency(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Descontos</span><span className="text-red-600 dark:text-red-400">{formatCurrency(desconto)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Acréscimos</span><span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(acrescimo)}</span></div>
                  <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between">
                    <span className="font-semibold text-gray-800 dark:text-gray-100">Total</span>
                    <span className="font-bold text-lg text-gray-900 dark:text-white font-glacial">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Observações</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {pedido.observacoes || 'Sem observações.'}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}