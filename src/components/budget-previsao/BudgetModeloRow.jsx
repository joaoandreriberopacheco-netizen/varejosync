import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
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

export default function BudgetModeloRow({ modelo, onEdit, onDelete, striped = false, competencia = getCompetenciaAtual() }) {
  if (!modelo) return null;
  const orcadoMes = calcularOrcadoMensal(modelo, competencia);
  const centro = String(modelo.centro_custo || '').trim();

  return (
    <P38MobileLine
      thinAccent
      striped={striped}
      accent={p38AccentKeyFromTone(modelo.ativo === false ? 'muted' : 'info')}
      className="w-full"
      title={modelo.nome}
      subtitle={modelo.categoria_nome || 'Sem categoria'}
      meta={
        <>
          <span>{MODO_ESTIMATIVA_LABELS[modelo.modo_estimativa] || modelo.modo_estimativa}</span>
          {modelo.usa_dias_uteis ? <P38StatusLabel tone="info">Dias úteis</P38StatusLabel> : null}
          {modelo.ativo === false ? <P38StatusLabel tone="muted">Inativo</P38StatusLabel> : null}
          {centro ? <span>{centro}</span> : null}
          <span className="text-muted-foreground">{formatEstimativaResumo(modelo, competencia)}</span>
        </>
      }
      value={formatCurrency(orcadoMes)}
      valueSub={<span className="text-muted-foreground">orçado/mês</span>}
      trailing={
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => onEdit?.(modelo)} aria-label="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-red-500"
            onClick={() => onDelete?.(modelo)}
            aria-label="Desativar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      }
    />
  );
}
