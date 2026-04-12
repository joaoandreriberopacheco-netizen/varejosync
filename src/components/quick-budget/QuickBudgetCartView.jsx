import React from 'react';
import { Check, Loader2, MessageCircle, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from './quickBudgetUtils';

export default function QuickBudgetCartView({ items, summary, onClose, onShare, isSharing }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Carrinho</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{summary.quantidadeItens} un · {items.length} itens</p>
          </div>
          <div className="text-right">
            {summary.desconto > 0 && <p className="text-xs text-gray-400 line-through">{formatCurrency(summary.subtotal)}</p>}
            <p className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">{formatCurrency(summary.total)}</p>
          </div>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.produto_id} className="rounded-2xl bg-gray-50 dark:bg-gray-800 px-3 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.produto_nome}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-x-1 gap-y-0.5">
                  <span>{item.quantidade} ×</span>
                  {item.tem_ajuste_tabela && Number(item.preco_venda_lista) > 0 && (
                    <span className="line-through text-gray-400">{formatCurrency(item.preco_venda_lista)}</span>
                  )}
                  <span className={item.tem_ajuste_tabela && Number(item.preco_venda_lista) > 0 ? 'font-semibold text-gray-700 dark:text-gray-300' : ''}>
                    {formatCurrency(item.preco_unitario)}
                  </span>
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(item.total)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={onClose}
          className="h-12 rounded-2xl border-0 bg-gray-100 dark:bg-gray-800 shadow-none text-gray-700 dark:text-gray-200"
        >
          <Check className="w-4 h-4 mr-2" /> Concluir
        </Button>
        <Button onClick={onShare} disabled={isSharing} className="h-12 rounded-2xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 shadow-none">
          {isSharing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />} Compartilhar
        </Button>
      </div>

      <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-sm px-4 py-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <ShoppingCart className="w-4 h-4" />
        Adicionou ao carrinho e a busca volta pronta para o próximo produto.
      </div>
    </div>
  );
}