import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Package,
  RefreshCw,
} from 'lucide-react';
import {
  extractAtualizarMetasEstoqueError,
  METAS_ESTOQUE_BATCH_SIZE,
  runAtualizarMetasEstoqueJob,
} from '@/lib/runAtualizarMetasEstoqueJob';

const BATCH_SIZE = METAS_ESTOQUE_BATCH_SIZE;

/** @typedef {'idle' | 'preparing' | 'writing' | 'success' | 'empty' | 'error'} DialogPhase */

function extractInvokeError(error) {
  return extractAtualizarMetasEstoqueError(error);
}

export default function MetasEstoqueConfigTool() {
  const [running, setRunning] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  /** @type {[DialogPhase, React.Dispatch<React.SetStateAction<DialogPhase>>]} */
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState({
    bloco: 0,
    totalBlocos: 0,
    atualizados: 0,
    totalPendentes: 0,
    etapa: '',
  });
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const abortRef = useRef(false);

  const resetDialog = () => {
    setPhase('idle');
    setProgress({ bloco: 0, totalBlocos: 0, atualizados: 0, totalPendentes: 0, etapa: '' });
    setResult(null);
    setErrorMessage('');
    abortRef.current = false;
  };

  const closeDialog = () => {
    if (running) return;
    setDialogOpen(false);
    resetDialog();
  };

  const runJob = async (somenteMetasVazias) => {
    const key = somenteMetasVazias ? 'vazios' : 'completo';
    setRunning(key);
    setDialogOpen(true);
    resetDialog();
    setPhase('preparing');
    setProgress((p) => ({
      ...p,
      etapa: 'Analisando vendas 90d, dias com estoque e lead time…',
    }));

    try {
      const finalResult = await runAtualizarMetasEstoqueJob({
        somenteMetasVazias,
        batchSize: BATCH_SIZE,
        shouldAbort: () => abortRef.current,
        onProgress: (p) => {
          if (p.phase === 'preparing') {
            setPhase('preparing');
            setProgress((prev) => ({ ...prev, etapa: p.etapa || prev.etapa }));
            return;
          }
          setPhase('writing');
          setProgress({
            bloco: p.bloco ?? 0,
            totalBlocos: p.totalBlocos ?? 0,
            atualizados: p.atualizados ?? 0,
            totalPendentes: p.totalPendentes ?? 0,
            etapa: p.etapa || 'Gravando ponto de pedido e estoque ideal nos produtos…',
          });
        },
      });

      if (finalResult.status === 'sem_alteracao') {
        setPhase('empty');
        setResult({
          mensagem: finalResult.mensagem,
          somente_metas_vazias: somenteMetasVazias,
        });
        return;
      }

      setResult(finalResult);
      setPhase('success');
    } catch (error) {
      setErrorMessage(extractInvokeError(error));
      setPhase('error');
    } finally {
      setRunning(null);
    }
  };

  const pct =
    progress.totalPendentes > 0
      ? Math.min(100, Math.round((progress.atualizados / progress.totalPendentes) * 100))
      : phase === 'preparing'
        ? 8
        : 0;

  return (
    <>
      <div className="rounded-2xl bg-muted/50/60 p-4 space-y-4">
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-foreground/90">Ponto de pedido e estoque mínimo</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Calcula a partir das vendas dos últimos 90 dias (dias com estoque, sem outliers) e grava no
              cadastro: <strong className="font-medium text-foreground/80">estoque mínimo</strong> = ponto de
              pedido (média diária × lead time, padrão 20 dias) e{' '}
              <strong className="font-medium text-foreground/80">estoque ideal</strong> = quantidade a repor no
              ciclo. Produtos com trava manual são ignorados.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="justify-start dark:bg-card"
            disabled={running != null}
            onClick={() => runJob(true)}
          >
            {running === 'vazios' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Preencher produtos sem metas
          </Button>
          <Button
            type="button"
            variant="outline"
            className="justify-start dark:bg-card"
            disabled={running != null}
            onClick={() => runJob(false)}
          >
            {running === 'completo' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Package className="w-4 h-4 mr-2" />
            )}
            Recalcular todos os produtos
          </Button>
        </div>

        {result?.status === 'sucesso' && !dialogOpen && (
          <div className="rounded-xl bg-card/80 border border-border/40 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 text-foreground/90 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 p38-text-accent" />
              Última execução
            </div>
            <p>
              Atualizados: {result.atualizados ?? 0}
              {result.total_pendentes != null ? ` de ${result.total_pendentes} produtos` : ''}
            </p>
            {result.timestamp && (
              <p className="tabular-nums">{new Date(result.timestamp).toLocaleString('pt-BR')}</p>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent
          className="max-w-md bg-card border-0 shadow-2xl rounded-2xl"
          hideClose={running != null}
          onPointerDownOutside={(e) => {
            if (running) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (running) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {phase === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : phase === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : (
                <Package className="w-5 h-5 text-muted-foreground" />
              )}
              Metas de estoque
            </DialogTitle>
            <DialogDescription>
              {phase === 'preparing' && 'Preparando cálculo com vendas e movimentações dos últimos 90 dias.'}
              {phase === 'writing' && 'Salvando estoque mínimo e ideal no cadastro.'}
              {phase === 'success' && 'Processo concluído com sucesso.'}
              {phase === 'empty' && 'Nenhuma alteração necessária.'}
              {phase === 'error' && 'Não foi possível concluir a atualização.'}
            </DialogDescription>
          </DialogHeader>

          {(phase === 'preparing' || phase === 'writing') && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                <p className="text-sm text-foreground/90">{progress.etapa}</p>
              </div>

              {phase === 'writing' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                    <span>
                      Bloco {progress.bloco} de {progress.totalBlocos}
                    </span>
                    <span>
                      {progress.atualizados} / {progress.totalPendentes} produtos
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center tabular-nums">{pct}%</p>
                </div>
              )}

              {phase === 'preparing' && (
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-1/3 bg-primary/70 animate-pulse rounded-full" />
                </div>
              )}
            </div>
          )}

          {phase === 'success' && result && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 space-y-2">
              <p className="text-sm font-medium text-foreground">
                {result.atualizados} produto(s) atualizado(s)
                {result.total_pendentes != null ? ` de ${result.total_pendentes}` : ''}.
              </p>
              <p className="text-xs text-muted-foreground">
                Ponto de pedido (estoque mínimo) e quantidade de reposição (estoque ideal) gravados no cadastro.
                A tela de Sugestões de Compra usa a mesma regra em tempo real.
              </p>
              {result.total_blocos != null && (
                <p className="text-xs text-muted-foreground">
                  Processado em {result.total_blocos} bloco(s) · janela de 90 dias
                </p>
              )}
            </div>
          )}

          {phase === 'empty' && (
            <div className="rounded-xl bg-muted/60 px-4 py-3">
              <p className="text-sm text-foreground/90">
                {result?.mensagem || 'Nenhum produto precisava de atualização.'}
              </p>
            </div>
          )}

          {phase === 'error' && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 space-y-2">
              <p className="text-sm font-medium text-foreground">Erro na atualização</p>
              <p className="text-xs text-muted-foreground break-words">{errorMessage}</p>
              <p className="text-[11px] text-muted-foreground">
                Se o erro persistir, confirme que a função <strong>atualizarMetasEstoque</strong> foi
                publicada no Base44 com a versão mais recente.
              </p>
            </div>
          )}

          <DialogFooter>
            {phase === 'success' || phase === 'empty' || phase === 'error' ? (
              <Button type="button" onClick={closeDialog}>
                {phase === 'success' ? 'Concluir' : 'Fechar'}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={!running}
                onClick={() => {
                  abortRef.current = true;
                }}
              >
                Cancelar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
