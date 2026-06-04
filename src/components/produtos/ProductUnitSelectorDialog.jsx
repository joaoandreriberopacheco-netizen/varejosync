import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
      <DialogContent className="max-w-lg bg-card border-0 shadow-2xl rounded-3xl">
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
                className={`w-full rounded-2xl p-4 text-left transition-all shadow-sm ${
                  isSelected
                    ? 'bg-background text-white dark:bg-card dark:text-foreground'
                    : 'bg-muted/40 text-foreground dark:bg-muted dark:text-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold">{option.unidade}</span>
                      {option.is_primary && (
                        <Badge className={`border-0 ${isSelected ? 'bg-card/15 text-white dark:bg-muted dark:text-foreground' : 'bg-card text-foreground/90 dark:bg-background dark:text-foreground'}`}>
                          Principal
                        </Badge>
                      )}
                    </div>
                    <p className={`text-xs mt-1 ${isSelected ? 'text-white/75 dark:text-muted-foreground' : 'text-muted-foreground'}`}>
                      {formatUnitConversion(option, product?.unidade_principal)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs opacity-70">{moneyLabel}</div>
                    <div className="text-lg font-bold">
                      R$ {(option.valor_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="border-0 shadow-sm rounded-xl">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => selectedUnit && onConfirm?.(selectedUnit)}
            disabled={!selectedUnit}
            className="rounded-xl"
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}