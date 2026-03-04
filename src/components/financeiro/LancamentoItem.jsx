import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const formatCurrency = (v) =>
  `R$ ${Math.abs(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const categoriaLabel = (cat) => cat || 'Outros';

const statusConciliacaoConfig = {
  'Pendente': { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  'Conciliado': { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/10' },
  'Discrepância': { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/10' },
  'N/A': { icon: CheckCircle2, color: 'text-gray-400', bg: '' },
};

export default function LancamentoItem({ lancamento, onClick }) {
  const isReceita = lancamento.tipo === 'Receita';
  const isPago = lancamento.status === 'Pago';
  const isPrevisto = !isPago && lancamento.status !== 'Cancelado';
  const concStatus = lancamento.status_conciliacao || 'N/A';
  const ConcIcon = statusConciliacaoConfig[concStatus]?.icon || Clock;
  const concColor = statusConciliacaoConfig[concStatus]?.color || 'text-gray-400';

  const dataRef = lancamento.data_pagamento || lancamento.data_vencimento;

  return (
    <button
      onClick={() => onClick && onClick(lancamento)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left group"
    >
      {/* Ícone tipo */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isReceita
          ? isPago ? 'bg-green-50 dark:bg-green-900/20' : 'bg-green-50/50 dark:bg-green-900/10'
          : isPago ? 'bg-red-50 dark:bg-red-900/20' : 'bg-red-50/50 dark:bg-red-900/10'
      }`}>
        {isReceita
          ? <ArrowDownLeft className={`w-4 h-4 ${isPago ? 'text-green-500' : 'text-green-400'}`} />
          : <ArrowUpRight className={`w-4 h-4 ${isPago ? 'text-red-500' : 'text-red-400'}`} />
        }
      </div>

      {/* Descrição */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-sm font-medium truncate ${
            isPrevisto ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-100'
          }`}>
            {lancamento.descricao}
          </p>
          {isPrevisto && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 flex-shrink-0">
              PREVISTO
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {dataRef ? format(new Date(dataRef), 'dd MMM', { locale: ptBR }) : '—'}
          </span>
          {lancamento.categoria && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{categoriaLabel(lancamento.categoria)}</span>
            </>
          )}
          {lancamento.conta_financeira_nome && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{lancamento.conta_financeira_nome}</span>
            </>
          )}
        </div>
      </div>

      {/* Valor + conciliação */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <p className={`text-sm font-semibold ${
          isReceita
            ? isPago ? 'text-green-600 dark:text-green-400' : 'text-green-500/70 dark:text-green-500/60'
            : isPago ? 'text-red-500 dark:text-red-400' : 'text-red-400/70 dark:text-red-400/60'
        }`}>
          {isReceita ? '+' : '-'}{formatCurrency(lancamento.valor)}
        </p>
        {concStatus !== 'N/A' && concStatus !== 'Conciliado' && (
          <ConcIcon className={`w-3 h-3 ${concColor}`} />
        )}
      </div>
    </button>
  );
}