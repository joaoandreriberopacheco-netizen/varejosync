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
  BarChart3,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  abcdClasseParaProduto,
  calcularMapaAbcdSomente,
} from '@/lib/calcularIepProdutos';
import { fetchPedidosVenda90d } from '@/lib/fetchPedidosVenda90d';
import { withRateLimitRetry } from '@/lib/p38ApiErrors';

const BATCH_SIZE = 40;
const PAUSE_BETWEEN_BLOCKS_MS = 2200;
const RATE_LIMIT_RETRY = { maxAttempts: 8, baseDelayMs: 2000 };
const PAUSE_BETWEEN_FALLBACK_UPDATES_MS = 350;

/** @typedef {'idle' | 'preparing' | 'writing' | 'success' | 'empty' | 'error'} DialogPhase */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function produtoAbcdVazio(produto) {
  return !String(produto?.abcd ?? '').trim();
}

async function fetchAllProdutos() {
  const todos = [];
  let skip = 0;
  const pageSize = 500;

  while (true) {
    const batch = await base44.entities.Produto.list('-created_date', pageSize, skip);
    const rows = Array.isArray(batch) ? batch : [];
    if (!rows.length) break;
    for (const produto of rows) todos.push(produto);
    skip += pageSize;
    if (rows.length < pageSize) break;
  }

  return todos;
}

async function gravarBlocoBulk(bloco, mapaAbcdGrupo) {
  const payload = bloco.map((produto) => ({
    id: produto.id,
    abcd: abcdClasseParaProduto(produto, mapaAbcdGrupo),
  }));

  if (typeof base44.entities.Produto.bulkUpdate === 'function') {
    await withRateLimitRetry(
      () => base44.entities.Produto.bulkUpdate(payload),
      RATE_LIMIT_RETRY,
    );
    return payload.length;
  }

  let count = 0;
  for (const item of payload) {
    await withRateLimitRetry(
      () => base44.entities.Produto.update(item.id, { abcd: item.abcd }),
      RATE_LIMIT_RETRY,
    );
    count += 1;
    await sleep(PAUSE_BETWEEN_FALLBACK_UPDATES_MS);
  }
  return count;
}

async function gravarAbcdEmLotes(produtos, mapaAbcdGrupo, onProgress, shouldAbort = () => false) {
  let atualizados = 0;
  const totalBlocos = Math.ceil(produtos.length / BATCH_SIZE);

  for (let i = 0; i < produtos.length; i += BATCH_SIZE) {
    if (shouldAbort()) throw new Error('Operação cancelada.');

    const bloco = produtos.slice(i, i + BATCH_SIZE);
    const blocoAtual = Math.floor(i / BATCH_SIZE) + 1;

    const gravados = await gravarBlocoBulk(bloco, mapaAbcdGrupo);
    atualizados += gravados;

    onProgress({
      bloco: blocoAtual,
      totalBlocos,
      atualizados,
      totalPendentes: produtos.length,
    });

    if (i + BATCH_SIZE < produtos.length) {
      await sleep(PAUSE_BETWEEN_BLOCKS_MS);
    }
  }

  return atualizados;
}

export default function AbcdConfigTool() {
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

  const runJob = async (somenteAbcdVazio) => {
    const key = somenteAbcdVazio ? 'vazios' : 'completo';
    setRunning(key);
    setDialogOpen(true);
    resetDialog();
    setPhase('preparing');

    try {
      setProgress((p) => ({
        ...p,
        etapa: 'Carregando vendas dos últimos 90 dias…',
      }));

      const [pedidos90d, produtos] = await Promise.all([
        fetchPedidosVenda90d(),
        fetchAllProdutos(),
      ]);

      if (abortRef.current) throw new Error('Operação cancelada.');

      const pendentes = somenteAbcdVazio
        ? produtos.filter(produtoAbcdVazio)
        : produtos;

      if (!pendentes.length) {
        setPhase('empty');
        setResult({
          mensagem: somenteAbcdVazio
            ? 'Nenhum produto com ABCD vazio no cadastro.'
            : 'Nenhum produto no cadastro.',
          somente_abcd_vazio: somenteAbcdVazio,
        });
        return;
      }

      setProgress((p) => ({
        ...p,
        etapa: 'Calculando curva A / B / C / D por grupo de produto…',
      }));

      const { mapaAbcdGrupo, grupos_nivel_2 } = calcularMapaAbcdSomente(produtos, pedidos90d);

      if (abortRef.current) throw new Error('Operação cancelada.');

      const totalBlocos = Math.ceil(pendentes.length / BATCH_SIZE);
      setPhase('writing');
      setProgress({
        bloco: 0,
        totalBlocos,
        atualizados: 0,
        totalPendentes: pendentes.length,
        etapa: 'Gravando classificação em cada produto…',
      });

      const totalAtualizados = await gravarAbcdEmLotes(
        pendentes,
        mapaAbcdGrupo,
        (p) => {
          if (abortRef.current) return;
          setProgress((prev) => ({
            ...prev,
            ...p,
            etapa: 'Gravando classificação em cada produto…',
          }));
        },
        () => abortRef.current,
      );

      if (abortRef.current) throw new Error('Operação cancelada.');

      setResult({
        status: 'sucesso',
        atualizados: totalAtualizados,
        total_pendentes: pendentes.length,
        total_blocos: totalBlocos,
        grupos_nivel_2,
        pedidos_90d: pedidos90d.length,
        somente_abcd_vazio: somenteAbcdVazio,
        timestamp: new Date().toISOString(),
      });
      setPhase('success');
    } catch (error) {
      setErrorMessage(error?.message || String(error));
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
          <BarChart3 className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-foreground/90">Curva ABCD</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Calcula a classificação A/B/C/D com vendas dos últimos 90 dias e grava no campo{' '}
              <strong>abcd</strong> de cada produto. A gravação usa lotes de {BATCH_SIZE} produtos
              por chamada à API, com pausa entre lotes para evitar bloqueio.
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
            Preencher produtos sem ABCD
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
              <BarChart3 className="w-4 h-4 mr-2" />
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
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
              )}
              Curva ABCD
            </DialogTitle>
            <DialogDescription>
              {phase === 'preparing' && 'Lendo vendas e calculando os grupos A/B/C/D.'}
              {phase === 'writing' && 'Gravando a classificação em cada produto, em blocos.'}
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
                A classificação ABCD já está gravada. O catálogo e os filtros A/B/C/D passam a usar
                esses valores.
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
                Mantenha a página aberta até concluir. Se falhar no meio, pode executar de novo —
                produtos já gravados serão apenas recalculados.
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
