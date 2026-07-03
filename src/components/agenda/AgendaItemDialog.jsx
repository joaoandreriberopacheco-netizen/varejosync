import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { AGENDA_FREQUENCIAS, AGENDA_TIPOS } from '@/lib/agenda/agendaService';
import { notify } from '@/components/ui/notify';

const LEMBRETES = [
  { value: 0, label: 'Sem lembrete' },
  { value: 15, label: '15 min antes' },
  { value: 60, label: '1 hora antes' },
  { value: 1440, label: '1 dia antes' },
];

const emptyForm = () => ({
  titulo: '',
  tipo: 'Compromisso',
  descricao: '',
  data: new Date().toISOString().slice(0, 10),
  hora: '',
  recorrente: false,
  frequencia: 'Semanal',
  data_fim_recorrencia: '',
  lembrete_minutos: 0,
});

export default function AgendaItemDialog({ open, onOpenChange, item, user, onSaved }) {
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setForm({
        titulo: item.titulo || '',
        tipo: item.tipo || 'Compromisso',
        descricao: item.descricao || '',
        data: (item.data || '').slice(0, 10),
        hora: item.hora || '',
        recorrente: !!item.recorrente,
        frequencia: item.frequencia || 'Semanal',
        data_fim_recorrencia: (item.data_fim_recorrencia || '').slice(0, 10),
        lembrete_minutos: item.lembrete_minutos || 0,
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, item]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.titulo.trim()) {
      notify.warning('Informe um título');
      return;
    }
    if (!user?.id) {
      notify.error('Usuário não identificado');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        titulo: form.titulo.trim(),
        tipo: form.tipo,
        descricao: form.descricao.trim() || undefined,
        data: form.data,
        hora: form.hora || undefined,
        status: item?.status || 'Pendente',
        recorrente: form.recorrente,
        frequencia: form.recorrente ? form.frequencia : undefined,
        data_fim_recorrencia: form.recorrente && form.data_fim_recorrencia ? form.data_fim_recorrencia : undefined,
        lembrete_minutos: form.lembrete_minutos || undefined,
        usuario_id: user.id,
        usuario_nome: user.full_name || user.email,
      };

      await onSaved(payload, item?.id);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      notify.error('Não foi possível salvar', error?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-2 max-h-[92dvh] overflow-y-auto">
        <SheetHeader className="text-left pb-3">
          <SheetTitle className="text-base font-semibold">
            {item ? 'Editar item' : 'Novo compromisso'}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="bg-muted/40 dark:bg-muted rounded-xl px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Título *</p>
            <input
              autoComplete="off"
              value={form.titulo}
              onChange={(e) => setField('titulo', e.target.value)}
              className="w-full bg-transparent text-sm text-foreground outline-none"
              placeholder="Ex: Reunião com fornecedor"
            />
          </div>

          <div className="bg-muted/40 dark:bg-muted rounded-xl overflow-hidden">
            <Select value={form.tipo} onValueChange={(value) => setField('tipo', value)}>
              <SelectTrigger className="border-0 shadow-none bg-transparent h-11 text-sm px-4">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="z-[75]">
                {AGENDA_TIPOS.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/40 dark:bg-muted rounded-xl px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Data *</p>
              <input
                type="date"
                value={form.data}
                onChange={(e) => setField('data', e.target.value)}
                className="w-full bg-transparent text-sm text-foreground outline-none"
              />
            </div>
            <div className="bg-muted/40 dark:bg-muted rounded-xl px-4 py-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Hora</p>
              <input
                type="time"
                value={form.hora}
                onChange={(e) => setField('hora', e.target.value)}
                className="w-full bg-transparent text-sm text-foreground outline-none"
              />
            </div>
          </div>

          <div className="bg-muted/40 dark:bg-muted rounded-xl px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Descrição</p>
            <textarea
              value={form.descricao}
              onChange={(e) => setField('descricao', e.target.value)}
              rows={2}
              className="w-full bg-transparent text-sm text-foreground outline-none resize-none"
              placeholder="Detalhes opcionais"
            />
          </div>

          <div className="bg-card rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground/90">Recorrência</p>
              </div>
              <button
                type="button"
                onClick={() => setField('recorrente', !form.recorrente)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-none ${form.recorrente ? 'bg-primary dark:bg-muted' : 'bg-muted dark:bg-muted'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-card shadow transform transition-transform ${form.recorrente ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {form.recorrente && (
              <>
                <div className="bg-muted/40 dark:bg-muted rounded-xl overflow-hidden">
                  <Select value={form.frequencia} onValueChange={(value) => setField('frequencia', value)}>
                    <SelectTrigger className="border-0 shadow-none bg-transparent h-11 text-sm px-4">
                      <SelectValue placeholder="Frequência" />
                    </SelectTrigger>
                    <SelectContent className="z-[75]">
                      {AGENDA_FREQUENCIAS.map((freq) => (
                        <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-muted/40 dark:bg-muted rounded-xl px-4 py-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Encerrar em (opcional)</p>
                  <input
                    type="date"
                    value={form.data_fim_recorrencia}
                    onChange={(e) => setField('data_fim_recorrencia', e.target.value)}
                    className="w-full bg-transparent text-sm text-foreground outline-none"
                  />
                </div>
              </>
            )}
          </div>

          <div className="bg-muted/40 dark:bg-muted rounded-xl overflow-hidden">
            <Select
              value={String(form.lembrete_minutos)}
              onValueChange={(value) => setField('lembrete_minutos', Number(value))}
            >
              <SelectTrigger className="border-0 shadow-none bg-transparent h-11 text-sm px-4">
                <SelectValue placeholder="Lembrete" />
              </SelectTrigger>
              <SelectContent className="z-[75]">
                {LEMBRETES.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? 'Salvando...' : item ? 'Salvar alterações' : 'Adicionar à agenda'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
