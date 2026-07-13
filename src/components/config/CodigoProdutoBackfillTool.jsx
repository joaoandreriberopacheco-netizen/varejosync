import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Loader2, Shuffle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  generateRandomProductCode,
  isCanonicalProductCode,
  normalizeProductCodeForSearch,
} from '@/lib/productCode';

const PAGE_SIZE = 200;
const LOG_EVERY = 25;

function byCreatedDateAsc(a, b) {
  const da = new Date(a?.created_date || 0).getTime();
  const db = new Date(b?.created_date || 0).getTime();
  return da - db;
}

async function listAllProdutos() {
  const all = [];
  let offset = 0;

  while (true) {
    const chunk = await base44.entities.Produto.list('-created_date', PAGE_SIZE, offset);
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    all.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}

function buildBackfillPlan(produtos) {
  const ordered = [...(produtos || [])].sort(byCreatedDateAsc);
  const takenCodes = new Set(
    ordered
      .filter((p) => isCanonicalProductCode(p?.codigo_interno))
      .map((p) => normalizeProductCodeForSearch(p?.codigo_interno))
      .filter(Boolean),
  );

  const updates = [];
  for (const produto of ordered) {
    if (isCanonicalProductCode(produto?.codigo_interno)) continue;
    const novoCodigo = generateRandomProductCode(takenCodes);
    takenCodes.add(normalizeProductCodeForSearch(novoCodigo));
    updates.push({
      id: produto.id,
      nome: produto.nome || '',
      codigo_atual: produto?.codigo_interno || '',
      novo_codigo: novoCodigo,
    });
  }

  return {
    totalProdutos: ordered.length,
    codigosCanonicos: ordered.length - updates.length,
    updates,
    amostra: updates.slice(0, 5),
  };
}

export default function CodigoProdutoBackfillTool() {
  const [loading, setLoading] = useState(null); // 'preview' | 'apply' | null
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [done, setDone] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const pct = useMemo(() => {
    if (!progress.total) return 0;
    return Math.min(100, Math.round((progress.current / progress.total) * 100));
  }, [progress.current, progress.total]);

  const runPreview = async () => {
    setError('');
    setDone(null);
    setLoading('preview');
    try {
      const produtos = await listAllProdutos();
      const plan = buildBackfillPlan(produtos);
      setPreview(plan);
    } catch (err) {
      setError(err?.message || 'Falha ao analisar produtos.');
    } finally {
      setLoading(null);
    }
  };

  const runApply = async () => {
    setError('');
    setDone(null);
    setLoading('apply');
    try {
      const produtos = await listAllProdutos();
      const plan = buildBackfillPlan(produtos);
      setPreview(plan);
      setProgress({ current: 0, total: plan.updates.length });

      let current = 0;
      for (const item of plan.updates) {
        await base44.entities.Produto.update(item.id, { codigo_interno: item.novo_codigo });
        current += 1;
        if (current % LOG_EVERY === 0 || current === plan.updates.length) {
          setProgress({ current, total: plan.updates.length });
        }
      }

      setDone({
        totalProdutos: plan.totalProdutos,
        atualizados: plan.updates.length,
        codigosCanonicos: plan.codigosCanonicos,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setError(err?.message || 'Falha ao aplicar códigos alfanuméricos.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-200/70 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <Shuffle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Código alfanumérico de produto (temporário)</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Aplica código no padrão <strong>XXX-XXX</strong> para todos os produtos sem formato canônico.
            Use primeiro a análise (dry-run) e depois aplique em massa.
          </p>
        </div>
      </div>

      {preview && (
        <div className="rounded-xl bg-card/80 border border-border/40 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
          <p>Total de produtos: <strong>{preview.totalProdutos}</strong></p>
          <p>Já no padrão: <strong>{preview.codigosCanonicos}</strong></p>
          <p>Precisam atualizar: <strong>{preview.updates.length}</strong></p>
        </div>
      )}

      {loading === 'apply' && progress.total > 0 && (
        <div className="rounded-xl bg-card/80 border border-border/40 px-3 py-2.5 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>Aplicando códigos</span>
            <span>{progress.current}/{progress.total}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {done && (
        <div className="flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-400 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            Concluído — <strong>{done.atualizados}</strong> produto(s) atualizados de {done.totalProdutos}.{' '}
            {done.timestamp ? new Date(done.timestamp).toLocaleString('pt-BR') : ''}
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading != null}
          onClick={runPreview}
        >
          {loading === 'preview' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Analisar (dry-run)
        </Button>
        <Button
          type="button"
          size="sm"
          variant="default"
          disabled={loading != null}
          onClick={runApply}
        >
          {loading === 'apply' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Aplicar em todos
        </Button>
      </div>
    </div>
  );
}
