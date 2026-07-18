import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { P38_FIELD_SURFACE } from '@/components/financeiro/fluxo/financeiroP38';

export default function FolhaPrevisaoFiltros({
  busca,
  onBuscaChange,
  centro,
  onCentroChange,
  centrosRegistrados = [],
  className,
}) {
  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center', className)}>
      <div className={cn('relative min-w-0 flex-1 sm:min-w-[200px] sm:max-w-xs rounded-xl', P38_FIELD_SURFACE)}>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => onBuscaChange?.(e.target.value)}
          placeholder="Buscar por nome"
          className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
          aria-label="Buscar por nome"
        />
      </div>

      <Select value={centro || '__todos__'} onValueChange={onCentroChange}>
        <SelectTrigger className={cn('w-full sm:w-[200px] rounded-xl', P38_FIELD_SURFACE)}>
          <SelectValue placeholder="Centro de custo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__todos__">Todos os centros</SelectItem>
          <SelectItem value="__sem__">Sem centro de custo</SelectItem>
          {centrosRegistrados.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
