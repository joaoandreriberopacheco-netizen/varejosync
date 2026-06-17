import React from 'react';
import { Clock, Eye, Edit, Scale } from 'lucide-react';
import {
  P38MobileLine,
  P38StatusLabel,
  p38AccentKeyFromTone,
} from '@/components/ui/p38-mobile-line';
import { formatFinanceiroValor } from './FinanceiroListaShared';
import { contaTemDivergenciaSaldo, getSaldoExibicaoConta } from '@/lib/saldoContaFinanceira';

const LINE_TITLE_CLASS =
  '[&>div>div:first-child]:text-[15px] [&>div>div:first-child]:font-semibold sm:[&>div>div:first-child]:text-base';

export default function ContaFinanceiraRow({
  conta,
  pendencias = 0,
  saldosCalculados,
  onExtrato,
  onEdit,
  onAjuste,
  onConciliar,
  striped,
}) {
  const saldo = getSaldoExibicaoConta(conta, saldosCalculados);
  const isNegativo = saldo < 0;
  const ativa = conta.ativo !== false;
  const divergente = contaTemDivergenciaSaldo(conta, saldo);

  const subtitle = [conta.tipo, conta.banco].filter(Boolean).join(' · ');

  const handleClick = () => {
    if (pendencias > 0) onConciliar?.(conta);
    else onExtrato?.(conta);
  };

  return (
    <P38MobileLine
      thinAccent
      striped={striped}
      accent={p38AccentKeyFromTone(isNegativo ? 'danger' : ativa ? 'success' : 'muted')}
      as="button"
      type="button"
      onClick={handleClick}
      className={`w-full text-left ${LINE_TITLE_CLASS} [&>div:last-child]:max-w-[46%] [&>div:first-child]:min-w-0 ${!ativa ? 'opacity-70' : ''}`}
      title={conta.nome}
      subtitle={subtitle || '—'}
      meta={
        <>
          <P38StatusLabel tone={ativa ? 'success' : 'muted'}>
            {ativa ? 'Ativa' : 'Inativa'}
          </P38StatusLabel>
          {pendencias > 0 && (
            <P38StatusLabel tone="warning">
              {pendencias} conciliação{pendencias > 1 ? 'ões' : ''}
            </P38StatusLabel>
          )}
          {divergente && (
            <P38StatusLabel tone="warning">Divergente</P38StatusLabel>
          )}
          {conta.is_caixa_pdv && <span>PDV</span>}
        </>
      }
      value={formatFinanceiroValor(saldo)}
      valueSub={
        conta.is_caixa_pdv
          ? 'Dinheiro na gaveta'
          : conta.agencia
            ? `Ag ${conta.agencia}`
            : undefined
      }
      trailing={
        <div className="flex items-center gap-0.5 shrink-0">
          {pendencias > 0 && <Clock className="h-3 w-3 text-amber-500" />}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExtrato?.(conta);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60"
            aria-label="Extrato"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAjuste?.(conta);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60"
            aria-label="Ajustar saldo"
          >
            <Scale className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(conta);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60"
            aria-label="Editar"
          >
            <Edit className="h-4 w-4" />
          </button>
        </div>
      }
    />
  );
}
