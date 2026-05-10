import React, { useState } from 'react';
import { Warehouse, Loader2, ListChecks, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { corrigirMovimentosRecepcaoRetroativos } from '@/functions/corrigirMovimentosRecepcaoRetroativos';

function unwrapInvoke(res) {
  if (res == null) return null;
  return res.data !== undefined ? res.data : res;
}

export default function CorrecaoRecepcaoEstoquePainel() {
  const [limite, setLimite] = useState('3000');
  const [loading, setLoading] = useState(false);
  const [ultimo, setUltimo] = useState(null);

  const payloadBase = () => {
    const lim = Number(limite);
    if (!Number.isFinite(lim) || lim < 1) {
      throw new Error('Indica um limite entre 1 e 15000 (quantos pedidos recentes analisar).');
    }
    return {
      somenteConcluidosRecepcaoSemStock: true,
      limitePedidos: Math.min(Math.round(lim), 15000),
    };
  };

  const simular = async () => {
    let body;
    try {
      body = { ...payloadBase(), dryRun: true };
    } catch (e) {
      toast.error(e.message);
      return;
    }
    setLoading(true);
    try {
      const data = unwrapInvoke(await corrigirMovimentosRecepcaoRetroativos(body));
      if (data?.error) {
        toast.error(String(data.error));
        return;
      }
      setUltimo(data);
      const n = data.pedidos_com_delta ?? 0;
      const rev = data.pedidos_revistos_na_fonte;
      toast.message(n ? `${n} pedido(s) precisam de correção` : 'Nenhum pedido nesta situação', {
        description:
          rev != null
            ? `Revistos ${rev} pedido(s) recentes; ${n} com falta de stock (recepção já concluída).`
            : `${data.pedidos_analisados ?? 0} pedido(s) na lista.`,
      });
    } catch (e) {
      toast.error(e?.message || 'Falha ao simular.');
    } finally {
      setLoading(false);
    }
  };

  const aplicar = async () => {
    let body;
    try {
      body = { ...payloadBase(), dryRun: false };
    } catch (e) {
      toast.error(e.message);
      return;
    }
    const ok = window.confirm(
      'Serão criadas as entradas de stock em falta só para os pedidos desta lista (recepção já concluída). Continuar?'
    );
    if (!ok) return;
    setLoading(true);
    try {
      const data = unwrapInvoke(await corrigirMovimentosRecepcaoRetroativos(body));
      if (data?.error) {
        toast.error(String(data.error));
        return;
      }
      setUltimo(data);
      toast.success('Correção aplicada', {
        description: `${data.linhas_corrigidas ?? 0} linha(s), ${data.produtos_recalculados ?? 0} produto(s) recalculado(s).`,
      });
    } catch (e) {
      toast.error(e?.message || 'Falha ao aplicar.');
    } finally {
      setLoading(false);
    }
  };

  const candidatos =
    ultimo?.detalhes?.filter((r) => Array.isArray(r.deltas) && r.deltas.length > 0) ?? [];

  return (
    <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4 space-y-4 border border-amber-200/60 dark:border-amber-900/40">
      <div className="flex items-start gap-3">
        <Warehouse className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Stock em falta após recepção
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Procuramos entre os pedidos mais recentes aqueles em que a <strong>recepção já não está pendente</strong>{' '}
            (embarque com estado de recepção concluído) mas o <strong>stock documental ainda não bate</strong> com as
            movimentações de compra. Um clique lista; outro corrige <strong>só esses</strong>.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1 w-40">
          <Label className="text-xs">Pedidos recentes a analisar</Label>
          <Input
            type="number"
            min={1}
            max={15000}
            value={limite}
            onChange={(e) => setLimite(e.target.value)}
          />
        </div>
        <Button type="button" variant="secondary" disabled={loading} onClick={simular}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ListChecks className="w-4 h-4 mr-2" />}
          Ver lista (simulação)
        </Button>
        <Button type="button" variant="destructive" disabled={loading} onClick={aplicar}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
          Corrigir estes pedidos
        </Button>
      </div>

      {candidatos.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 overflow-hidden">
          <p className="text-xs font-medium px-3 py-2 bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300">
            Última simulação — {candidatos.length} pedido(s)
          </p>
          <ul className="max-h-48 overflow-auto text-xs divide-y divide-gray-100 dark:divide-gray-800">
            {candidatos.map((row) => (
              <li key={String(row.pedido_id)} className="px-3 py-2 flex justify-between gap-2">
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  PC {row.numero ?? row.pedido_id}
                </span>
                <span className="text-gray-500 shrink-0">{row.deltas?.length ?? 0} linha(s) em falta</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ultimo && (
        <details className="text-xs bg-white dark:bg-gray-900/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
          <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-200">Detalhe técnico (JSON)</summary>
          <pre className="mt-2 overflow-auto max-h-48 text-[11px] leading-snug">
            {JSON.stringify(ultimo, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
