import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Repeat2, Receipt, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AgefinDetalheDrawer from '@/components/financeiro/AgefinDetalheDrawer';
import { dataHoje } from '@/components/utils/dateUtils';
import { TAG_LF_BOLETO_PDF, TAG_LF_GERADO_AUTO } from '@/lib/agefinLancamentosRecorrencia';
import { getMonthKey, getContaDoMes, useRecorrentesBoletoData } from '@/hooks/useRecorrentesBoletoData';

function formatCurrency(value) {
  return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function AgefinCard({ recorrente, contaMes, onOpen }) {
  const hasBoleto = Boolean(contaMes?.forma_pagamento_tipo === 'Boleto' || contaMes?.forma_pagamento === 'Boleto');
  const isPaid = contaMes?.status === 'Pago';
  const todayKey = dataHoje();
  const isOverdue = !isPaid && contaMes?.data_vencimento && contaMes.data_vencimento < todayKey;
  const boletoVencido = hasBoleto && isOverdue;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen();
      }}
      className="w-full cursor-pointer rounded-[28px] bg-white p-1 text-left shadow-sm dark:bg-gray-900"
    >
      <div className="space-y-2.5 rounded-[24px] bg-gray-50/95 px-3.5 py-3 dark:bg-gray-800/70">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 flex items-start gap-2.5">
            {(isPaid || isOverdue) && (
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                  isPaid
                    ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)] dark:bg-emerald-300 dark:shadow-[0_0_0_3px_rgba(110,231,183,0.12)]'
                    : 'bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.18)] dark:bg-red-400 dark:shadow-[0_0_0_3px_rgba(248,113,113,0.16)]'
                }`}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[15px] font-semibold leading-5 text-gray-900 dark:text-white">{recorrente.nome_despesa}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">{recorrente.terceiro_nome || 'Sem beneficiário'}</p>
                </div>
                <div className="shrink-0 pl-2 text-right">
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Previsto</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(recorrente.valor_previsto)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 shadow-sm dark:bg-gray-900">
              <Repeat2 className="h-3 w-3" />
              {recorrente.frequencia}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 shadow-sm dark:bg-gray-900">
              <Calendar className="h-3 w-3" />
              Dia {recorrente.dia_vencimento}
            </span>
          </div>

          <div className="relative shrink-0">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-[16px] bg-white shadow-sm dark:bg-gray-900 ${
                isPaid
                  ? 'ring-2 ring-emerald-300 dark:ring-emerald-300/60'
                  : hasBoleto
                    ? boletoVencido
                      ? 'ring-2 ring-red-400 dark:ring-red-400/75'
                      : 'ring-2 ring-lime-300 dark:ring-emerald-300/60'
                    : ''
              }`}
            >
              <Receipt className="h-5 w-5 text-gray-500 dark:text-gray-300" />
            </div>
            {hasBoleto && (
              <span className="absolute -right-1 -top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-900">
                <CheckCircle2 className={`h-3.5 w-3.5 ${isPaid ? 'text-emerald-500 dark:text-emerald-200' : 'text-gray-500 dark:text-gray-300'}`} />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgefinRecorrentes() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { recorrentes, contas, loading } = useRecorrentesBoletoData();
  const [filterPagamento, setFilterPagamento] = useState('todos');
  const [filterPrazo, setFilterPrazo] = useState('todos');
  const [filterOrigem, setFilterOrigem] = useState('todos');
  const [selectedCard, setSelectedCard] = useState(null);

  const monthKey = getMonthKey(currentMonth);

  const filteredCards = useMemo(() => {
    const todayKey = dataHoje();
    const tags = (c) => (Array.isArray(c?.tags) ? c.tags : []);

    const cards = recorrentes
      .map((recorrente) => {
        const contaMes = getContaDoMes(contas, recorrente, monthKey);
        return { recorrente, contaMes };
      })
      .filter((item) => item.contaMes && item.recorrente);

    let out = cards;

    if (filterPagamento === 'pagas') {
      out = out.filter((x) => x.contaMes?.status === 'Pago');
    } else if (filterPagamento === 'em_aberto') {
      out = out.filter((x) => x.contaMes?.status !== 'Pago');
    }

    if (filterPrazo === 'vencidas') {
      out = out.filter((x) => {
        const p = x.contaMes?.status === 'Pago';
        const o = !p && x.contaMes?.data_vencimento && x.contaMes.data_vencimento < todayKey;
        return o;
      });
    } else if (filterPrazo === 'em_dia') {
      out = out.filter((x) => {
        const p = x.contaMes?.status === 'Pago';
        const o = !p && x.contaMes?.data_vencimento && x.contaMes.data_vencimento < todayKey;
        return p || !o;
      });
    }

    if (filterOrigem === 'atualizadas') {
      out = out.filter((x) => tags(x.contaMes).includes(TAG_LF_BOLETO_PDF));
    } else if (filterOrigem === 'automaticas') {
      out = out.filter((x) => {
        const t = tags(x.contaMes);
        return t.includes(TAG_LF_GERADO_AUTO) && !t.includes(TAG_LF_BOLETO_PDF);
      });
    }

    return [...out].sort((a, b) =>
      (a.recorrente.nome_despesa || '').localeCompare(b.recorrente.nome_despesa || '', 'pt-BR', { sensitivity: 'base' })
    );
  }, [recorrentes, contas, monthKey, filterPagamento, filterPrazo, filterOrigem]);

  const currentMonthText = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const chipCls = (active) =>
    `px-3 py-2 rounded-full whitespace-nowrap text-xs font-medium transition-all md:text-sm ${
      active ? 'bg-gray-900 text-white dark:bg-gray-200 dark:text-gray-900' : 'bg-white text-gray-600 shadow-sm dark:bg-gray-900 dark:text-gray-300'
    }`;

  return (
    <div className="space-y-4 pb-24">
      <div className="rounded-[28px] bg-white p-4 shadow-sm dark:bg-gray-900">
        <div className="mb-3 rounded-2xl bg-gray-50 px-3 py-2 dark:bg-gray-800/70">
          <p className="text-[11px] leading-4 text-gray-500 dark:text-gray-400">
            Este painel é integrado às contas a pagar e ao fluxo financeiro: quando a conta é paga ou atualizada, o status aqui acompanha automaticamente.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-full p-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 text-center">
            <p className="text-sm font-semibold capitalize text-gray-900 dark:text-white">{currentMonthText}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Atualize os boletos recorrentes do período</p>
          </div>
          <Button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-full p-0"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-[28px] bg-white p-4 shadow-sm dark:bg-gray-900">
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">Pagamento</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chipCls(filterPagamento === 'todos')} onClick={() => setFilterPagamento('todos')}>
              Todas
            </button>
            <button type="button" className={chipCls(filterPagamento === 'pagas')} onClick={() => setFilterPagamento('pagas')}>
              Pagas
            </button>
            <button type="button" className={chipCls(filterPagamento === 'em_aberto')} onClick={() => setFilterPagamento('em_aberto')}>
              Em aberto
            </button>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">Prazo</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chipCls(filterPrazo === 'todos')} onClick={() => setFilterPrazo('todos')}>
              Todas
            </button>
            <button type="button" className={chipCls(filterPrazo === 'vencidas')} onClick={() => setFilterPrazo('vencidas')}>
              Vencidas
            </button>
            <button type="button" className={chipCls(filterPrazo === 'em_dia')} onClick={() => setFilterPrazo('em_dia')}>
              Em dia
            </button>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">Origem do lançamento</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chipCls(filterOrigem === 'todos')} onClick={() => setFilterOrigem('todos')}>
              Todas
            </button>
            <button type="button" className={chipCls(filterOrigem === 'atualizadas')} onClick={() => setFilterOrigem('atualizadas')}>
              Atualizadas (PDF)
            </button>
            <button type="button" className={chipCls(filterOrigem === 'automaticas')} onClick={() => setFilterOrigem('automaticas')}>
              Automáticas
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-300 border-t-gray-800 dark:border-gray-700 dark:border-t-gray-200" />
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="rounded-[28px] bg-white py-12 text-center shadow-sm dark:bg-gray-900">
          <Repeat2 className="mx-auto mb-3 h-10 w-10 text-gray-400" />
          <p className="mb-1 font-medium text-gray-800 dark:text-gray-200">Nenhuma conta recorrente nesta visão</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Altere o mês ou os filtros para ver outras contas.</p>
        </div>
      ) : (
        <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-2.5 md:max-w-4xl">
          {filteredCards.map(({ recorrente, contaMes }) => (
            <AgefinCard key={recorrente.id} recorrente={recorrente} contaMes={contaMes} onOpen={() => setSelectedCard({ recorrente, contaMes })} />
          ))}
        </div>
      )}

      <AgefinDetalheDrawer
        open={Boolean(selectedCard)}
        onClose={() => setSelectedCard(null)}
        recorrente={selectedCard?.recorrente}
        contaMes={selectedCard?.contaMes}
      />
    </div>
  );
}
