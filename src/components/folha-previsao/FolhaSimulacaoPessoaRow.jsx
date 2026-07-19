import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  P38MobileLine,
  P38StatusLabel,
  p38AccentKeyFromTone,
} from '@/components/ui/p38-mobile-line';
import {
  formatCurrency,
  isSocio,
  TIPO_VINCULO_LABELS,
} from '@/lib/folhaPrevisaoCalculos';
import {
  obterRetiradaOriginal,
  obterRetiradaSimulada,
  obterSalarioBaseOriginal,
  obterSalarioBaseSimulado,
} from '@/lib/folhaSimulacaoCalculos';

export default function SimulacaoPessoaRow({
  modelo,
  colaborador,
  ajuste,
  mediaAntes,
  mediaDepois,
  onToggleCorte,
  onSalarioChange,
  onRetiradaChange,
  striped,
}) {
  const cortado = Boolean(ajuste?.removido);
  const ehSocio = isSocio(modelo);
  const nome = colaborador?.nome || modelo.colaborador_nome || modelo.nome || 'Pessoa';
  const tipoLabel = TIPO_VINCULO_LABELS[modelo.tipo_vinculo] || 'Funcionário';

  const salarioOriginal = obterSalarioBaseOriginal(modelo);
  const retiradaOriginal = obterRetiradaOriginal(modelo);
  const salarioSimulado = obterSalarioBaseSimulado(modelo, ajuste);
  const retiradaSimulada = obterRetiradaSimulada(modelo, ajuste);

  const salarioAlterado = !ehSocio && Math.abs(salarioSimulado - salarioOriginal) > 0.009;
  const retiradaAlterada = ehSocio && Math.abs(retiradaSimulada - retiradaOriginal) > 0.009;
  const alterado = cortado || salarioAlterado || retiradaAlterada;

  return (
    <P38MobileLine
      thinAccent
      striped={striped}
      accent={p38AccentKeyFromTone(cortado ? 'muted' : alterado ? 'warning' : 'danger')}
      className={cn(
        'max-md:!py-3 max-md:min-h-[88px]',
        cortado && 'opacity-55',
      )}
      title={
        <span className={cn('truncate', cortado && 'line-through')}>
          {nome}
        </span>
      }
      subtitle={<span>{tipoLabel}</span>}
      meta={
        <>
          <span>Média antes {formatCurrency(mediaAntes)}</span>
          {alterado && !cortado && (
            <P38StatusLabel tone="warning">Média depois {formatCurrency(mediaDepois)}</P38StatusLabel>
          )}
          {cortado && <P38StatusLabel tone="muted">Cortado</P38StatusLabel>}
        </>
      }
      value={
        <div className="flex flex-col items-end gap-2 w-full max-w-[168px] sm:max-w-[200px]">
          <div className="flex items-center gap-2">
            <Switch
              id={`corte-${modelo.id}`}
              checked={cortado}
              onCheckedChange={onToggleCorte}
              aria-label={`Cortar ${nome}`}
            />
            <Label htmlFor={`corte-${modelo.id}`} className="text-[10px] text-muted-foreground whitespace-nowrap">
              Cortar
            </Label>
          </div>

          {!cortado && !ehSocio && (
            <div className="w-full space-y-1">
              <Label htmlFor={`salario-${modelo.id}`} className="text-[10px] text-muted-foreground">
                Salário base (R$)
              </Label>
              <Input
                id={`salario-${modelo.id}`}
                type="number"
                min={0}
                step="0.01"
                value={salarioSimulado}
                onChange={(e) => onSalarioChange(e.target.value)}
                className={cn(
                  'h-8 text-xs px-2 tabular-nums',
                  salarioAlterado && 'border-amber-500/60 bg-amber-500/5',
                )}
              />
              {salarioAlterado && (
                <p className="text-[10px] text-muted-foreground text-right">
                  Cadastro: {formatCurrency(salarioOriginal)}
                </p>
              )}
            </div>
          )}

          {!cortado && ehSocio && (
            <div className="w-full space-y-1">
              <Label htmlFor={`retirada-${modelo.id}`} className="text-[10px] text-muted-foreground">
                Retirada (R$)
              </Label>
              <Input
                id={`retirada-${modelo.id}`}
                type="number"
                min={0}
                step="0.01"
                value={retiradaSimulada}
                onChange={(e) => onRetiradaChange(e.target.value)}
                className={cn(
                  'h-8 text-xs px-2 tabular-nums',
                  retiradaAlterada && 'border-amber-500/60 bg-amber-500/5',
                )}
              />
              {retiradaAlterada && (
                <p className="text-[10px] text-muted-foreground text-right">
                  Cadastro: {formatCurrency(retiradaOriginal)}
                </p>
              )}
            </div>
          )}
        </div>
      }
    />
  );
}
