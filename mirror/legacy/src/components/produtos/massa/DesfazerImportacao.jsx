import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// Agrupa logs por grupo_importacao_id (ou pelo id do log para logs antigos sem grupo)
function agruparLogs(logs) {
  const grupos = {};
  for (const log of logs) {
    const chave = log.grupo_importacao_id || log.id;
    if (!grupos[chave]) {
      grupos[chave] = { logs: [], totalItens: 0, data: log.created_date, grupoId: chave };
    }
    grupos[chave].logs.push(log);
    grupos[chave].totalItens += (log.produtos_atualizados?.length || 0) + (log.total_novos || 0);
    // Pegar a data mais recente do grupo
    if (new Date(log.created_date) > new Date(grupos[chave].data)) {
      grupos[chave].data = log.created_date;
    }
  }
  // Ordenar por data decrescente
  return Object.values(grupos).sort((a, b) => new Date(b.data) - new Date(a.data));
}

export default function DesfazerImportacao() {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [desfazendoId, setDesfazendoId] = useState(null);

  useEffect(() => {
    carregarLogs();
  }, []);

  const carregarLogs = async () => {
    try {
      setLoading(true);
      const dados = await base44.entities.ImportacaoLog.filter({}, '-created_date', 200);
      setGrupos(agruparLogs(dados || []));
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDesfazer = async (grupo) => {
    const totalItens = grupo.logs.reduce((acc, l) => acc + (l.produtos_atualizados?.length || 0), 0);

    if (totalItens === 0) {
      toast.error('Este log não possui snapshot de dados para restaurar');
      return;
    }

    if (!window.confirm(`Restaurar ${totalItens} produto(s) ao estado anterior? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setDesfazendoId(grupo.grupoId);
    let restaurados = 0;
    try {
      for (const log of grupo.logs) {
        const itens = log.produtos_atualizados || [];
        for (const item of itens) {
          if (item.id && item.dados_anteriores) {
            await base44.entities.Produto.update(item.id, item.dados_anteriores);
            restaurados++;
          }
        }
      }

      toast.success(`${restaurados} produto(s) restaurado(s) com sucesso`);
      carregarLogs();
    } catch (error) {
      console.error('Erro ao restaurar:', error);
      toast.error(`Erro ao restaurar: ${error?.message || 'Erro desconhecido'}`);
    } finally {
      setDesfazendoId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (grupos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
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
        {grupos.map((grupo) => {
          const isDesfazendo = desfazendoId === grupo.grupoId;
          const temSnapshot = grupo.logs.some(l => l.produtos_atualizados?.length > 0);
          const numLotes = grupo.logs.length;

          return (
            <div
              key={grupo.grupoId}
              className="bg-card rounded-xl p-4 shadow-sm flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  Importação {numLotes > 1 ? `(${numLotes} lotes)` : ''}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {grupo.totalItens} itens · {new Date(grupo.data).toLocaleString('pt-BR')}
                  {!temSnapshot && (
                    <span className="ml-2 text-red-400">· sem snapshot</span>
                  )}
                </p>
              </div>
              <Button
                onClick={() => handleDesfazer(grupo)}
                disabled={isDesfazendo || !temSnapshot}
                size="sm"
                variant="outline"
                className="gap-2 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-40"
              >
                {isDesfazendo ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RotateCcw className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">Desfazer</span>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}