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
import { Plus, Trash2 } from 'lucide-react';
import {
  RUBRICA_LABELS,
  criarRubricasPadrao,
  gerarIdInterno,
} from '@/lib/folhaPrevisaoCalculos';

function RubricaRow({ rubrica, onChange, onRemove }) {
  return (
    <div className="grid grid-cols-[1fr_1fr_100px_32px] gap-2 items-end">
      <div>
        <Label className="text-xs">Tipo</Label>
        <Select value={rubrica.tipo} onValueChange={(v) => onChange({ ...rubrica, tipo: v })}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RUBRICA_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Nome</Label>
        <Input
          value={rubrica.nome}
          onChange={(e) => onChange({ ...rubrica, nome: e.target.value })}
          className="h-9"
        />
      </div>
      <div>
        <Label className="text-xs">Valor</Label>
        <Input
          type="number"
          step="0.01"
          value={rubrica.valor_base ?? 0}
          onChange={(e) => onChange({ ...rubrica, valor_base: parseFloat(e.target.value) || 0 })}
          className="h-9"
        />
      </div>
      <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={onRemove}>
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  );
}

export default function FolhaPrevisaoModeloDialog({
  open,
  onClose,
  modelo,
  colaboradores = [],
  onSave,
  saving,
}) {
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    colaborador_id: '',
    dia_vencimento: 5,
    ativo: true,
    rubricas: criarRubricasPadrao(),
  });

  useEffect(() => {
    if (modelo) {
      setForm({
        nome: modelo.nome || '',
        descricao: modelo.descricao || '',
        colaborador_id: modelo.colaborador_id || '',
        dia_vencimento: modelo.dia_vencimento ?? 5,
        ativo: modelo.ativo !== false,
        rubricas: modelo.rubricas?.length ? modelo.rubricas : criarRubricasPadrao(),
      });
    } else {
      setForm({
        nome: '',
        descricao: '',
        colaborador_id: '',
        dia_vencimento: 5,
        ativo: true,
        rubricas: criarRubricasPadrao(),
      });
    }
  }, [modelo, open]);

  const colaboradorSel = colaboradores.find((c) => c.id === form.colaborador_id);

  const handleSave = () => {
    onSave({
      ...form,
      colaborador_nome: colaboradorSel?.nome || '',
    });
  };

  const updateRubrica = (idx, rub) => {
    const rubricas = [...form.rubricas];
    rubricas[idx] = rub;
    setForm({ ...form, rubricas });
  };

  const addRubrica = () => {
    setForm({
      ...form,
      rubricas: [
        ...form.rubricas,
        { id: gerarIdInterno('rub'), tipo: 'provento', nome: 'Nova rubrica', valor_base: 0, ordem: form.rubricas.length + 1 },
      ],
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modelo ? 'Editar modelo' : 'Novo modelo'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome do modelo</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <Label>Colaborador (opcional)</Label>
            <Select
              value={form.colaborador_id || '__none__'}
              onValueChange={(v) => setForm({ ...form, colaborador_id: v === '__none__' ? '' : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Modelo genérico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Modelo genérico (sem vínculo)</SelectItem>
                {colaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Dia de pagamento</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={form.dia_vencimento}
              onChange={(e) => setForm({ ...form, dia_vencimento: parseInt(e.target.value, 10) || 5 })}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Rubricas fixas</Label>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={addRubrica}>
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {form.rubricas.map((rub, idx) => (
                <RubricaRow
                  key={rub.id || idx}
                  rubrica={rub}
                  onChange={(r) => updateRubrica(idx, r)}
                  onRemove={() => setForm({ ...form, rubricas: form.rubricas.filter((_, i) => i !== idx) })}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.nome.trim() || saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
