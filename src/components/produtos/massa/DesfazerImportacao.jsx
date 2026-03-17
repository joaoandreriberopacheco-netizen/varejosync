import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function DesfazerImportacao() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [desfazendo, setDesfazendo] = useState(false);

  useEffect(() => {
    carregarSnapshots();
  }, []);

  const carregarSnapshots = async () => {
    try {
      setLoading(true);
      const dados = await base44.entities.ImportacaoLog.filter({}, '-created_date', 100);
      setSnapshots(dados || []);
    } catch (error) {
      console.error('Erro ao carregar snapshots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDesfazer = async (snapshot) => {
    if (!window.confirm(`Restaurar importação de ${snapshot.quantidade_itens} itens? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setDesfazendo(true);
    try {
      const produtosRestaurados = snapshot.snapshot_dados || [];
      
      for (const produto of produtosRestaurados) {
        if (produto.id) {
          await base44.entities.Produto.update(produto.id, produto);
        }
      }

      toast.success(`${produtosRestaurados.length} produtos restaurados com sucesso`);
      carregarSnapshots();
    } catch (error) {
      console.error('Erro ao restaurar:', error);
      toast.error('Erro ao restaurar importação');
    } finally {
      setDesfazendo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p className="text-sm">Nenhuma importação registrada para desfazer</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Desfazer restorará os produtos para o estado anterior à importação.
        </p>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {snapshots.map((snapshot) => (
          <div
            key={snapshot.id}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-center justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {snapshot.usuario_responsavel || 'Importação'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {snapshot.quantidade_itens} itens · {new Date(snapshot.created_date).toLocaleString('pt-BR')}
              </p>
            </div>
            <Button
              onClick={() => handleDesfazer(snapshot)}
              disabled={desfazendo}
              size="sm"
              variant="outline"
              className="gap-2 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              {desfazendo ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RotateCcw className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">Desfazer</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}