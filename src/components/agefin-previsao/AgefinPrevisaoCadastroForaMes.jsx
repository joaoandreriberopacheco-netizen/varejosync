import React from 'react';
import { Button } from '@/components/ui/button';
import { P38MobileLineList } from '@/components/ui/p38-mobile-line';
import AgefinPrevisaoModeloRow from '@/components/agefin-previsao/AgefinPrevisaoModeloRow';
import { formatCompetenciaLabel } from '@/lib/agefinPrevisaoCalculos';

export default function AgefinPrevisaoCadastroForaMes({
  competenciaMes,
  itens = [],
  onEdit,
  onIrParaMes,
}) {
  if (!itens.length) return null;

  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-3 space-y-2">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Cadastradas — não vencem em {formatCompetenciaLabel(competenciaMes)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Estas contas já estão no cadastro. Aparecem na lista do mês quando chega a data de
          vencimento — não precisa &quot;abrir o mês&quot; para vê-las aqui.
        </p>
      </div>
      <P38MobileLineList className="block md:!block rounded-xl overflow-hidden border border-border/40">
        {itens.map((item, idx) => (
          <div key={item.modelo.id} className="flex items-stretch gap-0 border-b border-border/30 last:border-0">
            <div className="min-w-0 flex-1">
              <AgefinPrevisaoModeloRow
                modelo={item.modelo}
                striped={idx % 2 === 1}
                onEdit={onEdit}
              />
            </div>
            <div className="flex shrink-0 flex-col items-end justify-center gap-1 px-3 py-2">
              <span className="text-[10px] text-muted-foreground">Próximo</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => item.proximoMes && onIrParaMes?.(item.proximoMes)}
              >
                {item.labelProximo}
              </Button>
            </div>
          </div>
        ))}
      </P38MobileLineList>
    </div>
  );
}
