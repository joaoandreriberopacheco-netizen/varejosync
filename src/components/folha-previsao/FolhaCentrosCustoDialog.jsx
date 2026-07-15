import React, { useEffect, useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Edit3, Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  excluirCentroCustoRegistro,
  listarCentrosCustoRegistros,
  salvarCentroCustoRegistro,
} from '@/lib/folhaPrevisaoService';
import { cn } from '@/lib/utils';

const FORM_VAZIO = { nome: '', ativo: true };

export default function FolhaCentrosCustoDialog({ open, onClose, onChanged }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [centros, setCentros] = useState([]);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);

  const carregar = async () => {
    setLoading(true);
    try {
      const lista = await listarCentrosCustoRegistros();
      setCentros(lista || []);
    } catch (e) {
      toast({
        title: 'Erro ao carregar centros',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setEditando(null);
    setForm(FORM_VAZIO);
    void carregar();
  }, [open]);

  const handleClose = () => {
    setEditando(null);
    setForm(FORM_VAZIO);
    onClose?.();
  };

  const handleSalvar = async () => {
    const nome = String(form.nome || '').trim();
    if (!nome) {
      toast({ title: 'Informe o nome do centro', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const lista = await salvarCentroCustoRegistro({
        id: editando?.id || null,
        nome,
        ativo: form.ativo !== false,
        ordem: editando?.ordem,
      });
      setCentros(lista || []);
      setEditando(null);
      setForm(FORM_VAZIO);
      onChanged?.(lista);
      toast({
        title: editando ? 'Centro atualizado' : 'Centro criado',
        description: nome,
      });
    } catch (e) {
      toast({
        title: 'Erro ao salvar centro',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = (centro) => {
    setEditando(centro);
    setForm({ nome: centro.nome || '', ativo: centro.ativo !== false });
  };

  const handleExcluir = async (centro) => {
    if (!window.confirm(`Excluir o centro "${centro.nome}"?`)) return;
    setSaving(true);
    try {
      const lista = await excluirCentroCustoRegistro(centro.id);
      setCentros(lista || []);
      if (editando?.id === centro.id) {
        setEditando(null);
        setForm(FORM_VAZIO);
      }
      onChanged?.(lista);
      toast({ title: 'Centro excluído' });
    } catch (e) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Centros de custo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
            <p className="text-xs font-medium text-foreground">
              {editando ? 'Editar centro' : 'Novo centro'}
            </p>
            <div>
              <Label>Nome</Label>
              <Input
                className="mt-1.5"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Loja, Fábrica, Casa"
                disabled={saving}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="centro-ativo"
                checked={form.ativo !== false}
                onCheckedChange={(v) => setForm({ ...form, ativo: Boolean(v) })}
                disabled={saving}
              />
              <Label htmlFor="centro-ativo" className="font-normal">
                Ativo (aparece no arrastar e no formulário)
              </Label>
            </div>
            <div className="flex gap-2">
              {editando && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditando(null);
                    setForm(FORM_VAZIO);
                  }}
                  disabled={saving}
                >
                  Cancelar edição
                </Button>
              )}
              <Button type="button" className="flex-1 gap-1.5" onClick={handleSalvar} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {editando ? 'Salvar alterações' : 'Adicionar'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Cadastrados ({centros.length})
            </p>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : centros.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
                Nenhum centro ainda. Cadastre acima para usar no arrastar e na ficha da pessoa.
              </p>
            ) : (
              <div className="space-y-1.5">
                {centros.map((centro) => (
                  <div
                    key={centro.id || centro.nome}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2.5',
                      editando?.id === centro.id && 'ring-1 ring-primary/40',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{centro.nome}</p>
                      {centro.ativo === false && (
                        <p className="text-[10px] text-muted-foreground">Inativo</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleEditar(centro)}
                      disabled={saving}
                      aria-label={`Editar ${centro.nome}`}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive"
                      onClick={() => handleExcluir(centro)}
                      disabled={saving}
                      aria-label={`Excluir ${centro.nome}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
