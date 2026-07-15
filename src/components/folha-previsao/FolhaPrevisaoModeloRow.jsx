import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CLASSIFICACAO_DESPESA_FOLHA,
  CLASSIFICACAO_DESPESA_FOLHA_LABELS,
  formatCurrency,
  extrairSalarioBase,
} from '@/lib/folhaPrevisaoCalculos';

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
  const classificacaoDespesa =
    modelo.classificacao_despesa || CLASSIFICACAO_DESPESA_FOLHA.DIRETA;
  const centroCusto = String(modelo.centro_custo || '').trim();

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-b-0',
        'hover:bg-muted/40 transition-colors',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground truncate">{nome}</span>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] shrink-0',
              tipo === 'socio'
                ? 'border-violet-300/70 text-violet-700 bg-violet-100/70 dark:border-violet-700/70 dark:text-violet-200 dark:bg-violet-900/30'
                : 'border-blue-300/70 text-blue-700 bg-blue-100/70 dark:border-blue-700/70 dark:text-blue-200 dark:bg-blue-900/30',
            )}
          >
            {tipo === 'socio' ? 'Sócio' : 'Funcionário'}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] shrink-0',
              classificacaoDespesa === CLASSIFICACAO_DESPESA_FOLHA.DIRETA
                ? 'border-emerald-300/70 text-emerald-700 bg-emerald-100/70 dark:border-emerald-700/70 dark:text-emerald-200 dark:bg-emerald-900/30'
                : 'border-amber-300/70 text-amber-700 bg-amber-100/70 dark:border-amber-700/70 dark:text-amber-200 dark:bg-amber-900/30',
            )}
          >
            {classificacaoDespesa === CLASSIFICACAO_DESPESA_FOLHA.DIRETA ? 'Despesa direta' : 'Despesa indireta'}
          </Badge>
          {!modelo.ativo && (
            <Badge variant="secondary" className="text-[10px]">
              Inativo
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {tipo === 'socio'
            ? `Retirada fixa ${formatCurrency(retiradaFixa)}/mês`
            : `Salário ${formatCurrency(salarioBase)}/mês`}
          {modelo.decimo_terceiro_ativo ? ' · 13º' : ''}
          {(modelo.ferias_programadas || []).length > 0 ? ' · Férias' : ''}
        </p>
        <p className="text-xs text-muted-foreground/90 mt-0.5 truncate">
          Centro de custo: {centroCusto || 'Não informado'} · {CLASSIFICACAO_DESPESA_FOLHA_LABELS[classificacaoDespesa]}
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
