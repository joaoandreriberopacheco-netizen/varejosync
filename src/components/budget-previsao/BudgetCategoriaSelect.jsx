import React, { useMemo, useState } from 'react';
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
import { cn } from '@/lib/utils';
import BudgetCategoriaDialog from '@/components/budget-previsao/BudgetCategoriaDialog';
import { salvarCategoriaDespesa } from '@/lib/budgetService';
import { useToast } from '@/components/ui/use-toast';

export default function BudgetCategoriaSelect({
  categorias = [],
  value,
  onValueChange,
  onCategoriasChange,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [categoriaForm, setCategoriaForm] = useState(null);
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);
  const { toast } = useToast();

  const selecionada = useMemo(
    () => categorias.find((c) => c.id === value) || null,
    [categorias, value],
  );

  const filtradas = useMemo(() => {
    const q = busca.trim().toLocaleLowerCase('pt-BR');
    if (!q) return categorias;
    return categorias.filter((c) => String(c.nome || '').toLocaleLowerCase('pt-BR').includes(q));
  }, [categorias, busca]);

  const handleSelect = (cat) => {
    onValueChange?.(cat);
    setOpen(false);
    setBusca('');
  };

  const handleSalvarCategoria = async (payload) => {
    setSalvandoCategoria(true);
    try {
      const saved = await salvarCategoriaDespesa(payload);
      await onCategoriasChange?.();
      onValueChange?.({ id: saved.id, nome: saved.nome });
      setCategoriaForm(null);
      setOpen(false);
      setBusca('');
      toast({ title: payload.id ? 'Categoria atualizada' : 'Categoria criada' });
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSalvandoCategoria(false);
    }
  };

  const abrirFormCategoria = (cat) => {
    setOpen(false);
    setCategoriaForm(cat || {});
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
              !selecionada && 'text-muted-foreground',
            )}
          >
            <span className="truncate">{selecionada?.nome || 'Selecione'}</span>
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
                  placeholder="Buscar categoria..."
                  className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                aria-label="Nova categoria"
                onClick={() => abrirFormCategoria({})}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CommandList>
              <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
              <CommandGroup>
                {filtradas.map((cat) => (
                  <CommandItem
                    key={cat.id}
                    value={cat.id}
                    onSelect={() => handleSelect(cat)}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn('h-4 w-4 shrink-0', value === cat.id ? 'opacity-100' : 'opacity-0')}
                    />
                    <span className="flex-1 truncate">{cat.nome}</span>
                    <button
                      type="button"
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Editar ${cat.nome}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        abrirFormCategoria(cat);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <BudgetCategoriaDialog
        open={Boolean(categoriaForm)}
        onClose={() => setCategoriaForm(null)}
        categoria={categoriaForm}
        onSave={handleSalvarCategoria}
        saving={salvandoCategoria}
      />
    </>
  );
}
