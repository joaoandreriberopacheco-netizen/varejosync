import React, { useState, useEffect } from 'react';
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
import {
  FREQUENCIA_SERIE,
  FREQUENCIAS_SERIE_OPCOES,
  MESES_VENCIMENTO_LABELS,
} from '@/lib/agefinPrevisaoCalculos';

export default function AgefinSerieDialog({
  open,
  onClose,
  serie,
  centrosRegistrados = [],
  onSave,
  saving,
}) {
  const [form, setForm] = useState({
    nome: '',
    terceiro_nome: '',
    categoria_nome: '',
    centro_custo: '',
    valor_previsto: 0,
    dia_vencimento: 10,
    frequencia: FREQUENCIA_SERIE.MENSAL,
    mes_vencimento: new Date().getMonth() + 1,
    observacoes: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        nome: serie?.nome || '',
        terceiro_nome: serie?.terceiro_nome || '',
        categoria_nome: serie?.categoria_nome || '',
        centro_custo: serie?.centro_custo || '',
        valor_previsto: Number(serie?.valor_previsto) || 0,
        dia_vencimento: Number(serie?.dia_vencimento) || 10,
        frequencia: serie?.frequencia || FREQUENCIA_SERIE.MENSAL,
        mes_vencimento: Number(serie?.mes_vencimento) || new Date().getMonth() + 1,
        observacoes: serie?.observacoes || '',
      });
    }
  }, [open, serie]);

  const precisaMesReferencia = form.frequencia !== FREQUENCIA_SERIE.MENSAL;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave?.({
      ...serie,
      ...form,
      valor_previsto: parseFloat(form.valor_previsto) || 0,
      dia_vencimento: parseInt(form.dia_vencimento, 10) || 10,
      mes_vencimento: parseInt(form.mes_vencimento, 10) || 1,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{serie?.id ? 'Editar conta fixa' : 'Nova conta fixa'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Nome da conta</Label>
            <Input
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Energia Loja Centro"
              required
            />
          </div>
          <div>
            <Label>Fornecedor</Label>
            <Input
              value={form.terceiro_nome}
              onChange={(e) => setForm((f) => ({ ...f, terceiro_nome: e.target.value }))}
              placeholder="Concessionária, operadora…"
            />
          </div>
          <div>
            <Label>Categoria</Label>
            <Input
              value={form.categoria_nome}
              onChange={(e) => setForm((f) => ({ ...f, categoria_nome: e.target.value }))}
              placeholder="Energia, Telefone…"
            />
          </div>
          <div>
            <Label>Periodicidade</Label>
            <Select
              value={form.frequencia}
              onValueChange={(v) => setForm((f) => ({ ...f, frequencia: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIAS_SERIE_OPCOES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              {form.frequencia === FREQUENCIA_SERIE.ANUAL
                ? 'Conta anual — aparece só no mês de vencimento escolhido.'
                : form.frequencia === FREQUENCIA_SERIE.MENSAL
                  ? 'Conta mensal — aparece em todos os meses.'
                  : `Conta ${form.frequencia.toLowerCase()} — a partir do mês de referência.`}
            </p>
          </div>
          {precisaMesReferencia && (
            <div>
              <Label>
                {form.frequencia === FREQUENCIA_SERIE.ANUAL ? 'Mês do vencimento' : 'Mês de referência'}
              </Label>
              <Select
                value={String(form.mes_vencimento)}
                onValueChange={(v) => setForm((f) => ({ ...f, mes_vencimento: parseInt(v, 10) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES_VENCIMENTO_LABELS.map((nome, idx) => (
                    <SelectItem key={nome} value={String(idx + 1)}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Centro de custo</Label>
            <Select
              value={form.centro_custo || '__sem__'}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, centro_custo: v === '__sem__' ? '' : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__sem__">Sem centro</SelectItem>
                {centrosRegistrados.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor previsto (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.valor_previsto}
                onChange={(e) => setForm((f) => ({ ...f, valor_previsto: e.target.value }))}
              />
            </div>
            <div>
              <Label>Dia vencimento</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={form.dia_vencimento}
                onChange={(e) => setForm((f) => ({ ...f, dia_vencimento: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
