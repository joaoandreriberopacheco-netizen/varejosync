import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Pencil, Plus, Search } from 'lucide-react';
import { Command as CommandPrimitive } from 'cmdk';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { salvarCentroCustoRegistro } from '@/lib/folhaPrevisaoService';
import { useToast } from '@/components/ui/use-toast';

function FolhaCentroCustoFormDialog({ open, onClose, centro, onSave, saving }) {
  const [nome, setNome] = useState('');
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (!open) return;
    setNome(centro?.nome || '');
    setAtivo(centro?.ativo !== false);
  }, [open, centro]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave?.({
      ...centro,
      nome: nome.trim(),
      ativo,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>{centro?.id ? 'Editar centro de custo' : 'Novo centro de custo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Loja, Casa, Fábrica"
              required
              autoFocus
            />
          </div>
          <label className="flex items-center gap-2">
            <Checkbox checked={ativo} onCheckedChange={(v) => setAtivo(Boolean(v))} />
            <span className="text-sm">Ativo</span>
          </label>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !nome.trim()}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function FolhaCentroCustoSelect({
  centros = [],
  value = '',
  onValueChange,
  onCentrosChange,
  disabled,
  allowEmpty = true,
}) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [centroForm, setCentroForm] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const { toast } = useToast();

  const ativos = useMemo(
    () => (centros || []).filter((c) => c?.ativo !== false && String(c?.nome || '').trim()),
    [centros],
  );

  const selecionado = useMemo(() => {
    const nome = String(value || '').trim();
    if (!nome) return null;
    return ativos.find((c) => String(c.nome).toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR')) || {
      nome,
    };
  }, [ativos, value]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLocaleLowerCase('pt-BR');
    if (!q) return ativos;
    return ativos.filter((c) => String(c.nome || '').toLocaleLowerCase('pt-BR').includes(q));
  }, [ativos, busca]);

  const handleSelect = (centro) => {
    onValueChange?.(centro?.nome || '');
    setOpen(false);
    setBusca('');
  };

  const handleSalvarCentro = async (payload) => {
    setSalvando(true);
    try {
      const lista = await salvarCentroCustoRegistro({
        id: payload.id || null,
        nome: payload.nome,
        ativo: payload.ativo !== false,
        ordem: payload.ordem,
      });
      await onCentrosChange?.(lista);
      onValueChange?.(payload.nome);
      setCentroForm(null);
      setOpen(false);
      setBusca('');
      toast({ title: payload.id ? 'Centro atualizado' : 'Centro criado' });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  const abrirFormCentro = (centro) => {
    setOpen(false);
    setCentroForm(centro || {});
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal h-10 px-3',
              !selecionado && 'text-muted-foreground',
            )}
          >
            <span className="truncate">{selecionado?.nome || 'Selecione'}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center gap-1 border-b px-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
                <Search className="h-4 w-4 shrink-0 opacity-50" />
                <CommandPrimitive.Input
                  value={busca}
                  onValueChange={setBusca}
                  placeholder="Buscar centro..."
                  className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                aria-label="Novo centro de custo"
                onClick={() => abrirFormCentro({})}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CommandList>
              <CommandEmpty>Nenhum centro encontrado.</CommandEmpty>
              <CommandGroup>
                {allowEmpty && (
                  <CommandItem value="__none__" onSelect={() => handleSelect({ nome: '' })}>
                    <Check
                      className={cn('h-4 w-4 shrink-0', !value ? 'opacity-100' : 'opacity-0')}
                    />
                    <span className="text-muted-foreground">Sem centro</span>
                  </CommandItem>
                )}
                {filtrados.map((centro) => (
                  <CommandItem
                    key={centro.id || centro.nome}
                    value={centro.nome}
                    onSelect={() => handleSelect(centro)}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        String(value).toLocaleLowerCase('pt-BR') ===
                          String(centro.nome).toLocaleLowerCase('pt-BR')
                          ? 'opacity-100'
                          : 'opacity-0',
                      )}
                    />
                    <span className="flex-1 truncate">{centro.nome}</span>
                    {centro.id && (
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={`Editar ${centro.nome}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          abrirFormCentro(centro);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <FolhaCentroCustoFormDialog
        open={Boolean(centroForm)}
        onClose={() => setCentroForm(null)}
        centro={centroForm}
        onSave={handleSalvarCentro}
        saving={salvando}
      />
    </>
  );
}
