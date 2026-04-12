import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CheckCircle2 } from 'lucide-react';

const R = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function PagamentoLoteDialog({ open, onOpenChange, contas, contaId, setContaId, dataPagamento, setDataPagamento, selecionados, onConfirm, loading }) {
  const total = selecionados.reduce((acc, item) => acc + Math.abs(item.valor || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-0 bg-white dark:bg-gray-900 shadow-xl">
        <DialogHeader>
          <DialogTitle className="font-glacial text-gray-900 dark:text-white">Pagar em lote</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 space-y-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{selecionados.length} lançamento(s)</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total selecionado</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{R(total)}</p>
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Conta de entrada/saída</Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger className="rounded-2xl border-0 bg-gray-100 dark:bg-gray-800">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {contas.map((conta) => (
                  <SelectItem key={conta.id} value={conta.id}>{conta.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Data do pagamento</Label>
            <input autoComplete="off"
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              className="w-full h-11 px-4 rounded-2xl border-0 bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-white outline-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={loading || !contaId || !dataPagamento} className="bg-emerald-600 hover:bg-emerald-700 rounded-2xl">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {loading ? 'Processando...' : 'Confirmar lote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}