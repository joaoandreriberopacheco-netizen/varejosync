import React from 'react';
import { formatarDataCurta } from '@/components/utils/dateUtils';
import { AlertCircle, Clock } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  P38MobileLine,
  P38StatusLabel,
  p38StatusTone,
  p38AccentKeyFromTone,
} from '@/components/ui/p38-mobile-line';
import { formatFinanceiroValor } from './FinanceiroListaShared';

const LINE_TITLE_CLASS =
  '[&>div>div:first-child]:text-[15px] [&>div>div:first-child]:font-semibold sm:[&>div>div:first-child]:text-base';

const TAGS_OCULTAS = new Set([
  'conta_pagar',
  'conta_receber',
  'recorrente',
  'importação pendente',
  'importacao pendente',
]);

export function tagsVisiveisFinanceiro(tags) {
  return (tags || [])
    .filter((t) => !TAGS_OCULTAS.has(String(t).toLowerCase()))
    .slice(0, 2);
}

function lancStatusTone(status) {
  if (status === 'Vencido') return 'danger';
  if (status === 'Em Aberto') return 'warning';
  if (status === 'Cancelado') return 'muted';
  return p38StatusTone(status);
}

/** Barra lateral — mesmo critério do Fluxo de Caixa: verde receita, vermelho despesa. */
function rowAccent(l, { dimPago = false } = {}) {
  const isR = l.tipo === 'Receita';
  const isT = l.tipo === 'Transferência';
  const cancelado = l.status === 'Cancelado';
  const isPago = l.status === 'Pago' || !!l.data_pagamento;

  if (dimPago && isPago) return 'muted';
  if (cancelado) return 'muted';
  if (isT) return 'muted';
  if (isR) return 'success';
  return 'danger';
}

function valorNode(l) {
  const isR = l.tipo === 'Receita';
  const isT = l.tipo === 'Transferência';
  const cancelado = l.status === 'Cancelado';

  if (cancelado) return '—';
  if (isT) return formatFinanceiroValor(Math.abs(l.valor || 0));

  return (
    <>
      <span
        className={
          isR
            ? 'text-[#4A5D23] dark:text-[#a4ce33]'
            : l.status === 'Vencido'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-foreground/85'
        }
      >
        {isR ? '+' : '−'}
      </span>
      {formatFinanceiroValor(Math.abs(l.valor || 0))}
    </>
  );
}

function rowMeta(l, { showPago = false } = {}) {
  const cancelado = l.status === 'Cancelado';
  const isPago = l.status === 'Pago' || !!l.data_pagamento;
  const visiveis = tagsVisiveisFinanceiro(l.tags);

  return (
    <>
      {l.categoria && <span>{l.categoria}</span>}
      {l.status && l.status !== 'Pago' && (
        <P38StatusLabel tone={lancStatusTone(l.status)}>{l.status}</P38StatusLabel>
      )}
      {showPago && isPago && <P38StatusLabel tone="success">Pago</P38StatusLabel>}
      {cancelado && <P38StatusLabel tone="muted">Cancelado</P38StatusLabel>}
      {(l.is_recorrente || l.frequencia_recorrencia) && (
        <span>
          {l.frequencia_recorrencia === 'Parcelado' && l.parcela_atual != null
            ? `${l.parcela_atual}/${l.numero_parcelas_total ?? '—'}`
            : l.frequencia_recorrencia || 'Recorrente'}
        </span>
      )}
      {visiveis.map((t) => (
        <span key={t}>{t}</span>
      ))}
    </>
  );
}

export default function FinanceiroLancRow({
  l,
  onClick,
  striped,
  dataField = 'auto',
  showPago = false,
  emSelecao = false,
  selecionado = false,
  onToggleSelecionado,
}) {
  const cancelado = l.status === 'Cancelado';
  const isPago = l.status === 'Pago' || !!l.data_pagamento;
  const conc = l.status_conciliacao || 'N/A';
  const data =
    dataField === 'vencimento'
      ? l.data_vencimento
      : dataField === 'pagamento'
        ? l.data_pagamento || l.data_vencimento
        : l.data_pagamento || l.data_vencimento;

  const trailing = (
    <>
      {emSelecao && !isPago && (
        <Checkbox checked={selecionado} onCheckedChange={() => onToggleSelecionado?.(l.id)} />
      )}
      {conc === 'Pendente' && <Clock className="h-2.5 w-2.5 text-muted-foreground" />}
      {conc === 'Discrepância' && <AlertCircle className="h-2.5 w-2.5 text-muted-foreground" />}
    </>
  );

  const subtitle = (
    <>
      {data ? formatarDataCurta(data) : '—'}
      {l.conta_financeira_nome ? ` · ${l.conta_financeira_nome}` : ''}
    </>
  );

  const commonProps = {
    thinAccent: true,
    striped,
    accent: p38AccentKeyFromTone(rowAccent(l, { dimPago: showPago })),
    className: `w-full text-left ${LINE_TITLE_CLASS} [&>div:last-child]:max-w-[46%] [&>div:first-child]:min-w-0 ${cancelado || (showPago && isPago) ? 'opacity-60' : ''}`,
    title: <span className={cancelado ? 'line-through' : undefined}>{l.descricao}</span>,
    subtitle,
    meta: rowMeta(l, { showPago }),
    value: valorNode(l),
    trailing,
  };

  if (emSelecao && !isPago) {
    return (
      <P38MobileLine
        {...commonProps}
        onClick={() => onToggleSelecionado?.(l.id)}
        className={`${commonProps.className} cursor-pointer`}
      />
    );
  }

  return (
    <P38MobileLine
      {...commonProps}
      as="button"
      type="button"
      onClick={() => onClick?.(l)}
    />
  );
}
