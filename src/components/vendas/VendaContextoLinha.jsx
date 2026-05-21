import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowDownUp, Ban, CreditCard, FileEdit } from 'lucide-react';
import { formatarDiferencaSubstituicao } from '@/lib/substituicoesVendaCaixa';
import { TIPO_EVENTO } from '@/lib/eventosVenda';

const ICONS = {
  [TIPO_EVENTO.SUBSTITUICAO]: ArrowDownUp,
  [TIPO_EVENTO.CANCELAMENTO]: Ban,
  [TIPO_EVENTO.PAGAMENTO_ALTERADO]: CreditCard,
  [TIPO_EVENTO.DETALHE_ALTERADO]: FileEdit,
};

const STYLES = {
  [TIPO_EVENTO.SUBSTITUICAO]: 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300',
  [TIPO_EVENTO.CANCELAMENTO]: 'border-red-300 text-red-700 dark:border-red-800 dark:text-red-400',
  [TIPO_EVENTO.PAGAMENTO_ALTERADO]: 'border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-300',
  [TIPO_EVENTO.DETALHE_ALTERADO]: 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400',
};

function DestaqueItem({ destaque, formatValor, compact }) {
  const Icon = ICONS[destaque.tipo] || FileEdit;
  const style = STYLES[destaque.tipo] || STYLES[TIPO_EVENTO.DETALHE_ALTERADO];

  if (destaque.tipo === TIPO_EVENTO.SUBSTITUICAO && destaque.origem) {
    const origem = destaque.origem;
    const fmt = formatValor || ((v) => `R$ ${Number(v || 0).toFixed(2)}`);
    if (compact) {
      return (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 mt-1">
          <ArrowDownUp className="w-3 h-3 flex-shrink-0" />
          <span>
            Substitui {origem.numero}{' '}
            <span className="line-through text-gray-400">{fmt(origem.valor_total)}</span>
          </span>
          {destaque.diferenca != null && (
            <span className="font-semibold">{formatarDiferencaSubstituicao(destaque.diferenca, fmt)}</span>
          )}
        </div>
      );
    }
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${style}`}>
          Substituição
        </Badge>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Substitui <span className="font-medium">{origem.numero}</span>{' '}
          <span className="line-through">({fmt(origem.valor_total)})</span>
        </span>
        {destaque.diferenca != null && (
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            {formatarDiferencaSubstituicao(destaque.diferenca, fmt)}
          </span>
        )}
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 text-[11px] mt-1 ${destaque.tipo === TIPO_EVENTO.CANCELAMENTO ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
        <Icon className="w-3 h-3 flex-shrink-0" />
        <span>{destaque.rotulo}</span>
      </div>
    );
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${style}`}>
        <Icon className="w-3 h-3 mr-0.5 inline" />
        {destaque.rotulo}
      </Badge>
    </div>
  );
}

/**
 * Linha integrada: substituição, cancelamento, pagamento e detalhes.
 * Aceita `contexto` (novo) ou `substituicao` (legado).
 */
export default function VendaContextoLinha({ contexto, substituicao, formatValor, compact }) {
  const ctx = contexto || substituicao;
  const destaques = ctx?.destaques?.length
    ? ctx.destaques
    : ctx?.papel === 'substituto' && ctx?.origem
      ? [
          {
            tipo: TIPO_EVENTO.SUBSTITUICAO,
            rotulo: `Substitui ${ctx.origem.numero}`,
            origem: ctx.origem,
            diferenca: ctx.diferenca,
          },
        ]
      : [];

  if (!destaques.length) return null;

  return (
    <div className="space-y-0">
      {destaques.map((d, i) => (
        <DestaqueItem key={`${d.tipo}-${i}`} destaque={d} formatValor={formatValor} compact={compact} />
      ))}
    </div>
  );
}
