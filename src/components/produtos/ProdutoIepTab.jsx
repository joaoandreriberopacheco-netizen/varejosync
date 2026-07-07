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

function MemRow({ label, value, strong = false }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('text-foreground sm:text-right', strong ? 'font-semibold' : 'font-medium')}>{value}</dd>
    </div>
  );
}

function fmtPct(value, max = 3) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: max })}%`;
}

export default function ProdutoIepTab({ produto }) {
  const classe = String(produto?.abcd || produto?.iep_classe || '').toUpperCase() || null;
  const score = Number(produto?.iep_score) || 0;
  const scoreBase = Number(produto?.iep_score_base ?? 0);
  const coefConfianca = Number(produto?.iep_coef_confianca ?? 0.65);
  const lucro90d = Number(produto?.iep_lucro_90d ?? 0);
  const lucroRefGlobal = Number(produto?.iep_lucro_ref_global ?? 0);
  const lucroTotalGlobal = Number(produto?.iep_lucro_total_global_90d ?? 0);
  const memoriaIndice = produto?.iep_memoria_indice || {
    indicadores: {
      lucroRelativo: { valorEncontrado: 0, referenciaGlobal: 0, normalizado: 0, peso: 0.7, contribuicao: 0, unidade: 'R$' },
      participacaoGlobal: { valorEncontrado: 0, referenciaGlobal: 5, normalizado: 0, peso: 0.3, contribuicao: 0, unidade: '%' },
    },
    resultado: { scoreBase: scoreBase || 0, lucroTotalGlobal: lucroTotalGlobal || 0 },
  };
  const memoriaConfianca = produto?.iep_memoria_confianca || {
    pedidos: 0,
    semanas: 0,
    quantidadeVitrine: 0,
    unidadeVitrine: produto?.iep_unidade_vitrine || produto?.unidade_vitrine || produto?.unidade_principal || 'UN',
    maxPedidoSharePct: 0,
    movimentoContextual: 0,
    limitesMovimento: { low: 0, high: 0 },
    componentes: {
      pedidosNorm: 0,
      semanasNorm: 0,
      movimentoContextual: 0,
      concentracaoNorm: 0,
      quantidadeNorm: 0,
    },
  };
  const confiancaSimbolo = String(produto?.iep_confianca_simbolo || '').trim();
  const confiancaIndice = Number(produto?.iep_confianca_indice ?? 0);
  const iepExibicao = score > 0 ? `${score}${confiancaSimbolo}` : '—';
  const codigoComportamento = String(produto?.iep_codigo_comportamento || '').toUpperCase().trim();
  const temDados = produtoTemMetricasIep(produto);

  const h1 = produto?.campo_hierarquico_1;
  const h2 = produto?.campo_hierarquico_2;
  const grupoLabel = [h1, h2].filter(Boolean).join(' · ') || 'Sem subtipo (nível 2)';
  const qtdVitrine = Number(produto?.iep_quantidade_vitrine_90d ?? memoriaConfianca?.quantidadeVitrine ?? 0);
  const unVitrine = String(
    produto?.iep_unidade_vitrine ||
      memoriaConfianca?.unidadeVitrine ||
      produto?.unidade_vitrine ||
      produto?.unidade_principal ||
      'UN',
  ).trim();

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
              Laudo do IEP em uma página: valor do item, referência global, normalização, peso e contribuição.
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
          <MemRow label="Lucro item (90d)" value={`R$ ${fmtNumber(lucro90d)}`} />
          <MemRow label="Lucro total global (90d)" value={`R$ ${fmtNumber(lucroTotalGlobal)}`} />
          <MemRow label="Lucro referência global" value={`R$ ${fmtNumber(lucroRefGlobal)}`} />
          <MemRow label="Score base" value={fmtNumber(scoreBase, 0)} />
          <MemRow label="Coeficiente confiança" value={fmtNumber(coefConfianca)} />
          <MemRow label="IEP final" value={iepExibicao} strong />
        </dl>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs border border-border/40 rounded-md overflow-hidden">
            <thead className="bg-secondary/40">
              <tr>
                <th className="text-left px-2 py-1.5">Indicador</th>
                <th className="text-right px-2 py-1.5">Valor item</th>
                <th className="text-right px-2 py-1.5">Ref. global</th>
                <th className="text-right px-2 py-1.5">Normalizado</th>
                <th className="text-right px-2 py-1.5">Peso</th>
                <th className="text-right px-2 py-1.5">Contrib.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              <tr>
                <td className="px-2 py-1.5">Lucro relativo</td>
                <td className="px-2 py-1.5 text-right">R$ {fmtNumber(memoriaIndice?.indicadores?.lucroRelativo?.valorEncontrado)}</td>
                <td className="px-2 py-1.5 text-right">R$ {fmtNumber(memoriaIndice?.indicadores?.lucroRelativo?.referenciaGlobal)}</td>
                <td className="px-2 py-1.5 text-right">{fmtNumber(memoriaIndice?.indicadores?.lucroRelativo?.normalizado, 0)}</td>
                <td className="px-2 py-1.5 text-right">{fmtPct((Number(memoriaIndice?.indicadores?.lucroRelativo?.peso) || 0) * 100, 1)}</td>
                <td className="px-2 py-1.5 text-right">{fmtNumber(memoriaIndice?.indicadores?.lucroRelativo?.contribuicao, 0)}</td>
              </tr>
              <tr>
                <td className="px-2 py-1.5">Participação no lucro global</td>
                <td className="px-2 py-1.5 text-right">{fmtPct(memoriaIndice?.indicadores?.participacaoGlobal?.valorEncontrado)}</td>
                <td className="px-2 py-1.5 text-right">{fmtPct(memoriaIndice?.indicadores?.participacaoGlobal?.referenciaGlobal, 1)}</td>
                <td className="px-2 py-1.5 text-right">{fmtNumber(memoriaIndice?.indicadores?.participacaoGlobal?.normalizado, 0)}</td>
                <td className="px-2 py-1.5 text-right">{fmtPct((Number(memoriaIndice?.indicadores?.participacaoGlobal?.peso) || 0) * 100, 1)}</td>
                <td className="px-2 py-1.5 text-right">{fmtNumber(memoriaIndice?.indicadores?.participacaoGlobal?.contribuicao, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={P38_SECTION}>
        <p className="text-xs font-semibold text-foreground mb-3">Memória de cálculo — confiança</p>
        <dl className="grid gap-2 text-xs">
          <MemRow
            label="Índice de confiança"
            value={`${fmtNumber(confiancaIndice, 0)} ${confiancaSimbolo || ''}`.trim()}
          />
          <MemRow label="Pedidos com o item (90d)" value={fmtNumber(memoriaConfianca?.pedidos, 0)} />
          <MemRow label="Semanas ativas" value={fmtNumber(memoriaConfianca?.semanas, 0)} />
          <MemRow label="Qtd vitrine 90d" value={`${fmtNumber(qtdVitrine)} ${unVitrine || 'UN'}`} />
          <MemRow label="Concentração no maior pedido" value={`${fmtNumber(memoriaConfianca?.maxPedidoSharePct)}%`} />
          <MemRow label="Movimento contextual (score)" value={fmtNumber(memoriaConfianca?.movimentoContextual, 0)} />
          <MemRow
            label="Limites movimento global (Q1/Q3)"
            value={`${fmtNumber(memoriaConfianca?.limitesMovimento?.low)} / ${fmtNumber(memoriaConfianca?.limitesMovimento?.high)}`}
          />
          <div className="grid gap-1 border border-border/40 rounded-md p-2 bg-secondary/20">
            <dt className="text-muted-foreground">Componentes normalizados</dt>
            <dd className="grid grid-cols-2 sm:grid-cols-5 gap-1 text-foreground font-medium">
              <span>ped {fmtNumber(memoriaConfianca?.componentes?.pedidosNorm, 0)}</span>
              <span>sem {fmtNumber(memoriaConfianca?.componentes?.semanasNorm, 0)}</span>
              <span>mov {fmtNumber(memoriaConfianca?.componentes?.movimentoContextual, 0)}</span>
              <span>conc {fmtNumber(memoriaConfianca?.componentes?.concentracaoNorm, 0)}</span>
              <span>qtd {fmtNumber(memoriaConfianca?.componentes?.quantidadeNorm, 0)}</span>
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
