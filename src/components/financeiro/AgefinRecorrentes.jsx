import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, Calendar, Repeat2, Upload, FileText, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatCurrency(value) {
  return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getContaDoMes(contas, recorrenteId, monthKey) {
  return contas.find((conta) => {
    if (conta.conta_recorrente_id !== recorrenteId) return false;
    if (!conta.data_vencimento) return false;
    return conta.data_vencimento.slice(0, 7) === monthKey;
  });
}

function StatusBadge({ hasBoleto }) {
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${hasBoleto ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'}`}>
      {hasBoleto ? <FileText className="w-3.5 h-3.5" /> : <CircleAlert className="w-3.5 h-3.5" />}
      {hasBoleto ? 'Boleto do mês anexado' : 'Aguardando boleto do mês'}
    </div>
  );
}

function AgefinCard({ recorrente, contaMes }) {
  const hasBoleto = Boolean(contaMes?.boleto_url);

  return (
    <div className="rounded-[28px] bg-white dark:bg-gray-900 shadow-sm p-4 md:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold text-gray-900 dark:text-white break-words">{recorrente.nome_despesa}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">{recorrente.terceiro_nome || 'Sem beneficiário'}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm text-gray-500 dark:text-gray-400">Previsto</p>
          <p className="text-base font-semibold text-gray-900 dark:text-white">{formatCurrency(recorrente.valor_previsto)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1">
          <Repeat2 className="w-3.5 h-3.5" />
          {recorrente.frequencia}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1">
          <Calendar className="w-3.5 h-3.5" />
          Dia {recorrente.dia_vencimento}
        </span>
      </div>

      <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/80 p-3 space-y-3">
        <StatusBadge hasBoleto={hasBoleto} />
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {hasBoleto
            ? 'Este boleto já está vinculado à conta a pagar deste mês e deve aparecer nos anexos da conta.'
            : 'Anexe o boleto atualizador deste mês para que ele apareça nos anexos da conta a pagar.'}
        </p>
        <button className="w-full h-11 rounded-2xl bg-gray-900 dark:bg-gray-200 text-white dark:text-gray-900 text-sm font-medium flex items-center justify-center gap-2 shadow-sm">
          <Upload className="w-4 h-4" />
          {hasBoleto ? 'Trocar boleto do mês' : 'Anexar boleto do mês'}
        </button>
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
    const cards = recorrentes.map((recorrente) => {
      const contaMes = getContaDoMes(contas, recorrente.id, monthKey);
      return {
        recorrente,
        contaMes,
        hasBoleto: Boolean(contaMes?.boleto_url),
      };
    });

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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {filteredCards.map(({ recorrente, contaMes }) => (
            <AgefinCard key={recorrente.id} recorrente={recorrente} contaMes={contaMes} />
          ))}
        </div>
      )}
    </div>
  );
}