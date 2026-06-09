import React from 'react';
import { formatarDataCurta } from '@/components/utils/dateUtils';
import { AlertCircle, Clock, Scale } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  P38MobileLine,
  P38StatusLabel,
  p38AccentKeyFromTone,
} from '@/components/ui/p38-mobile-line';
import { FinanceiroGrupo, FinanceiroListaEstado, formatFinanceiroValor } from './FinanceiroListaShared';

const LINE_TITLE_CLASS =
  '[&>div>div:first-child]:text-[15px] [&>div>div:first-child]:font-semibold sm:[&>div>div:first-child]:text-base';

function contaRowTone(l, isPago) {
  if (isPago) return 'muted';
  if (l.status === 'Vencido') return 'warning';
  return l.tipo === 'Receita' ? 'success' : 'muted';
}

function valorDespesaClass(isVencido) {
  return isVencido ? 'text-amber-600 dark:text-amber-400' : 'text-foreground/85';
}

function ContaRow({ l, onClick, emSelecao, selecionado, onToggleSelecionado, striped }) {
  const isR = l.tipo === 'Receita';
  const isPago = l.status === 'Pago' || !!l.data_pagamento;
  const conc = l.status_conciliacao || 'N/A';
  const data = l.data_vencimento;
  const tone = contaRowTone(l, isPago);
  const isVencido = l.status === 'Vencido';

  const valueNode = (
    <>
      <span className={isR ? 'text-[#4A5D23] dark:text-[#a4ce33]' : valorDespesaClass(isVencido)}>
        {isR ? '+' : '−'}
      </span>
      {formatFinanceiroValor(Math.abs(l.valor || 0))}
    </>
  );

  const meta = (
    <>
      {l.categoria && <span>{l.categoria}</span>}
      {l.status && l.status !== 'Pago' && (
        <P38StatusLabel tone={l.status === 'Vencido' ? 'warning' : tone === 'success' ? 'success' : 'warning'}>
          {l.status}
        </P38StatusLabel>
      )}
      {isPago && <P38StatusLabel tone="success">Pago</P38StatusLabel>}
      {l.frequencia_recorrencia && (
        <span>
          {l.frequencia_recorrencia === 'Parcelado' && l.parcela_atual != null
            ? `${l.parcela_atual}/${l.numero_parcelas_total ?? '—'}`
            : l.frequencia_recorrencia}
        </span>
      )}
      {(l.tags || []).slice(0, 2).map((t) => (
        <span key={t}>{t}</span>
      ))}
    </>
  );

  const trailing = (
    <>
      {emSelecao && !isPago && (
        <Checkbox checked={selecionado} onCheckedChange={() => onToggleSelecionado(l.id)} />
      )}
      {conc === 'Pendente' && <Clock className="h-2.5 w-2.5 text-muted-foreground" />}
      {conc === 'Discrepância' && <AlertCircle className="h-2.5 w-2.5 text-muted-foreground" />}
    </>
  );

  if (emSelecao && !isPago) {
    return (
      <P38MobileLine
        thinAccent
        striped={striped}
        accent={p38AccentKeyFromTone(tone)}
        onClick={() => onToggleSelecionado(l.id)}
        className={`w-full cursor-pointer text-left ${LINE_TITLE_CLASS} [&>div:last-child]:max-w-[46%] [&>div:first-child]:min-w-0`}
        title={l.descricao}
        subtitle={
          <>
            {data ? formatarDataCurta(data) : '—'}
            {l.conta_financeira_nome ? ` · ${l.conta_financeira_nome}` : ''}
          </>
        }
        meta={meta}
        value={valueNode}
        trailing={trailing}
      />
    );
  }

  return (
    <P38MobileLine
      as="button"
      type="button"
      thinAccent
      striped={striped}
      accent={p38AccentKeyFromTone(tone)}
      onClick={() => onClick(l)}
      className={`w-full text-left ${LINE_TITLE_CLASS} [&>div:last-child]:max-w-[46%] [&>div:first-child]:min-w-0 ${isPago ? 'opacity-60' : ''}`}
      title={l.descricao}
      subtitle={
        <>
          {data ? formatarDataCurta(data) : '—'}
          {l.conta_financeira_nome ? ` · ${l.conta_financeira_nome}` : ''}
        </>
      }
      meta={meta}
      value={valueNode}
      trailing={trailing}
    />
  );
}

export default function ListaContasAbertas({
  grupos,
  loading,
  onRow,
  emSelecao = false,
  selecionados = [],
  onToggleSelecionado,
}) {
  return (
    <FinanceiroListaEstado
      loading={loading}
      vazio={!loading && grupos.length === 0}
      vazioMensagem="Nenhuma conta em aberto"
      vazioIcon={Scale}
    >
      {grupos.map(({ k, label, items, aReceberDia, aPagarDia, isVencido }) => (
        <FinanceiroGrupo
          key={k}
          label={label}
          variant={isVencido ? 'overdue' : 'default'}
          labelClassName={isVencido ? 'text-amber-600/90 dark:text-amber-400/90' : undefined}
          receitas={aReceberDia}
          despesas={aPagarDia}
        >
          {items.map((l, index) => (
            <ContaRow
              key={l.id}
              l={l}
              striped={index % 2 === 1}
              onClick={onRow}
              emSelecao={emSelecao}
              selecionado={selecionados.includes(l.id)}
              onToggleSelecionado={onToggleSelecionado}
            />
          ))}
        </FinanceiroGrupo>
      ))}
    </FinanceiroListaEstado>
  );
}
