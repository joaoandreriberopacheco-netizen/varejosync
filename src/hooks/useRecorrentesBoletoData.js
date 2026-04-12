import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getContaDoMes(contas, recorrente, monthKey) {
  return contas.find((conta) => {
    if (!conta.data_vencimento || conta.data_vencimento.slice(0, 7) !== monthKey) return false;
    return conta.grupo_lancamento_id === recorrente.grupo_lancamento_id;
  });
}

/**
 * Dados do atualizador de boletos: grupos recorrentes + lançamentos do mês (LancamentoFinanceiro).
 */
export function useRecorrentesBoletoData() {
  const [recorrentes, setRecorrentes] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const contasData = await base44.entities.LancamentoFinanceiro.list('-data_vencimento', 500);
      const lancamentosRecorrentes = (contasData || []).filter(
        (item) =>
          item.tipo === 'Despesa' &&
          item.is_recorrente &&
          item.grupo_lancamento_id &&
          Array.isArray(item.tags) &&
          item.tags.includes('conta_pagar') &&
          item.tags.includes('recorrente')
      );
      const grupos = Array.from(
        new Map(
          lancamentosRecorrentes.map((item) => [
            item.grupo_lancamento_id,
            {
              id: item.grupo_lancamento_id,
              grupo_lancamento_id: item.grupo_lancamento_id,
              nome_despesa: item.descricao,
              terceiro_nome: item.terceiro_nome,
              valor_previsto: item.valor,
              frequencia: item.frequencia_recorrencia,
              dia_vencimento: Number((item.data_vencimento || '').slice(8, 10)) || 1,
            },
          ])
        ).values()
      );
      setRecorrentes(grupos);
      setContas(lancamentosRecorrentes);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { recorrentes, contas, loading, reload: loadData };
}
