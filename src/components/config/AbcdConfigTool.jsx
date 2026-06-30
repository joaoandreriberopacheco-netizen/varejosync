import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { calcularIEP } from '@/functions/calcularIEP';
import { useToast } from '@/components/ui/use-toast';

const BATCH_SIZE = 50;

function normalizeJobResponse(resp) {
  const data = resp?.data ?? resp;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return { mensagem: data };
    }
  }
  return data && typeof data === 'object' ? data : {};
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function AbcdConfigTool() {
  const { toast } = useToast();
  const [running, setRunning] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [progress, setProgress] = useState(null);

  const runJob = async (somenteAbcdVazio) => {
    const key = somenteAbcdVazio ? 'vazios' : 'completo';
    setRunning(key);
    setLastResult(null);
    setProgress(null);

    try {
      const prepResp = await calcularIEP({
        fase: 'preparar',
        somente_abcd_vazio: somenteAbcdVazio,
        modo: 'manual',
        batch_size: BATCH_SIZE,
      });
      const prep = normalizeJobResponse(prepResp);

      if (prep.error) {
        throw new Error(prep.error);
      }

      if (prep.status === 'sem_alteracao' || prep.concluido) {
        setLastResult(prep);
        toast({
          title: 'Nada a atualizar',
          description: prep.mensagem || 'Nenhum produto pendente.',
        });
        return;
      }

      const runId = prep.run_id;
      const totalPendentes = prep.total_pendentes ?? 0;
      const totalBlocos = prep.total_blocos ?? Math.ceil(totalPendentes / BATCH_SIZE);
      let offset = 0;
      let totalAtualizados = 0;
      let ultimoBloco = prep;

      setProgress({
        bloco: 0,
        totalBlocos,
        atualizados: 0,
        totalPendentes,
      });

      while (offset < totalPendentes) {
        const gravarResp = await calcularIEP({
          fase: 'gravar',
          run_id: runId,
          offset,
          batch_size: BATCH_SIZE,
          modo: 'manual',
        });
        const bloco = normalizeJobResponse(gravarResp);

        if (bloco.error) {
          throw new Error(bloco.error);
        }

        totalAtualizados += bloco.atualizados ?? 0;
        offset = bloco.proximo_offset ?? offset + BATCH_SIZE;
        ultimoBloco = bloco;

        setProgress({
          bloco: bloco.bloco_atual ?? Math.ceil(offset / BATCH_SIZE),
          totalBlocos: bloco.total_blocos ?? totalBlocos,
          atualizados: totalAtualizados,
          totalPendentes,
        });

        if (bloco.concluido) break;
        await sleep(120);
      }

      const finalResult = {
        ...ultimoBloco,
        status: 'sucesso',
        atualizados: totalAtualizados,
        total_pendentes: totalPendentes,
        somente_abcd_vazio: somenteAbcdVazio,
        modo: 'manual',
      };

      setLastResult(finalResult);
      toast({
        title: 'Curva ABCD atualizada',
        description: `${totalAtualizados} produto(s) gravado(s) em ${totalBlocos} bloco(s) · janela 90 dias`,
      });
    } catch (error) {
      const msg = error?.message || String(error);
      toast({
        title: 'Erro ao atualizar curva ABCD',
        description: msg.length > 200 ? `${msg.slice(0, 200)}…` : msg,
        variant: 'destructive',
      });
    } finally {
      setRunning(null);
      setProgress(null);
    }
  };

  return (
    <div className="rounded-2xl bg-muted/50/60 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <BarChart3 className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground/90">Curva ABCD / IEP</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Calcula a classificação com vendas dos últimos 90 dias e grava no cadastro do produto
            (campo abcd e scores IEP). O processamento roda em blocos de {BATCH_SIZE} produtos para
            não sobrecarregar o servidor. À madrugada o job recalcula todos automaticamente.
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

      {progress && (
        <div className="rounded-xl bg-card/80 border border-border/40 px-3 py-2.5 text-xs text-muted-foreground space-y-1.5">
          <p className="text-foreground/90 font-medium">
            Gravando bloco {progress.bloco} de {progress.totalBlocos}…
          </p>
          <p>
            {progress.atualizados} de {progress.totalPendentes} produto(s)
          </p>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary/70 transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.round((progress.atualizados / Math.max(1, progress.totalPendentes)) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {lastResult && !progress && (
        <div className="rounded-xl bg-card/80 border border-border/40 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1.5 text-foreground/90 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 p38-text-accent" />
            Última execução
          </div>
          <p>
            Modo: {lastResult.modo || 'manual'}
            {lastResult.somente_abcd_vazio ? ' · só vazios' : ' · catálogo completo'}
          </p>
          <p>
            Atualizados: {lastResult.atualizados ?? 0}
            {lastResult.total_pendentes != null ? ` de ${lastResult.total_pendentes} produtos` : ''}
            {lastResult.total_blocos != null ? ` · ${lastResult.total_blocos} bloco(s)` : ''}
          </p>
          {lastResult.timestamp && (
            <p className="tabular-nums">{new Date(lastResult.timestamp).toLocaleString('pt-BR')}</p>
          )}
        </div>
      )}
    </div>
  );
}
