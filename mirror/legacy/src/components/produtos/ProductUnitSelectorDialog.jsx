import React from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CaixaDialogContent } from '@/components/vendas/caixa/CaixaDialogContent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { buildPurchaseUnitOptions, buildSaleUnitOptions, formatUnitConversion } from '@/lib/productUnits';

export default function ProductUnitSelectorDialog({
  open,
  product,
  mode = 'sale',
  priceMultiplier = 1,
  onClose,
  onConfirm,
}) {
  const options = React.useMemo(() => {
    if (!product) return [];
    return mode === 'purchase'
      ? buildPurchaseUnitOptions(product)
      : buildSaleUnitOptions(product, priceMultiplier);
  }, [product, mode, priceMultiplier]);

  const [selectedUnit, setSelectedUnit] = React.useState(null);

  React.useEffect(() => {
    setSelectedUnit(options[0] || null);
  }, [options, open]);

  const moneyLabel = mode === 'purchase' ? 'Custo sugerido' : 'Preço sugerido';

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose?.()}>
      <CaixaDialogContent className="max-w-lg bg-card border-0 shadow-2xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Selecionar unidade
          </DialogTitle>
          {product && (
            <p className="text-sm text-muted-foreground mt-1">
              {product.nome}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-3 py-2">
          {options.map((option) => {
            const isSelected = selectedUnit?.unidade === option.unidade;
            return (
              <button
                key={option.unidade}
                type="button"
                onClick={() => setSelectedUnit(option)}
                className={`p38-option-card ${isSelected ? 'p38-option-card--selected' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-foreground">{option.unidade}</span>
                      {option.is_primary && (
                        <Badge className="border-0 bg-primary/20 text-primary dark:bg-primary/25 dark:text-primary">
                          Principal
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs mt-1 text-muted-foreground">
                      {formatUnitConversion(option, product?.unidade_principal)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">{moneyLabel}</div>
                    <div className="text-lg font-bold text-foreground tabular-nums">
                      R$ {(option.valor_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="border-border/40 shadow-sm rounded-xl">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => selectedUnit && onConfirm?.(selectedUnit)}
            disabled={!selectedUnit}
            className="rounded-xl p38-btn-primary"
          >
            Confirmar
          </Button>
        </DialogFooter>
      </CaixaDialogContent>
    </Dialog>
  );
}
