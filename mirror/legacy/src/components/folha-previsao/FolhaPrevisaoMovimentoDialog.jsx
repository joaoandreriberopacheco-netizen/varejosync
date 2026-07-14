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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MOVIMENTO_LABELS } from '@/lib/folhaPrevisaoCalculos';
import { dataHoje } from '@/components/utils/dateUtils';

export default function FolhaPrevisaoMovimentoDialog({ open, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    tipo: 'vale',
    descricao: '',
    valor: '',
    data: dataHoje(),
  });

  const handleSave = () => {
    const valor = parseFloat(form.valor);
    if (!valor || valor <= 0) return;
    onSave({
      tipo: form.tipo,
      descricao: form.descricao || MOVIMENTO_LABELS[form.tipo],
      valor,
      data: form.data,
    });
    setForm({ tipo: 'vale', descricao: '', valor: '', data: dataHoje() });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar movimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(MOVIMENTO_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder={MOVIMENTO_LABELS[form.tipo]}
            />
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
            />
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.valor}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
