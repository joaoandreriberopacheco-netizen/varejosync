import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Minus, Plus, ShoppingCart, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { pickDefaultSaleUnit, getUnidadeExibicaoSigla } from '@/lib/productUnits';

export default function ProductDetailDialog({ isOpen, onClose, product, onConfirm }) {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen) setQuantity(1);
  }, [isOpen]);

  if (!product) return null;
  const displayUnit = pickDefaultSaleUnit(product, 1) || { unidade: getUnidadeExibicaoSigla(product), valor_unitario: product.preco_venda_padrao || 0 };

  const handleIncrement = () => setQuantity(q => q + 1);
  const handleDecrement = () => setQuantity(q => Math.max(1, q - 1));

  const total = (displayUnit.valor_unitario || 0) * quantity;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-0 rounded-3xl p-0 overflow-hidden">
        <div className="relative h-64 bg-muted flex items-center justify-center">
          {product.imagem_url ? (
            <img src={product.imagem_url} alt={product.nome} className="w-full h-full object-cover" />
          ) : (
            <div className="text-muted-foreground dark:text-muted-foreground">
              <ShoppingCart className="w-24 h-24 opacity-20" />
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground leading-tight mb-2">
              {product.nome}
            </h2>
            <div className="flex items-center gap-3">
               <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                 R$ {(displayUnit.valor_unitario || 0).toFixed(2)}
               </span>
               <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                 {displayUnit.unidade || 'UN'}
               </span>
            </div>
            {product.descricao && (
               <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                 {product.descricao}
               </p>
            )}
          </div>

          <div className="bg-muted/50/50 p-4 rounded-2xl flex items-center justify-between">
            <span className="text-muted-foreground font-medium">Quantidade</span>
            <div className="flex items-center gap-4 bg-card rounded-xl p-1 shadow-sm border border-border/40">
              <button 
                onClick={handleDecrement}
                className="w-12 h-12 flex items-center justify-center text-muted-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="w-8 text-center font-bold text-xl text-foreground">{quantity}</span>
              <button 
                onClick={handleIncrement}
                className="w-12 h-12 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="h-14 px-6 rounded-xl text-muted-foreground hover:text-foreground/90 border-border/40"
            >
              Desistir
            </Button>
            <Button 
              onClick={() => {
                onConfirm(product, quantity);
                onClose();
              }}
              className="flex-1 h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20"
            >
              Adicionar • R$ {total.toFixed(2)}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}