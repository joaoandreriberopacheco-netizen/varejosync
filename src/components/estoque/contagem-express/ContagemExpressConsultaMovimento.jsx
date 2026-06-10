import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownCircle, ArrowUpCircle, Package } from 'lucide-react';
import {
  P38MobileLine,
  P38MobileLineList,
  P38StatusLabel,
  p38AccentKeyFromTone,
  p38StatusTone,
} from '@/components/ui/p38-mobile-line';
import { formatCountQuantity } from '@/lib/inventoryCountUnits';

export default function ContagemExpressConsultaMovimento({ movimentos = [] }) {
  if (movimentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Package className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Nenhum ajuste no período</p>
      </div>
    );
  }

  const entradas = movimentos.filter((m) => m.tipo === 'Entrada').length;
  const saidas = movimentos.filter((m) => m.tipo === 'Saída').length;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Movimentos do período</p>
        <p className="text-lg font-semibold font-din-1451 text-foreground">
          {movimentos.length} ajuste{movimentos.length === 1 ? '' : 's'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {entradas} entrada{entradas === 1 ? '' : 's'} · {saidas} saída{saidas === 1 ? '' : 's'}
        </p>
      </div>

      <P38MobileLineList allViewports className="rounded-lg">
        {movimentos.map((mov, index) => {
          const isEntrada = mov.tipo === 'Entrada';
          const tone = p38StatusTone(isEntrada ? 'success' : 'danger');
          const qtyPrefix = isEntrada ? '+' : '-';
          const dataFmt = mov.created_date
            ? format(new Date(mov.created_date), "dd/MM/yy HH:mm", { locale: ptBR })
            : '';

          return (
            <P38MobileLine
              key={mov.id}
              accent={p38AccentKeyFromTone(tone)}
              striped={index % 2 === 1}
              trailing={
                isEntrada
                  ? <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
                  : <ArrowUpCircle className="h-4 w-4 text-red-500" />
              }
            >
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug text-foreground break-words whitespace-normal">
                  {mov.produto_nome || 'Produto'}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <P38StatusLabel tone={tone}>{mov.tipo}</P38StatusLabel>
                  <span className="text-xs font-din-1451 tabular-nums text-foreground">
                    {qtyPrefix}{formatCountQuantity(mov.quantidade)}
                  </span>
                  {dataFmt && (
                    <span className="text-xs text-muted-foreground">{dataFmt}</span>
                  )}
                </div>
                {(mov.referencia_numero || mov.usuario_responsavel) && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {[mov.referencia_numero, mov.usuario_responsavel].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </P38MobileLine>
          );
        })}
      </P38MobileLineList>
    </div>
  );
}
