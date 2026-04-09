import React from 'react';
import { ArrowRight, Package, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from './quickBudgetUtils';

export default function QuickBudgetFlowItemEditor({
  selectedProduct,
  stage,
  quantity,
  price,
  onQuantityChange,
  onPriceChange,
  onNext,
  onSave,
  quantityInputRef,
  priceInputRef,
}) {
  const handleQuantityKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onNext();
    }
  };

  const handlePriceKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave();
    }
  };
  if (!selectedProduct) {
    return (
      <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-sm px-4 py-10 text-center text-sm text-gray-400">
        Pesquise e selecione um produto para seguir o fluxo.
      </div>
    );
  }

  const isFreePrice = !!selectedProduct.preco_livre;

  return (
    <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-sm p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
          <Package className="w-4 h-4 text-gray-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{selectedProduct.nome}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Estoque: {Number(selectedProduct.estoque_atual || 0)}</span>
            {selectedProduct.codigo_interno && <span>#{selectedProduct.codigo_interno}</span>}
            {isFreePrice && <span className="text-emerald-600 dark:text-emerald-400">Preço livre</span>}
          </div>
          <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(selectedProduct.preco_venda_padrao)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className={`rounded-2xl bg-gray-50 dark:bg-gray-800 shadow-sm p-3 ${stage !== 'quantity' ? 'opacity-60' : ''}`}>
          <p className="text-[11px] text-gray-400 mb-2 uppercase tracking-wide">Quantidade</p>
          <Input
            ref={quantityInputRef}
            type="number"
            inputMode="decimal"
            min="1"
            value={quantity}
            onChange={(e) => onQuantityChange(e.target.value)}
            onKeyDown={handleQuantityKeyDown}
            enterKeyHint="next"
            className="h-14 border-0 bg-white dark:bg-gray-900 rounded-2xl shadow-sm text-lg text-center font-semibold"
          />
        </div>

        {isFreePrice && (
          <div className={`rounded-2xl bg-gray-50 dark:bg-gray-800 shadow-sm p-3 ${stage !== 'price' ? 'opacity-60' : ''}`}>
            <p className="text-[11px] text-gray-400 mb-2 uppercase tracking-wide">Preço livre</p>
            <Input
              ref={priceInputRef}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              onKeyDown={handlePriceKeyDown}
              enterKeyHint="go"
              className="h-14 border-0 bg-white dark:bg-gray-900 rounded-2xl shadow-sm text-lg text-center font-semibold"
            />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {stage === 'quantity' && (
          <Button onClick={onNext} className="flex-1 h-12 rounded-2xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 shadow-none">
            <ArrowRight className="w-4 h-4 mr-2" /> Próximo
          </Button>
        )}
        {stage === 'price' && (
          <Button onClick={onSave} className="flex-1 h-12 rounded-2xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 shadow-none">
            <ShoppingCart className="w-4 h-4 mr-2" /> Salvar carrinho
          </Button>
        )}
        {!isFreePrice && stage === 'quantity' && (
          <Button onClick={onSave} variant="outline" className="h-12 rounded-2xl border-0 bg-gray-100 dark:bg-gray-800 shadow-none text-gray-700 dark:text-gray-200">
            <ShoppingCart className="w-4 h-4 mr-2" /> Salvar
          </Button>
        )}
      </div>
    </div>
  );
}