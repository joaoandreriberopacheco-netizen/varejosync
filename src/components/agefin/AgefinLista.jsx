import React, { useState, useMemo } from 'react';
import { ChevronRight, AlertCircle, CheckCircle2, Calendar, DollarSign, Paperclip, Filter, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AgefinDetalhes from './AgefinDetalhes';

export default function AgefinLista({ contas, onRefresh }) {
  const [selectedConta, setSelectedConta] = useState(null);
  const [sortBy, setSortBy] = useState('vencimento'); // vencimento, valor, status
  const [filterStatus, setFilterStatus] = useState('Pendente');

  const sorted = useMemo(() => {
    const contasPagar = (contas || []).filter((c) => c && c.tipo !== 'Receita');
    let filtered = filterStatus ? contasPagar.filter(c => c.status === filterStatus) : contasPagar;

    return filtered.sort((a, b) => {
      if (sortBy === 'vencimento') {
        return new Date(a.data_vencimento) - new Date(b.data_vencimento);
      } else if (sortBy === 'valor') {
        return b.valor - a.valor;
      }
      return 0;
    });
  }, [contas, sortBy, filterStatus]);

  if (selectedConta) {
    return (
      <AgefinDetalhes
        conta={selectedConta}
        onBack={() => setSelectedConta(null)}
        onUpdate={onRefresh}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        {['Pendente', 'Boleto Anexado', 'Pago', 'Cancelado'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(filterStatus === status ? null : status)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex gap-2">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="flex-1 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-0 focus:ring-2 focus:ring-blue-500"
        >
          <option value="vencimento">Ordenar por vencimento</option>
          <option value="valor">Ordenar por valor</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Filter className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">Nenhuma conta encontrada</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              {filterStatus ? `Nenhuma conta com status "${filterStatus}". Ajuste o filtro para ver outras contas.` : 'Adicione contas para começar a gerenciar seus pagamentos.'}
            </p>
            {filterStatus && (
              <button
                onClick={() => setFilterStatus(null)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
              >
                <X className="w-4 h-4" />
                Limpar filtro
              </button>
            )}
          </div>
        ) : (
          sorted.map((conta) => <ContaCard key={conta.id} conta={conta} onClick={() => setSelectedConta(conta)} />)
        )}
      </div>
    </div>
  );
}

function ContaCard({ conta, onClick }) {
  const isPaid = conta.status === 'Pago' || conta.status_visual === 'pago';
  const isOverdue = new Date(conta.data_vencimento) < new Date() && !isPaid;
  const hasBoleto = !!conta.tem_boleto;
  const daysUntil = Math.ceil((new Date(conta.data_vencimento) - new Date()) / (1000 * 60 * 60 * 24));

  const statusColors = {
    pendente: 'bg-gray-50 dark:bg-gray-900/40 border-l-4 border-gray-300',
    boleto_anexado: 'bg-lime-50 dark:bg-lime-900/10 border-l-4 border-lime-400',
    vencido: 'bg-pink-50 dark:bg-pink-900/10 border-l-4 border-pink-400',
    pago: 'bg-emerald-50 dark:bg-emerald-900/10 border-l-4 border-emerald-500',
    Cancelado: 'bg-gray-100 dark:bg-gray-800 border-l-4 border-gray-400',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-98 ${statusColors[conta.status_visual] || statusColors[conta.status] || 'bg-white dark:bg-gray-900'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {conta.descricao}
            </h3>
            {isPaid ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : isOverdue ? <AlertCircle className="w-4 h-4 text-pink-500 flex-shrink-0" /> : hasBoleto ? <DollarSign className="w-4 h-4 text-lime-500 flex-shrink-0" /> : <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />}
            {conta.tem_anexo && <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />}
            {conta.valor_desatualizado && <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" />
                {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}
              </span>
              {daysUntil > 0 && (
                <span className="text-gray-600 dark:text-gray-400 text-xs">
                  {daysUntil} dia{daysUntil > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="font-bold text-lg text-gray-900 dark:text-white">
            R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </button>
  );
}