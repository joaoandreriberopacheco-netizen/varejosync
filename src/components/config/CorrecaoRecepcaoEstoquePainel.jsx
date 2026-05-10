import React, { useMemo, useState } from 'react';
import { Warehouse, PlayCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { corrigirMovimentosRecepcaoRetroativos } from '@/functions/corrigirMovimentosRecepcaoRetroativos';

function defaultIntervaloDatas() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 90);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { dataInicio: fmt(start), dataFim: fmt(end) };
}

function parsePedidoIds(text) {
  if (!text || !String(text).trim()) return [];
  return String(text)
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Corpo JSON da resposta invoke (axios-style). */
function unwrapInvoke(res) {
  if (res == null) return null;
  return res.data !== undefined ? res.data : res;
}

export default function CorrecaoRecepcaoEstoquePainel() {
  const defaults = useMemo(() => defaultIntervaloDatas(), []);
  const [modo, setModo] = useState('intervalo');
  const [dataInicio, setDataInicio] = useState(defaults.dataInicio);
  const [dataFim, setDataFim] = useState(defaults.dataFim);
  const [idsTexto, setIdsTexto] = useState('');
  const [limitePedidos, setLimitePedidos] = useState('8000');
  const [loading, setLoading] = useState(false);
  const [ultimoRelatorio, setUltimoRelatorio] = useState(null);

  const montarPayload = (dryRun) => {
    const base = { dryRun };
    if (modo === 'ids') {
      const pedidoIds = parsePedidoIds(idsTexto);
      if (!pedidoIds.length) {
        throw new Error('Informe pelo menos um ID de pedido de compra.');
      }
      return { ...base, pedidoIds };
    }
    if (modo === 'varredura') {
      const lim = Number(limitePedidos);
      if (!Number.isFinite(lim) || lim < 1) {
        throw new Error('Limite de pedidos inválido.');
      }
      return { ...base, varreduraCompletaPedidos: true, limitePedidos: Math.min(Math.round(lim), 15000) };
    }
    if (!dataInicio || !dataFim) {
      throw new Error('Informe data inicial e final.');
    }
    return { ...base, dataInicio, dataFim };
  };

  const executar = async (dryRun) => {
    let payload;
    try {
      payload = montarPayload(dryRun);
    } catch (e) {
      toast.error(e.message);
      return;
    }

    if (!dryRun) {
      const ok = window.confirm(
        'Vai criar movimentos de stock em falta e recalcular produtos afetados. Confirma a execução real (não é simulação)?'
      );
      if (!ok) return;
    }

    setLoading(true);
    try {
      const res = await corrigirMovimentosRecepcaoRetroativos(payload);
      const data = unwrapInvoke(res);

      if (data?.error) {
        toast.error(String(data.error));
        return;
      }

      setUltimoRelatorio(data);

      const analisados = data.pedidos_analisados ?? '—';
      const comDelta = data.pedidos_com_delta ?? '—';
      const linhas = data.linhas_corrigidas ?? 0;
      const produtos = data.produtos_recalculados ?? 0;

      if (dryRun) {
        toast.message('Simulação concluída', {
          description: `${comDelta} pedido(s) com diferença a corrigir (de ${analisados} analisados). Escopo: ${data.escopo || '—'}`,
        });
      } else {
        toast.success('Correção aplicada em lote', {
          description: `${linhas} linha(s) criada(s), ${produtos} produto(s) recalculado(s).`,
        });
      }
    } catch (e) {
      toast.error(e?.message || 'Falha ao chamar a função.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4 space-y-4 border border-amber-200/60 dark:border-amber-900/40">
      <div className="flex items-start gap-3">
        <Warehouse className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Correção automática em lote — recepção → stock
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            Processa <strong>todos os pedidos</strong> do intervalo ou da varredura de uma vez (não é um a um).
            Use primeiro <strong>Simular</strong>; só depois <strong>Aplicar</strong>.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={modo === 'intervalo' ? 'default' : 'outline'}
          size="sm"
          className="text-xs"
          onClick={() => setModo('intervalo')}
        >
          Por datas (created_date)
        </Button>
        <Button
          type="button"
          variant={modo === 'ids' ? 'default' : 'outline'}
          size="sm"
          className="text-xs"
          onClick={() => setModo('ids')}
        >
          Lista de IDs
        </Button>
        <Button
          type="button"
          variant={modo === 'varredura' ? 'default' : 'outline'}
          size="sm"
          className="text-xs"
          onClick={() => setModo('varredura')}
        >
          Varredura (últimos N PCs)
        </Button>
      </div>

      {modo === 'intervalo' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Data inicial</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data final</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>
      )}

      {modo === 'ids' && (
        <div className="space-y-1">
          <Label className="text-xs">IDs dos PedidoCompra (vírgula ou linha)</Label>
          <Textarea
            placeholder="ex.: abc123, def456 ou um ID por linha"
            value={idsTexto}
            onChange={(e) => setIdsTexto(e.target.value)}
            className="min-h-[88px] font-mono text-xs"
          />
        </div>
      )}

      {modo === 'varredura' && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Analisa os pedidos mais recentes até ao limite indicado (pesado). Ideal para uma correção global sem
              definir datas.
            </p>
          </div>
          <div className="space-y-1 max-w-xs">
            <Label className="text-xs">Máx. pedidos a analisar</Label>
            <Input
              type="number"
              min={1}
              max={15000}
              value={limitePedidos}
              onChange={(e) => setLimitePedidos(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={loading} variant="secondary" onClick={() => executar(true)}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
          Simular (dry-run)
        </Button>
        <Button type="button" disabled={loading} variant="destructive" onClick={() => executar(false)}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Aplicar correções em lote
        </Button>
      </div>

      {ultimoRelatorio && (
        <details className="text-xs bg-white dark:bg-gray-900/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
          <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-200">
            Último resultado (JSON)
          </summary>
          <pre className="mt-2 overflow-auto max-h-56 text-[11px] leading-snug">
            {JSON.stringify(ultimoRelatorio, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
