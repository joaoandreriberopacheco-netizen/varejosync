import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronRight, RefreshCw, Calendar, Repeat } from 'lucide-react';
import AgefinAtualizacaoDialog from './AgefinAtualizacaoDialog';

const FREQ_LABEL = {
  Semanal: 'Semanal',
  Mensal: 'Mensal',
  Bimestral: 'Bimestral',
  Trimestral: 'Trimestral',
  Semestral: 'Semestral',
  Anual: 'Anual',
  Parcelado: 'Parcelado',
};

export default function AgefinAtualizador({ onRefresh }) {
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadLancamentos();
  }, []);

  const loadLancamentos = async () => {
    try {
      setLoading(true);
      // Busca lançamentos com tag conta_pagar e que sejam recorrentes
      const data = await base44.entities.LancamentoFinanceiro.filter(
        { is_recorrente: true },
        '-data_vencimento',
        200
      );
      // Filtra pelo lado do cliente para garantir a tag
      const filtrados = (data || []).filter(l =>
        Array.isArray(l.tags) && l.tags.includes('conta_pagar') &&
        l.frequencia_recorrencia
      );
      setLancamentos(filtrados);
    } catch (error) {
      console.error('Erro ao carregar lançamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 dark:border-gray-600 dark:border-t-gray-200 rounded-full animate-spin" />
      </div>
    );
  }

  if (lancamentos.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500">
        <Repeat className="w-8 h-8 mx-auto mb-3 opacity-30" />
        Nenhum lançamento recorrente com tag <strong>conta_pagar</strong> encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
        {lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''} recorrente{lancamentos.length !== 1 ? 's' : ''} com tag <span className="font-semibold">conta_pagar</span>
      </p>

      {lancamentos.map((l) => (
        <button
          key={l.id}
          onClick={() => setSelected(l)}
          className="w-full px-4 py-3 bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-md transition-all text-left flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{l.descricao}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              {l.data_vencimento}
              {l.frequencia_recorrencia && (
                <span className="ml-1 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-400">
                  {FREQ_LABEL[l.frequencia_recorrencia] || l.frequencia_recorrencia}
                </span>
              )}
              {l.terceiro_nome && <span className="ml-1">· {l.terceiro_nome}</span>}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              R$ {(l.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <span className={`text-xs ${
              l.status === 'Em Aberto' ? 'text-amber-500' :
              l.status === 'Vencido' ? 'text-red-500' :
              l.status === 'Pago' ? 'text-green-600' : 'text-gray-400'
            }`}>{l.status}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
        </button>
      ))}

      {selected && (
        <AgefinAtualizacaoDialog
          open={!!selected}
          lancamento={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => { setSelected(null); loadLancamentos(); onRefresh?.(); }}
        />
      )}
    </div>
  );
}