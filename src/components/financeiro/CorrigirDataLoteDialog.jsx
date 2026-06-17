import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';

export default function CorrigirDataLoteDialog({
  open,
  onOpenChange,
  dataPagamento,
  setDataPagamento,
  selecionados,
  onConfirm,
  loading,
  progresso,
  tamanhoLote = 25,
}) {
  const totalLotes = Math.ceil(selecionados.length / tamanhoLote);
  const loteAtual = progresso?.total > 0 ? Math.ceil(progresso.atual / tamanhoLote) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-0 bg-card shadow-xl">
        <DialogHeader>
          <DialogTitle className="font-glacial text-foreground">Corrigir data de pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-2xl bg-muted/50 p-4 space-y-1">
            <p className="text-sm font-medium text-foreground">{selecionados.length} lançamento(s) pago(s)</p>
            <p className="text-xs text-muted-foreground">
              Apenas a data de pagamento será alterada — saldos e contas não mudam.
            </p>
            {totalLotes > 1 && (
              <p className="text-[10px] text-muted-foreground">
                Processamento em {totalLotes} lotes de {tamanhoLote}
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Nova data de pagamento</Label>
            <input
              autoComplete="off"
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              disabled={loading}
              className="w-full h-11 px-4 rounded-2xl border-0 bg-muted text-sm text-foreground outline-none disabled:opacity-50"
            />
          </div>

          {loading && progresso?.total > 0 && (
            <div className="space-y-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.round((progresso.atual / progresso.total) * 100)}%` }}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Processando lote {loteAtual}/{totalLotes}… {progresso.atual}/{progresso.total}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={loading || !dataPagamento} className="rounded-2xl">
            <Calendar className="w-4 h-4 mr-2" />
            {loading ? 'Processando...' : 'Confirmar correção'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
