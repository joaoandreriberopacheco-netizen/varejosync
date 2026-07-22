import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Gauge, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  extractAtualizarMetasEstoqueError,
  runAtualizarMetasEstoqueJob,
} from '@/lib/runAtualizarMetasEstoqueJob';

export default function PontosPedidoCatalogoDialog({
  products = [],
  open,
  onOpenChange,
  onComplete,
}) {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ atualizados: 0, totalPendentes: 0, etapa: '' });

  const produtosAtivos = (products || []).filter((p) => p?.ativo !== false && p?.tipo !== 'Serviço');

  const handleClose = (nextOpen) => {
    if (running) return;
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      setProgress({ atualizados: 0, totalPendentes: 0, etapa: '' });
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setProgress({ atualizados: 0, totalPendentes: 0, etapa: 'Preparando…' });

    try {
      const result = await runAtualizarMetasEstoqueJob({
        somenteMetasVazias: false,
        sobrescrever: true,
        produtos: produtosAtivos,
        onProgress: (p) => {
          setProgress({
            atualizados: p.atualizados ?? 0,
            totalPendentes: p.totalPendentes ?? 0,
            etapa: p.etapa || 'Gravando pontos de pedido…',
          });
        },
      });

      if (result.status === 'sem_alteracao') {
        toast({
          title: 'Nenhum produto atualizado',
          description: result.mensagem,
        });
      } else {
        toast({
          title: 'Pontos de pedido gravados',
          description: `${result.atualizados} produto(s) com estoque mínimo e ideal recalculados.`,
        });
      }

      onComplete?.(result);
      onOpenChange?.(false);
    } catch (error) {
      toast({
        title: 'Erro ao atualizar pontos de pedido',
        description: extractAtualizarMetasEstoqueError(error),
        variant: 'destructive',
      });
    } finally {
      setRunning(false);
    }
  };

  const pct =
    progress.totalPendentes > 0
      ? Math.min(100, Math.round((progress.atualizados / progress.totalPendentes) * 100))
      : running
        ? 12
        : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-card border-0 shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-muted-foreground" />
            Pontos de pedido no catálogo
          </DialogTitle>
          <DialogDescription>
            Calcula a partir das vendas dos últimos 90 dias e grava no cadastro:{' '}
            <strong>estoque mínimo</strong> (ponto de pedido) e <strong>estoque ideal</strong>{' '}
            (quantidade a repor). A tela de Sugestões de Compra só lê estes valores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground/90">{produtosAtivos.length}</strong> produto(s) ativo(s)
            no catálogo serão analisados.
          </p>
          <p className="text-xs leading-relaxed">
            Fórmula: média diária de vendas × tempo de reposição (padrão 20 dias). Produtos com trava
            manual de estoque são ignorados. Em catálogos grandes o processo pode levar alguns minutos
            (grava em lotes para não sobrecarregar o servidor).
          </p>

          {running && (
            <div className="space-y-2 rounded-xl bg-muted/60 px-3 py-3">
              <div className="flex items-center gap-2 text-foreground/90">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="text-xs">{progress.etapa}</span>
              </div>
              {progress.totalPendentes > 0 ? (
                <>
                  <Progress value={pct} className="h-2" />
                  <p className="text-[11px] tabular-nums text-center">
                    {progress.atualizados} / {progress.totalPendentes}
                  </p>
                </>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={running}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleRun} disabled={running || produtosAtivos.length === 0}>
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Atualizando…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Recalcular e gravar
              </>
            )}
          </Button>
        </DialogFooter>

        {produtosAtivos.length === 0 ? (
          <p className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            Nenhum produto ativo carregado no catálogo.
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
