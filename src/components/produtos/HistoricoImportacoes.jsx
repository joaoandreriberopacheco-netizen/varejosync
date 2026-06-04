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
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col dark:bg-background dark:border-border/40">
        <DialogHeader>
          <DialogTitle className="text-base font-medium text-foreground">Histórico de Importações</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-4">
          {importacoes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma importação realizada ainda
            </div>
          )}

          {importacoes.map(imp => (
            <div
              key={imp.id}
              className={`p-4 rounded-lg border ${
                imp.status === 'Desfeita'
                  ? 'bg-muted/40 border-border/40 dark:bg-muted/50 dark:border-border/40'
                  : 'bg-card border-border/40 dark:bg-muted dark:border-border/40'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded flex items-center justify-center ${
                    imp.status === 'Desfeita' 
                      ? 'bg-muted' 
                      : 'bg-muted/50'
                  }`}>
                    <FileText className={`w-5 h-5 ${
                      imp.status === 'Desfeita' 
                        ? 'text-muted-foreground dark:text-muted-foreground' 
                        : 'text-foreground/90 dark:text-muted-foreground'
                    }`} />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-foreground dark:text-foreground">{imp.numero}</div>
                    <div className="text-xs text-muted-foreground">{imp.arquivo_nome || 'Sem nome'}</div>
                  </div>
                </div>

                <Badge className={`${
                  imp.status === 'Desfeita'
                    ? 'bg-muted text-foreground/90 dark:bg-muted dark:text-foreground/90'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                } text-xs`}>
                  {imp.status === 'Desfeita' ? (
                    <><XCircle className="w-3 h-3 mr-1" />Desfeita</>
                  ) : (
                    <><CheckCircle className="w-3 h-3 mr-1" />Concluída</>
                  )}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
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
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  Desfeita em {formatDate(imp.data_desfeita)} por {imp.usuario_desfez}
                </div>
              )}

              {imp.status === 'Concluída' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDesfazer(imp)}
                  disabled={isUndoing !== null}
                  className="w-full gap-2 text-xs dark:border-border/40 dark:text-foreground/90 dark:hover:bg-primary/90"
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