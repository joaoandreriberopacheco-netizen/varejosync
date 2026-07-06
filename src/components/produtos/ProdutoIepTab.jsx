import { BarChart3, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/components/utils';
import {
  produtoTemMetricasIep,
  rotuloClasseAbcd,
} from '@/lib/produtoIepDiagnostico';

const P38_SECTION =
  'rounded-lg border border-border/40 dark:border-white/10 bg-card/70 dark:bg-[#2d333b]/90 p-4';

const ABCD_TONE = {
  A: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  B: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
  C: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  D: 'bg-muted text-muted-foreground border-border/40',
};

function fmtNumber(value, max = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: max });
}

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
  const scoreBase = Number(produto?.iep_score_base);
  const coefConfianca = Number(produto?.iep_coef_confianca);
  const lucro90d = Number(produto?.iep_lucro_90d);
  const lucroRefGrupo = Number(produto?.iep_lucro_ref_grupo);
  const memoriaConfianca = produto?.iep_memoria_confianca || {};
  const confiancaSimbolo = String(produto?.iep_confianca_simbolo || '').trim();
  const confiancaIndice = Number(produto?.iep_confianca_indice);
  const iepExibicao = score > 0 ? `${score}${confiancaSimbolo}` : '—';
  const codigoComportamento = String(produto?.iep_codigo_comportamento || '').toUpperCase().trim();
  const temDados = produtoTemMetricasIep(produto);

  const h1 = produto?.campo_hierarquico_1;
  const h2 = produto?.campo_hierarquico_2;
  const grupoLabel = [h1, h2].filter(Boolean).join(' · ') || 'Sem subtipo (nível 2)';
  const qtdVitrine = Number(produto?.iep_quantidade_vitrine_90d);
  const unVitrine = String(produto?.iep_unidade_vitrine || '').trim();

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
              Memória de cálculo do IEP com referência de grupo e coeficientes da amostra (janela 90 dias).
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
          hint="score final após coeficiente de confiança"
        />
        <ScoreTile
          label="Média do subtipo"
          value={produto?.iep_score_nivel_2}
          hint="Nível 2 do cadastro"
        />
      </div>

      <div className={P38_SECTION}>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-semibold text-foreground">Memória de cálculo — índice</p>
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
        <dl className="grid gap-2 text-xs">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Lucro item (90d)</dt>
            <dd className="font-medium text-foreground">R$ {fmtNumber(lucro90d)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Lucro referência do grupo</dt>
            <dd className="font-medium text-foreground">R$ {fmtNumber(lucroRefGrupo)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Score base</dt>
            <dd className="font-medium text-foreground">{fmtNumber(scoreBase, 0)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Coeficiente confiança</dt>
            <dd className="font-medium text-foreground">{fmtNumber(coefConfianca)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">IEP final</dt>
            <dd className="font-semibold text-foreground">{iepExibicao}</dd>
          </div>
        </dl>
      </div>

      <div className={P38_SECTION}>
        <p className="text-xs font-semibold text-foreground mb-3">Memória de cálculo — confiança</p>
        <dl className="grid gap-2 text-xs">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Índice de confiança</dt>
            <dd className="font-medium text-foreground">
              {fmtNumber(confiancaIndice, 0)} {confiancaSimbolo || ''}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Pedidos com o item (90d)</dt>
            <dd className="font-medium text-foreground">{fmtNumber(memoriaConfianca?.pedidos, 0)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Semanas ativas</dt>
            <dd className="font-medium text-foreground">{fmtNumber(memoriaConfianca?.semanas, 0)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Qtd vitrine 90d</dt>
            <dd className="font-medium text-foreground">
              {fmtNumber(qtdVitrine)} {unVitrine || 'UN'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Concentração no maior pedido</dt>
            <dd className="font-medium text-foreground">
              {fmtNumber(memoriaConfianca?.maxPedidoSharePct)}%
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Movimento contextual (score)</dt>
            <dd className="font-medium text-foreground">
              {fmtNumber(memoriaConfianca?.movimentoContextual, 0)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Limites movimento do grupo (Q1/Q3)</dt>
            <dd className="font-medium text-foreground">
              {fmtNumber(memoriaConfianca?.limitesMovimento?.low)} / {fmtNumber(memoriaConfianca?.limitesMovimento?.high)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Componentes normalizados</dt>
            <dd className="font-medium text-foreground text-right">
              ped {fmtNumber(memoriaConfianca?.componentes?.pedidosNorm, 0)} · sem {fmtNumber(memoriaConfianca?.componentes?.semanasNorm, 0)} · mov {fmtNumber(memoriaConfianca?.componentes?.movimentoContextual, 0)} · conc {fmtNumber(memoriaConfianca?.componentes?.concentracaoNorm, 0)} · qtd {fmtNumber(memoriaConfianca?.componentes?.quantidadeNorm, 0)}
            </dd>
          </div>
        </dl>
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
        Valores calculados automaticamente ao abrir o catálogo. Exibição focada em memória de cálculo.
      </p>
    </div>
  );
}
