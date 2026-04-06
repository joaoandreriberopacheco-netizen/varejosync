import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, Calendar, Repeat2, Upload, CircleAlert, BadgeCheck, Receipt, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatCurrency(value) {
  return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getContaDoMes(contas, recorrente, monthKey) {
  return contas.find((conta) => {
    if (!conta.data_vencimento || conta.data_vencimento.slice(0, 7) !== monthKey) return false;
    if (conta.conta_recorrente_id === recorrente.id) return true;

    const descricaoConta = (conta.descricao || '').toLowerCase();
    const terceiroConta = (conta.terceiro_nome || '').toLowerCase();
    const nomeRecorrente = (recorrente.nome_despesa || '').toLowerCase();
    const terceiroRecorrente = (recorrente.terceiro_nome || '').toLowerCase();
    const diaRecorrente = String(recorrente.dia_vencimento || '').padStart(2, '0');
    const diaConta = (conta.data_vencimento || '').slice(8, 10);

    return diaRecorrente === diaConta && (
      (nomeRecorrente && descricaoConta.includes(nomeRecorrente)) ||
      (terceiroRecorrente && terceiroConta.includes(terceiroRecorrente)) ||
      (terceiroRecorrente && descricaoConta.includes(terceiroRecorrente))
    );
  });
}

function StatusBadge({ hasBoleto }) {
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${hasBoleto ? 'bg-gray-200/90 text-gray-700 dark:bg-gray-700 dark:text-gray-200' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
      <Receipt className="w-3 h-3" />
      {hasBoleto ? 'Com boleto' : 'Sem boleto'}
      {hasBoleto && (
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-400/60 dark:border-gray-500/70">
          <BadgeCheck className="w-2.5 h-2.5 opacity-80" />
        </span>
      )}
    </div>
  );
}

function AgefinCard({ recorrente, contaMes }) {
  const hasBoleto = Boolean(contaMes?.boleto_url);
  const isPaid = contaMes?.status === 'Pago';

  return (
    <div className="rounded-[28px] bg-white dark:bg-gray-900 p-3 shadow-sm">
      <div className="rounded-[24px] bg-gray-50/95 dark:bg-gray-800/70 px-4 py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[15px] font-semibold leading-5 text-gray-900 dark:text-white line-clamp-2">{recorrente.nome_despesa}</p>
              <div className="flex items-start gap-2 shrink-0 pl-2">
                {isPaid && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)] dark:shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" />}
                <div className="text-right">
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Previsto</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(recorrente.valor_previsto)}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{recorrente.terceiro_nome || 'Sem beneficiário'}</p>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 dark:bg-gray-900 px-2 py-1 shadow-sm">
              <Repeat2 className="w-3 h-3" />
              {recorrente.frequencia}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 dark:bg-gray-900 px-2 py-1 shadow-sm">
              <Calendar className="w-3 h-3" />
              Dia {recorrente.dia_vencimento}
            </span>
          </div>

          <div className="relative shrink-0">
            <div className={`flex h-11 w-11 items-center justify-center rounded-[16px] bg-white dark:bg-gray-900 shadow-sm ${hasBoleto ? 'ring-1 ring-gray-300/80 dark:ring-gray-600/70' : ''}`}>
              <Receipt className="w-5 h-5 text-gray-500 dark:text-gray-300" />
            </div>
            {hasBoleto && (
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white dark:bg-gray-900 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-300" />
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-[18px] bg-white/80 dark:bg-gray-900/80 px-2.5 py-2 shadow-sm">
          <div className="min-w-0 flex items-center gap-2">
            <StatusBadge hasBoleto={hasBoleto} />
            {!hasBoleto && <CircleAlert className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />}
          </div>
          <button className="h-8 rounded-full bg-white dark:bg-gray-900 px-3 text-[11px] font-medium text-gray-700 dark:text-gray-200 flex items-center justify-center gap-1.5 shadow-sm">
            <Upload className="w-3.5 h-3.5" />
            {hasBoleto ? 'Trocar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgefinRecorrentes() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [recorrentes, setRecorrentes] = useState([]);
  const [contas, setContas] = useState([]);
  const [filterStatus, setFilterStatus] = useState('pendentes');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recorrentesData, contasData] = await Promise.all([
        base44.entities.ContaRecorrente.filter({ ativa: true }, 'nome_despesa', 100),
        base44.entities.ContaPrevista.list('-data_vencimento', 300),
      ]);
      setRecorrentes(recorrentesData || []);
      setContas(contasData || []);
    } finally {
      setLoading(false);
    }
  };

  const monthKey = getMonthKey(currentMonth);

  const filteredCards = useMemo(() => {
    const cards = recorrentes
      .map((recorrente) => {
        const contaMes = getContaDoMes(contas, recorrente, monthKey);
        return {
          recorrente,
          contaMes,
          hasBoleto: Boolean(contaMes?.boleto_url),
        };
      })
      .filter((item) => item.contaMes && item.recorrente);

    if (filterStatus === 'pendentes') {
      return cards.filter((item) => !item.hasBoleto);
    }

    if (filterStatus === 'anexados') {
      return cards.filter((item) => item.hasBoleto);
    }

    return cards;
  }, [recorrentes, contas, monthKey, filterStatus]);

  const currentMonthText = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4 pb-24">
      <div className="rounded-[28px] bg-white dark:bg-gray-900 shadow-sm p-4">
        <div className="mb-3 rounded-2xl bg-gray-50 dark:bg-gray-800/70 px-3 py-2">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-4">
            Este painel é integrado às contas a pagar e ao fluxo financeiro: quando a conta é paga ou atualizada, o status aqui acompanha automaticamente.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} variant="ghost" size="sm" className="rounded-full h-10 w-10 p-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{currentMonthText}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Atualize os boletos recorrentes do período</p>
          </div>
          <Button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} variant="ghost" size="sm" className="rounded-full h-10 w-10 p-0">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { value: 'pendentes', label: 'Aguardando boleto' },
          { value: 'anexados', label: 'Com boleto' },
          { value: 'todas', label: 'Todas' },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setFilterStatus(filter.value)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${filterStatus === filter.value ? 'bg-gray-900 dark:bg-gray-200 text-white dark:text-gray-900' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 shadow-sm'}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="w-6 h-6 border-4 border-gray-300 border-t-gray-800 dark:border-gray-700 dark:border-t-gray-200 rounded-full animate-spin" />
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-[28px] shadow-sm">
          <Repeat2 className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">Nenhuma conta recorrente nesta visão</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Altere o filtro para ver outras contas do período.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
          {filteredCards.map(({ recorrente, contaMes }) => (
            <AgefinCard key={recorrente.id} recorrente={recorrente} contaMes={contaMes} />
          ))}
        </div>
      )}
    </div>
  );
}