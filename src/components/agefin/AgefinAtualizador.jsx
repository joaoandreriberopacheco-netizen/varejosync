import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronRight, Plus, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AgefinAtualizacaoDialog from './AgefinAtualizacaoDialog';

export default function AgefinAtualizador({ onRefresh }) {
  const [recorrentes, setRecorrentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecorrencia, setSelectedRecorrencia] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    loadRecorrentes();
  }, []);

  const loadRecorrentes = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.ContaRecorrente.filter({ ativa: true }, '-created_date', 50);
      setRecorrentes(data || []);
    } catch (error) {
      console.error('Erro ao carregar recorrências:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateContas = async (recorrencia, periodos) => {
    try {
      for (let i = 0; i < periodos; i++) {
        const data = new Date();
        data.setMonth(data.getMonth() + i);

        const vencimento = new Date(data.getFullYear(), data.getMonth(), recorrencia.dia_vencimento);

        await base44.entities.ContaPrevista.create({
          descricao: recorrencia.nome_despesa,
          terceiro_id: recorrencia.terceiro_id,
          terceiro_nome: recorrencia.terceiro_nome,
          categoria_financeira_id: recorrencia.categoria_financeira_id,
          categoria_nome: recorrencia.categoria_nome,
          valor: recorrencia.valor_previsto,
          data_vencimento: vencimento.toISOString().split('T')[0],
          natureza: 'Recorrente',
          conta_recorrente_id: recorrencia.id,
          periodo_referencia: new Date(data.getFullYear(), data.getMonth(), 1).toISOString().split('T')[0],
          status: 'Pendente',
        });
      }
      setShowDialog(false);
      setSelectedRecorrencia(null);
      onRefresh?.();
    } catch (error) {
      console.error('Erro ao gerar contas:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-800 dark:border-gray-700 dark:border-t-gray-200 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recorrentes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Nenhuma recorrência cadastrada</p>
          <Button className="rounded-2xl h-12 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-5 h-5 mr-2" />
            Criar Recorrência
          </Button>
        </div>
      ) : (
        recorrentes.map((rec) => (
          <button
            key={rec.id}
            onClick={() => {
              setSelectedRecorrencia(rec);
              setShowDialog(true);
            }}
            className="w-full p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-98 border-l-4 border-purple-400"
          >
            <div className="flex items-center justify-between">
              <div className="text-left flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {rec.nome_despesa}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {rec.terceiro_nome} • Dia {rec.dia_vencimento}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="font-bold text-lg">
                  R$ {rec.valor_previsto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </button>
        ))
      )}

      {selectedRecorrencia && (
        <AgefinAtualizacaoDialog
          open={showDialog}
          recorrencia={selectedRecorrencia}
          onClose={() => {
            setShowDialog(false);
            setSelectedRecorrencia(null);
          }}
          onConfirm={handleGenerateContas}
        />
      )}
    </div>
  );
}