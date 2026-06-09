import { formatCountQuantity } from '@/lib/inventoryCountUnits';
import { Package, ShoppingCart } from 'lucide-react';

export default function ContagemExpressFaixaCarrinho({
  itensAgrupados,
  produtoAtivoId,
  onSelecionar,
  onAbrirCarrinho,
}) {
  if (itensAgrupados.length === 0) {
    return (
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-4 py-2.5">
        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Carrinho vazio — busque um produto abaixo</span>
      </div>
    );
  }

  return (
    <div className="border-b border-border/40 bg-muted/30">
      <div className="flex items-center gap-2 px-4 py-2">
        <button
          type="button"
          onClick={onAbrirCarrinho}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          {itensAgrupados.length}
        </button>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex gap-2 pb-0.5">
            {itensAgrupados.map((grupo) => {
              const ativo = grupo.produto_id === produtoAtivoId;
              return (
                <button
                  key={grupo.produto_id}
                  type="button"
                  onClick={() => onSelecionar(grupo)}
                  className={`flex max-w-[11rem] shrink-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors ${
                    ativo
                      ? 'bg-primary/15 ring-1 ring-primary/30'
                      : 'bg-card hover:bg-muted/60'
                  }`}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-foreground">{grupo.produto_nome}</p>
                    <p className="text-xs font-bold text-foreground">
                      {formatCountQuantity(grupo.display?.quantidade ?? grupo.totalBase)}{' '}
                      <span className="font-semibold text-muted-foreground">{grupo.display?.unidade || 'UN'}</span>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
