import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default function EnvioFinanceiroLoteDialog({
  open,
  onOpenChange,
  formaPagamento,
  onFormaPagamentoChange,
  dataPrimeiroVencimento,
  onDataPrimeiroVencimentoChange,
  quantidadeSelecionados,
  onConfirm,
  loading,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-0 shadow-2xl bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white font-glacial">
            Enviar para o financeiro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {quantidadeSelecionados} pedido(s) selecionado(s)
          </p>

          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">
              Forma de pagamento
            </Label>
            <Select value={formaPagamento} onValueChange={onFormaPagamentoChange}>
              <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-0 h-11 shadow-sm">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 border-0 shadow-lg z-[9999]">
                <SelectItem value="À Vista">À Vista</SelectItem>
                <SelectItem value="Parcelado">Parcelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">
              {formaPagamento === 'À Vista' ? 'Data de pagamento' : 'Primeiro vencimento'}
            </Label>
            <Input
              type="date"
              value={dataPrimeiroVencimento}
              onChange={(e) => onDataPrimeiroVencimentoChange(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border-0 h-11 shadow-sm"
            />
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-0 shadow-sm">
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {loading ? 'Enviando...' : 'Confirmar envio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}