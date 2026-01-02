import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Undo2, CheckCircle, XCircle, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function HistoricoImportacoes({ isOpen, onClose, importacoes, onRefresh }) {
  const [isUndoing, setIsUndoing] = useState(null);
  const { toast } = useToast();

  const handleDesfazer = async (importacao) => {
    if (!confirm(`Desfazer importação ${importacao.numero}?\n\nIsso irá:\n- Excluir ${importacao.total_novos} produtos criados\n- Restaurar ${importacao.total_atualizados} produtos atualizados`)) {
      return;
    }

    setIsUndoing(importacao.id);

    try {
      const user = await base44.auth.me();

      // Excluir produtos criados
      if (importacao.produtos_ids && importacao.produtos_ids.length > 0) {
        for (const produtoId of importacao.produtos_ids) {
          try {
            await base44.entities.Produto.delete(produtoId);
          } catch (err) {
            console.log(`Produto ${produtoId} já foi excluído`);
          }
        }
      }

      // Restaurar produtos atualizados
      if (importacao.produtos_atualizados && importacao.produtos_atualizados.length > 0) {
        for (const { id, dados_anteriores } of importacao.produtos_atualizados) {
          try {
            await base44.entities.Produto.update(id, dados_anteriores);
          } catch (err) {
            console.log(`Erro ao restaurar produto ${id}`);
          }
        }
      }

      // Atualizar log
      await base44.entities.ImportacaoLog.update(importacao.id, {
        status: 'Desfeita',
        data_desfeita: new Date().toISOString(),
        usuario_desfez: user.full_name
      });

      toast({
        title: "✓ Importação desfeita!",
        description: `${importacao.numero} foi revertida com sucesso.`,
        className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
      });

      onRefresh();

    } catch (error) {
      console.error('Erro ao desfazer:', error);
      toast({
        title: "Erro ao desfazer",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUndoing(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col dark:bg-gray-900 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-base font-medium text-gray-800 dark:text-gray-200">Histórico de Importações</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          {importacoes.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              Nenhuma importação realizada ainda
            </div>
          )}

          {importacoes.map(imp => (
            <div
              key={imp.id}
              className={`p-4 rounded-lg border ${
                imp.status === 'Desfeita'
                  ? 'bg-gray-50 border-gray-300 dark:bg-gray-800/50 dark:border-gray-700'
                  : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded flex items-center justify-center ${
                    imp.status === 'Desfeita' 
                      ? 'bg-gray-200 dark:bg-gray-700' 
                      : 'bg-gray-100 dark:bg-gray-700/50'
                  }`}>
                    <FileText className={`w-5 h-5 ${
                      imp.status === 'Desfeita' 
                        ? 'text-gray-500 dark:text-gray-500' 
                        : 'text-gray-700 dark:text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-200">{imp.numero}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{imp.arquivo_nome || 'Sem nome'}</div>
                  </div>
                </div>

                <Badge className={`${
                  imp.status === 'Desfeita'
                    ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                } text-xs`}>
                  {imp.status === 'Desfeita' ? (
                    <><XCircle className="w-3 h-3 mr-1" />Desfeita</>
                  ) : (
                    <><CheckCircle className="w-3 h-3 mr-1" />Concluída</>
                  )}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-3">
                <div>
                  <span className="font-medium text-green-600 dark:text-green-400">{imp.total_novos}</span> novos
                </div>
                <div>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{imp.total_atualizados}</span> atualizados
                </div>
                <div className="ml-auto">
                  {formatDate(imp.created_date)}
                </div>
              </div>

              {imp.status === 'Desfeita' && (
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 p-2 rounded">
                  Desfeita em {formatDate(imp.data_desfeita)} por {imp.usuario_desfez}
                </div>
              )}

              {imp.status === 'Concluída' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDesfazer(imp)}
                  disabled={isUndoing !== null}
                  className="w-full gap-2 text-xs dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {isUndoing === imp.id ? (
                    <><Loader2 className="w-3 h-3 animate-spin" />Desfazendo...</>
                  ) : (
                    <><Undo2 className="w-3 h-3" />Desfazer Importação</>
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}