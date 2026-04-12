import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronRight, RefreshCw, Calendar, Repeat, Sparkles, FileText } from 'lucide-react';
import AgefinAtualizacaoDialog from './AgefinAtualizacaoDialog';
import {
  lancamentoEntraNoAtualizadorBoletos,
  gerarLancamentosMensaisAteFimDoAno,
  tagsOrigemBoleto,
} from '@/lib/agefinLancamentosRecorrencia';

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
  const [msgGeracao, setMsgGeracao] = useState(null);

  useEffect(() => {
    loadLancamentos();
  }, []);

  const loadLancamentos = async () => {
    try {
      setLoading(true);
      setMsgGeracao(null);

      const { criados } = await gerarLancamentosMensaisAteFimDoAno(base44);
      if (criados > 0) {
        setMsgGeracao(`${criados} competência${criados !== 1 ? 's' : ''} gerada${criados !== 1 ? 's' : ''} automaticamente até dez/${new Date().getFullYear()}.`);
      }

      const [comFlag, resto] = await Promise.all([
        base44.entities.LancamentoFinanceiro.filter({ is_recorrente: true }, '-data_vencimento', 400),
        base44.entities.LancamentoFinanceiro.list('-data_vencimento', 400),
      ]);
      const todos = [...(comFlag || []), ...(resto || [])];
      const vistos = new Set();
      const unicos = todos.filter((l) => {
        if (vistos.has(l.id)) return false;
        vistos.add(l.id);
        return true;
      });

      const filtrados = unicos.filter(lancamentoEntraNoAtualizadorBoletos);
      filtrados.sort((a, b) => (b.data_vencimento || '').localeCompare(a.data_vencimento || ''));
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
        <p className="mb-2">
          Nenhum lançamento com tag <strong className="text-gray-600 dark:text-gray-300">conta_pagar</strong> ou com{' '}
          <strong className="text-gray-600 dark:text-gray-300">recorrência</strong> encontrado.
        </p>
        <p className="text-xs max-w-sm mx-auto">
          Inclui contas pontuais (somente conta a pagar) e séries recorrentes. Competências mensais do ano são geradas
          automaticamente quando houver grupo recorrente mensal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {msgGeracao && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          {msgGeracao}
        </p>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
        {lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''} para atualizar boleto
        <span className="block mt-1 text-[11px]">
          Origem: <span className="text-gray-500 dark:text-gray-400">automático</span> ou{' '}
          <span className="text-gray-500 dark:text-gray-400">PDF importado</span> (tags no registro).
        </span>
      </p>

      {lancamentos.map((l) => {
        const origem = tagsOrigemBoleto(l.tags);
        return (
        <button
          key={l.id}
          onClick={() => setSelected(l)}
          className="w-full px-4 py-3 bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-md transition-all text-left flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{l.descricao}</p>
              {origem === 'pdf' && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                  <FileText className="w-3 h-3" /> PDF
                </span>
              )}
              {origem === 'auto' && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                  <Sparkles className="w-3 h-3" /> Auto
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5 flex-wrap">
              <Calendar className="w-3 h-3 shrink-0" />
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
      );
      })}

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
