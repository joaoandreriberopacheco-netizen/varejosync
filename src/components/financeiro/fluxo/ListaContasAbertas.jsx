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

function contaRowTone(l, isPago) {
  if (isPago) return 'muted';
  if (l.status === 'Vencido') return 'danger';
  return l.tipo === 'Receita' ? 'success' : 'danger';
}

function ContaRow({ l, onClick, emSelecao, selecionado, onToggleSelecionado, striped }) {
  const isR = l.tipo === 'Receita';
  const isPago = l.status === 'Pago' || !!l.data_pagamento;
  const conc = l.status_conciliacao || 'N/A';
  const data = l.data_vencimento;
  const tone = contaRowTone(l, isPago);

  const valueNode = (
    <>
      <span className={isR ? 'text-[#4A5D23] dark:text-[#a4ce33]' : 'text-red-600 dark:text-red-400'}>
        {isR ? '+' : '−'}
      </span>
      {formatFinanceiroValor(Math.abs(l.valor || 0))}
    </>
  );

  const meta = (
    <>
      {l.categoria && <span>{l.categoria}</span>}
      {l.status && l.status !== 'Pago' && (
        <P38StatusLabel tone={l.status === 'Vencido' ? 'danger' : tone === 'success' ? 'success' : 'warning'}>
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
        className="w-full cursor-pointer text-left"
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
      className={`w-full text-left ${isPago ? 'opacity-60' : ''}`}
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
          labelClassName={isVencido ? 'text-red-400 dark:text-red-500' : undefined}
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
