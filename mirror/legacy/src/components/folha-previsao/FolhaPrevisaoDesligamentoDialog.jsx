import React, { useState } from 'react';
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
import { dataHoje } from '@/components/utils/dateUtils';

export default function FolhaPrevisaoDesligamentoDialog({ open, onClose, modelo, onConfirm, saving }) {
  const [data, setData] = useState(dataHoje());
  const [rescisao, setRescisao] = useState('');
  const [obs, setObs] = useState('');

  const handleConfirm = () => {
    if (!data) return;
    onConfirm({
      data_desligamento: data,
      valor_rescisao_previsto: parseFloat(rescisao) || 0,
      observacoes: obs,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar desligamento</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {modelo?.colaborador_nome || modelo?.nome} deixará de aparecer nos meses seguintes à data informada.
          O último mês ainda entra na previsão (com rescisão, se informada).
        </p>
        <div className="space-y-3">
          <div>
            <Label>Data do desligamento</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div>
            <Label>Rescisão prevista (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={rescisao}
              onChange={(e) => setRescisao(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div>
            <Label>Observação</Label>
            <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex: pediu demissão" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={saving || !data}>
            {saving ? 'Salvando…' : 'Confirmar desligamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
