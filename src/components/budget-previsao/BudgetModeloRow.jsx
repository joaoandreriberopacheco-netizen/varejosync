import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, MoreVertical, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  P38MobileLine,
  P38StatusLabel,
  p38AccentKeyFromTone,
} from '@/components/ui/p38-mobile-line';
import {
  calcularOrcadoMensal,
  formatCurrency,
  formatEstimativaResumo,
  getCompetenciaAtual,
  MODO_ESTIMATIVA_LABELS,
} from '@/lib/budgetCalculos';

function stopClick(e) {
  e.preventDefault();
  e.stopPropagation();
}

export default function BudgetModeloRow({
  modelo,
  onEdit,
  onInativar,
  onReativar,
  onExcluir,
  processando = false,
  striped = false,
  competencia = getCompetenciaAtual(),
}) {
  if (!modelo) return null;
  const inativo = modelo.ativo === false;
  const orcadoMes = calcularOrcadoMensal(modelo, competencia);
  const centro = String(modelo.centro_custo || '').trim();

  return (
    <P38MobileLine
      thinAccent
      striped={striped}
      accent={p38AccentKeyFromTone(inativo ? 'muted' : 'info')}
      className={cn('w-full', processando && 'opacity-60 pointer-events-none')}
      title={modelo.nome}
      subtitle={modelo.categoria_nome || 'Sem categoria'}
      meta={
        <>
          <span>{MODO_ESTIMATIVA_LABELS[modelo.modo_estimativa] || modelo.modo_estimativa}</span>
          {modelo.usa_dias_uteis ? <P38StatusLabel tone="info">Dias úteis</P38StatusLabel> : null}
          {inativo ? <P38StatusLabel tone="muted">Inativo</P38StatusLabel> : null}
          {centro ? <span>{centro}</span> : null}
          <span className="text-muted-foreground">{formatEstimativaResumo(modelo, competencia)}</span>
        </>
      }
      value={formatCurrency(orcadoMes)}
      valueSub={<span className="text-muted-foreground">orçado/mês</span>}
      trailing={
        <div className="flex items-center gap-1 shrink-0" onClick={stopClick} onKeyDown={stopClick}>
          {processando ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Processando" />
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={() => onEdit?.(modelo)}
                aria-label="Editar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" aria-label="Mais ações">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {inativo ? (
                    <DropdownMenuItem onClick={() => onReativar?.(modelo)}>
                      <Power className="mr-2 h-4 w-4" />
                      Reativar
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => onInativar?.(modelo)}>
                      <PowerOff className="mr-2 h-4 w-4" />
                      Inativar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => onExcluir?.(modelo)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir em definitivo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      }
    />
  );
}
