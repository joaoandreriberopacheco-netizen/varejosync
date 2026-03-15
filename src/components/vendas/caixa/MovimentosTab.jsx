import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Minus, DollarSign, Wallet } from 'lucide-react';
import { format } from 'date-fns';

export default function MovimentosTab({ turnoAtivo, caixaSelecionado }) {
  const [movimentos, setMovimentos] = useState([]);
  const [despesas, setDespesas] = useState([]);

  useEffect(() => {
    if (turnoAtivo) {
      loadData();
    }
  }, [turnoAtivo]);

  const loadData = async () => {
    if (!turnoAtivo) return;
    
    try {
      const [movs, desps] = await Promise.all([
        base44.entities.MovimentosCaixa.filter({ turno_caixa_id: turnoAtivo.id }),
        base44.entities.LancamentoFinanceiro.filter({ turno_caixa_id: turnoAtivo.id, tipo: 'Despesa' })
      ]);
      setMovimentos(movs);
      setDespesas(desps);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const formatValor = (valor) => {
    return `R$ ${(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const todosItens = [
    ...movimentos.map(m => ({
      id: m.id,
      tipo: m.tipo,
      valor: m.valor,
      descricao: m.observacao || m.tipo,
      hora: m.created_date,
      cor: m.tipo === 'Reforço' ? 'emerald' : 'blue',
      icone: m.tipo === 'Reforço' ? Plus : Minus,
    })),
    ...despesas.map(d => ({
      id: d.id,
      tipo: 'Despesa',
      valor: d.valor,
      descricao: d.descricao,
      hora: d.created_date,
      cor: 'red',
      icone: DollarSign,
    }))
  ].sort((a, b) => new Date(b.hora) - new Date(a.hora));

  return (
    <div className="space-y-4">
      {/* Botões de Ação */}
      <div className="grid grid-cols-3 gap-3">
        <button className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md transition-shadow h-28">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <Plus className="w-6 h-6 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">Reforço</span>
        </button>

        <button className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md transition-shadow h-28">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Minus className="w-6 h-6 text-blue-600 dark:text-blue-400" strokeWidth={2} />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">Recolhimento</span>
        </button>

        <button className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md transition-shadow h-28">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-red-600 dark:text-red-400" strokeWidth={2} />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">Despesa</span>
        </button>
      </div>

      {/* Histórico */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 px-1">
          Histórico do Turno
        </h2>
        
        {todosItens.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
            <Wallet className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nenhum movimento registrado
            </p>
          </div>
        ) : (
          todosItens.map((item) => {
            const Icon = item.icone;
            const getBgColor = () => {
              if (item.cor === 'emerald') return 'bg-emerald-50 dark:bg-emerald-900/20';
              if (item.cor === 'blue') return 'bg-blue-50 dark:bg-blue-900/20';
              return 'bg-red-50 dark:bg-red-900/20';
            };
            const getTextColor = () => {
              if (item.cor === 'emerald') return 'text-emerald-600 dark:text-emerald-400';
              if (item.cor === 'blue') return 'text-blue-600 dark:text-blue-400';
              return 'text-red-600 dark:text-red-400';
            };

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-xl ${getBgColor()} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${getTextColor()}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.descricao}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.tipo} · {item.hora ? format(new Date(item.hora), 'HH:mm') : ''}
                  </p>
                </div>
                <div className={`text-base font-bold font-glacial flex-shrink-0 ${getTextColor()}`}>
                  {item.tipo === 'Reforço' ? '+' : '−'}{formatValor(item.valor)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}