import { BarChart3, Info, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/components/utils';
import {
  gerarDiagnosticoProdutoIep,
  produtoTemMetricasIep,
  rotuloClasseAbcd,
  tonalidadeClasseAbcd,
} from '@/lib/produtoIepDiagnostico';

const P38_SECTION =
  'rounded-lg border border-border/40 dark:border-white/10 bg-card/70 dark:bg-[#2d333b]/90 p-4';

const ABCD_TONE = {
  A: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  B: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
  C: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  D: 'bg-muted text-muted-foreground border-border/40',
};

function ScoreTile({ label, value, hint }) {
  const isText = typeof value === 'string';
  const num = Number(value);
  const display =
    isText ? value : Number.isFinite(num) && num > 0 ? Math.round(num) : '—';
  return (
    <div className="rounded-lg border border-border/40 dark:border-white/10 bg-secondary/30 dark:bg-[#26262e]/80 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums text-foreground mt-1">{display}</p>
      {hint ? <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{hint}</p> : null}
    </div>
  );
}

export default function ProdutoIepTab({ produto }) {
  const classe = String(produto?.abcd || produto?.iep_classe || '').toUpperCase() || null;
  const score = Number(produto?.iep_score) || 0;
  const confiancaSimbolo = String(produto?.iep_confianca_simbolo || '').trim();
  const iepExibicao = score > 0 ? `${score}${confiancaSimbolo}` : '—';
  const codigoComportamento = String(produto?.iep_codigo_comportamento || '').toUpperCase().trim();
  const diagnostico = gerarDiagnosticoProdutoIep(produto);
  const temDados = produtoTemMetricasIep(produto);

  const h1 = produto?.campo_hierarquico_1;
  const h2 = produto?.campo_hierarquico_2;
  const grupoLabel = [h1, h2].filter(Boolean).join(' · ') || 'Sem subtipo (nível 2)';

  const tone = tonalidadeClasseAbcd(classe);
  const insightBorder =
    tone === 'success'
      ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20'
      : tone === 'warning'
        ? 'border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50 bg-amber-50/50'
        : tone === 'info'
          ? 'border-sky-200 dark:bg-sky-950/20 dark:border-sky-900/50 bg-sky-50/50'
          : 'border-border/40 bg-muted/30';

  return (
    <div className="space-y-5 max-w-2xl">
      <div className={P38_SECTION}>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted/50 p-2">
            <BarChart3 className="w-5 h-5 text-muted-foreground" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">Desempenho recente</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Resumo com base nas <strong className="font-medium text-foreground/80">vendas dos últimos 90 dias</strong>.
              Vendas com preço muito acima do habitual são ignoradas para não distorcer a análise.
              O custo usado é o <strong className="font-medium text-foreground/80">custo calculado</strong> do cadastro.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div
          className={cn(
            'col-span-2 sm:col-span-1 rounded-lg border p-4 flex flex-col items-center justify-center text-center',
            classe ? ABCD_TONE[classe] : 'border-border/40 bg-muted/20 text-muted-foreground'
          )}
        >
          <p className="text-[10px] uppercase tracking-wide opacity-80">Classe ABCD</p>
          <p className="text-4xl font-black mt-1">{classe || '—'}</p>
          <p className="text-[11px] mt-2 leading-snug opacity-90">
            {classe ? rotuloClasseAbcd(classe).split('—')[0].trim() : 'Aguardando cálculo'}
          </p>
        </div>
        <ScoreTile
          label="IEP"
          value={iepExibicao}
          hint="0–100 com confiabilidade da amostra (++ / + / -)"
        />
        <ScoreTile
          label="Média do subtipo"
          value={produto?.iep_score_nivel_2}
          hint="Nível 2 do cadastro"
        />
      </div>

      <div className={cn('rounded-lg border p-4', insightBorder)}>
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
          <p className="text-sm font-semibold text-foreground">{diagnostico.titulo}</p>
          {temDados && classe ? (
            <Badge variant="outline" className="text-[10px] h-5 ml-auto">
              {classe}
            </Badge>
          ) : null}
          {codigoComportamento ? (
            <Badge variant="outline" className="text-[10px] h-5">
              {codigoComportamento}
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed">{diagnostico.texto}</p>
      </div>

      <div className={P38_SECTION}>
        <p className="text-xs font-semibold text-foreground mb-3">Contexto no catálogo</p>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Grupo analisado (nível 2)</dt>
            <dd className="text-foreground/90 text-right font-medium">{grupoLabel}</dd>
          </div>
          {h2 ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Curva ABCD</dt>
              <dd className="text-foreground/90 text-right text-xs max-w-[60%]">
                A até 70% do lucro · B 15% · C 10% · D 5% (no subtipo)
              </dd>
            </div>
          ) : (
            <div className="flex gap-2 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Sem <strong>nível 2</strong> no cadastro, a curva usa só a <strong>família (nível 1)</strong>{' '}
                para comparar com as outras famílias.
              </span>
            </div>
          )}
        </dl>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
        Valores calculados automaticamente ao abrir o catálogo, com base nas vendas dos últimos 90 dias.
        A classe vale para todos os produtos do mesmo grupo; o score IEP é específico deste SKU.
      </p>
    </div>
  );
}
