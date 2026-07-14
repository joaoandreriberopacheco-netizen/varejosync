import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  gerarLancamentosMensaisAteFimDoAno,
  lancamentoRecorrenteContaPagarParaListaBoleto,
  tagsOrigemBoleto,
} from '@/lib/agefinLancamentosRecorrencia';

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
      try {
        await gerarLancamentosMensaisAteFimDoAno(base44);
      } catch (e) {
        console.error('Sincronizar recorrências mensais:', e);
      }
      const contasData = await base44.entities.LancamentoFinanceiro.list('-data_vencimento', 5000);
      const lancamentosRecorrentes = (contasData || []).filter(lancamentoRecorrenteContaPagarParaListaBoleto);

      const byGrupo = new Map();
      for (const item of lancamentosRecorrentes) {
        const gid = item.grupo_lancamento_id;
        if (!byGrupo.has(gid)) byGrupo.set(gid, []);
        byGrupo.get(gid).push(item);
      }

      const grupos = [];
      for (const [gid, rows] of byGrupo) {
        const sorted = [...rows].sort((a, b) =>
          (b.data_vencimento || '').localeCompare(a.data_vencimento || '')
        );
        const comPdf = sorted.find((x) => tagsOrigemBoleto(x.tags) === 'pdf');
        const rep = comPdf || sorted[0];
        grupos.push({
          id: gid,
          grupo_lancamento_id: gid,
          nome_despesa: rep.descricao,
          terceiro_nome: rep.terceiro_nome,
          valor_previsto: rep.valor,
          frequencia: rep.frequencia_recorrencia || 'Mensal',
          dia_vencimento: Number((rep.data_vencimento || '').slice(8, 10)) || 1,
        });
      }

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
