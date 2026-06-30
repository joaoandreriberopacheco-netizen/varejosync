import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { calcularIEP } from '@/functions/calcularIEP';
import { useToast } from '@/components/ui/use-toast';

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

export default function AbcdConfigTool() {
  const { toast } = useToast();
  const [running, setRunning] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const runJob = async (somenteAbcdVazio) => {
    const key = somenteAbcdVazio ? 'vazios' : 'completo';
    setRunning(key);
    setLastResult(null);
    try {
      const resp = await calcularIEP({
        somente_abcd_vazio: somenteAbcdVazio,
        modo: 'manual',
      });
      const data = normalizeJobResponse(resp);
      if (data.error) {
        throw new Error(data.error);
      }
      setLastResult(data);
      const atualizados = data.atualizados ?? data.processados ?? 0;
      toast({
        title: data.status === 'sem_alteracao' ? 'Nada a atualizar' : 'Curva ABCD atualizada',
        description:
          data.mensagem ||
          `${atualizados} produto(s) gravado(s) · janela ${data.regras?.janela_dias ?? 90} dias`,
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
            (campo abcd e scores IEP). O catálogo só lê esses valores. À madrugada o sistema preenche
            automaticamente os produtos que ainda estão sem ABCD.
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

      {lastResult && (
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
            {lastResult.total_produtos != null ? ` de ${lastResult.total_produtos} produtos` : ''}
          </p>
          {lastResult.timestamp && (
            <p className="tabular-nums">{new Date(lastResult.timestamp).toLocaleString('pt-BR')}</p>
          )}
        </div>
      )}
    </div>
  );
}
