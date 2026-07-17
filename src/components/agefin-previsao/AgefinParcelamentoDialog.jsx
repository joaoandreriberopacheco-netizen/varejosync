import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  formatCompetenciaLabel,
  formatCurrency,
  valorEfetivoCompetencia,
} from '@/lib/agefinPrevisaoCalculos';
import { gerarParcelasProposta } from '@/lib/agefinParcelamentoCalculos';

export default function AgefinParcelamentoDialog({
  open,
  onClose,
  competencia,
  modelo,
  onConfirm,
  saving,
}) {
  const valorBase = useMemo(
    () => valorEfetivoCompetencia(competencia, modelo),
    [competencia, modelo],
  );
  const diaPadrao = modelo?.dia_vencimento || competencia?.dia_vencimento || 10;

  const [totalParcelas, setTotalParcelas] = useState(3);
  const [jurosMulta, setJurosMulta] = useState(0);

  useEffect(() => {
    if (!open) return;
    setTotalParcelas(3);
    setJurosMulta(0);
  }, [open, competencia?.id]);

  const preview = useMemo(
    () =>
      competencia
        ? gerarParcelasProposta({
            competenciaOrigem: competencia.competencia,
            valorOriginal: valorBase,
            jurosMulta: parseFloat(jurosMulta) || 0,
            totalParcelas: parseInt(totalParcelas, 10) || 1,
            diaVencimento: diaPadrao,
          })
        : [],
    [competencia, valorBase, jurosMulta, totalParcelas, diaPadrao],
  );

  const totalGeral = preview.reduce((s, p) => s + (Number(p.valor) || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!competencia || !modelo) return;
    onConfirm?.({
      serieId: competencia.serie_id,
      competenciaOrigem: competencia.competencia,
      valorOriginal: valorBase,
      jurosMulta: parseFloat(jurosMulta) || 0,
      totalParcelas: parseInt(totalParcelas, 10) || 1,
      diaVencimento: diaPadrao,
      modelo,
    });
  };

  if (!competencia) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Parcelar conta</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {competencia.serie_nome} · {formatCompetenciaLabel(competencia.competencia)}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl bg-muted/40 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor da conta</span>
              <span className="font-medium tabular-nums">{formatCurrency(valorBase)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantas parcelas</Label>
              <Input
                type="number"
                min={2}
                max={60}
                value={totalParcelas}
                onChange={(e) => setTotalParcelas(e.target.value)}
              />
            </div>
            <div>
              <Label>Juros / multa (total)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={jurosMulta}
                onChange={(e) => setJurosMulta(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Pré-visualização</p>
            <ul className="space-y-1.5 max-h-48 overflow-y-auto">
              {preview.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between text-sm rounded-lg bg-muted/30 px-3 py-2"
                >
                  <span>
                    {p.numero}/{preview.length} · {formatCompetenciaLabel(p.competencia)}
                  </span>
                  <span className="font-medium tabular-nums">{formatCurrency(p.valor)}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-2 text-right">
              Total: <span className="font-medium text-foreground">{formatCurrency(totalGeral)}</span>
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            No mês original a conta fica visível como referência (não entra na soma). Depois pode editar
            valor e vencimento de cada parcela.
          </p>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || preview.length < 2}>
              {saving ? 'A guardar...' : 'Confirmar parcelamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
