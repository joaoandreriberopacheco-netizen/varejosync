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
    const itens = snapshot.produtos_atualizados || [];
    if (itens.length === 0) {
      toast.error('Este log não possui snapshot de dados para restaurar');
      return;
    }

    if (!window.confirm(`Restaurar ${itens.length} produto(s) ao estado anterior? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setDesfazendo(true);
    try {
      for (const item of itens) {
        if (item.id && item.dados_anteriores) {
          await base44.entities.Produto.update(item.id, item.dados_anteriores);
        }
      }

      toast.success(`${itens.length} produto(s) restaurado(s) com sucesso`);
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
                {(snapshot.produtos_atualizados?.length || 0) + (snapshot.total_novos || 0)} itens · {new Date(snapshot.created_date).toLocaleString('pt-BR')}
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