import React from 'react';
import { Check, Loader2, MessageCircle, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from './quickBudgetUtils';

export default function QuickBudgetCartView({
  items,
  summary,
  desconto,
  setDesconto,
  tipoDesconto,
  setTipoDesconto,
  onSaveCart,
  onClose,
  onShare,
  isSharing,
  compact = false,
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-3xl bg-card shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Carrinho</p>
            <p className="text-sm text-foreground/90">{summary.quantidadeItens} qtd · {items.length} itens</p>
          </div>
          <div className="text-right">
            {summary.desconto > 0 && <p className="text-xs text-muted-foreground line-through">{formatCurrency(summary.subtotal)}</p>}
            <p className="text-2xl font-bold text-foreground font-glacial">{formatCurrency(summary.total)}</p>
          </div>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.item_key || item.produto_id} className="rounded-2xl bg-muted/50 px-3 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.produto_nome}</p>
                <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-0.5">
                  <span>{item.quantidade} {item.unidade || 'UN'} ×</span>
                  {item.tem_ajuste_tabela && Number(item.preco_venda_lista) > 0 && (
                    <span className="line-through text-muted-foreground">{formatCurrency(item.preco_venda_lista)}</span>
                  )}
                  <span className={item.tem_ajuste_tabela && Number(item.preco_venda_lista) > 0 ? 'font-semibold text-foreground/90' : ''}>
                    {formatCurrency(item.preco_unitario)}
                  </span>
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(item.total)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Desconto no carrinho */}
      <div className="rounded-3xl bg-card shadow-sm p-4 space-y-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Desconto</span>
        <div className="flex gap-1.5 items-center">
          <div className="relative flex-1">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={desconto}
              onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
              className="pr-5 h-10 bg-muted/50 border-0 shadow-sm rounded-xl text-sm text-right focus:ring-1 focus:ring-border/40 dark:focus:ring-ring"
              placeholder="0"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              {tipoDesconto === 'percentual' ? '%' : 'R$'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setTipoDesconto(tipoDesconto === 'percentual' ? 'fixo' : 'percentual')}
            className="h-10 px-3 bg-muted rounded-xl text-[10px] font-semibold text-foreground/90"
          >
            {tipoDesconto === 'percentual' ? '%' : 'R$'}
          </button>
        </div>
        {summary.descontoCarrinho > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            Desconto aplicado: −{formatCurrency(summary.descontoCarrinho)}
          </p>
        )}
      </div>

      <Button
        type="button"
        onClick={onSaveCart}
        className="w-full h-12 rounded-2xl bg-background hover:bg-primary dark:bg-card dark:text-foreground shadow-none"
      >
        <ShoppingCart className="w-4 h-4 mr-2" /> Salvar carrinho
      </Button>

      {!compact && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-12 rounded-2xl border-0 bg-muted shadow-none text-foreground/90"
          >
            <Check className="w-4 h-4 mr-2" /> Concluir
          </Button>
          <Button onClick={onShare} disabled={isSharing} className="h-12 rounded-2xl bg-background hover:bg-primary dark:bg-card dark:text-foreground shadow-none">
            {isSharing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />} Compartilhar
          </Button>
        </div>
      )}

      <div className="rounded-3xl bg-card shadow-sm px-4 py-3 flex items-center gap-3 text-xs text-muted-foreground">
        <ShoppingCart className="w-4 h-4" />
        Adicionou ao carrinho e a busca volta pronta para o próximo produto.
      </div>
    </div>
  );
}
