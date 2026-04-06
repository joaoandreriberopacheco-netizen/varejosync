import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, ChevronRight, Calendar, Repeat2, Receipt, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AgefinDetalheDrawer from '@/components/financeiro/AgefinDetalheDrawer';

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


function AgefinCard({ recorrente, contaMes, onOpen }) {
  const hasBoleto = Boolean(contaMes?.boleto_url);
  const isPaid = contaMes?.status === 'Pago';
  const todayKey = new Date().toISOString().slice(0, 10);
  const isOverdue = !isPaid && contaMes?.data_vencimento && contaMes.data_vencimento < todayKey;
  const boletoVencido = hasBoleto && isOverdue;

  return (
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(); }} className="w-full text-left rounded-[28px] bg-white dark:bg-gray-900 p-1 shadow-sm cursor-pointer">
      <div className="rounded-[24px] bg-gray-50/95 dark:bg-gray-800/70 px-3.5 py-3 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 flex items-start gap-2.5">
            {(isPaid || isOverdue) && (
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${isPaid ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)] dark:bg-emerald-300 dark:shadow-[0_0_0_3px_rgba(110,231,183,0.12)]' : 'bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.14)] dark:bg-red-300 dark:shadow-[0_0_0_3px_rgba(252,165,165,0.12)]'}`} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold leading-5 text-gray-900 dark:text-white line-clamp-2">{recorrente.nome_despesa}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{recorrente.terceiro_nome || 'Sem beneficiário'}</p>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Previsto</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(recorrente.valor_previsto)}</p>
                </div>
              </div>
            </div>
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
            <div className={`flex h-11 w-11 items-center justify-center rounded-[16px] bg-white dark:bg-gray-900 shadow-sm ${hasBoleto ? boletoVencido ? 'ring-2 ring-red-300 dark:ring-red-300/70' : 'ring-2 ring-lime-300 dark:ring-emerald-300/60' : ''}`}>
              <Receipt className="w-5 h-5 text-gray-500 dark:text-gray-300" />
            </div>
            {hasBoleto && (
              <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white dark:bg-gray-900 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-300" />
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
  const [recorrentes, setRecorrentes] = useState([]);
  const [contas, setContas] = useState([]);
  const [filterStatus, setFilterStatus] = useState('todas');
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

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
            <AgefinCard
              key={recorrente.id}
              recorrente={recorrente}
              contaMes={contaMes}
              onOpen={() => setSelectedCard({ recorrente, contaMes })}
            />
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