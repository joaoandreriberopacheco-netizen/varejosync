import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, extrairSalarioBase } from '@/lib/folhaPrevisaoCalculos';

export default function FolhaPrevisaoModeloRow({
  modelo,
  colaborador,
  onEdit,
  onDelete,
}) {
  const tipo = modelo.tipo_vinculo || 'funcionario';
  const salarioBase = extrairSalarioBase(modelo);
  const retiradaFixa = Number(modelo.retirada_valor_fixo) || 0;
  const nome = colaborador?.nome || modelo.colaborador_nome || modelo.nome || 'Pessoa';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0',
        'hover:bg-slate-50/80 transition-colors',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-900 truncate">{nome}</span>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] shrink-0',
              tipo === 'socio'
                ? 'border-violet-200 text-violet-700 bg-violet-50'
                : 'border-blue-200 text-blue-700 bg-blue-50',
            )}
          >
            {tipo === 'socio' ? 'Sócio' : 'Funcionário'}
          </Badge>
          {!modelo.ativo && (
            <Badge variant="secondary" className="text-[10px]">
              Inativo
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          {tipo === 'socio'
            ? `Retirada fixa ${formatCurrency(retiradaFixa)}/mês`
            : `Salário ${formatCurrency(salarioBase)}/mês`}
          {modelo.decimo_terceiro_ativo ? ' · 13º' : ''}
          {(modelo.ferias_programadas || []).length > 0 ? ' · Férias' : ''}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit?.(modelo)}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => onDelete?.(modelo)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
