import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronRight, DollarSign, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTreeGrid, flattenTree, buildExpandedForLevel, mergeAdjacentDuplicateGroupHeaders } from './treegrid/useTreeGrid';
import {
  buildPurchaseUnitOptions,
  buildSaleUnitOptions,
  formatEstoqueApresentacao,
  getCatalogoComercialView,
  resolveCustoTotalUnitBaseProduto,
} from '@/lib/productUnits';
import { P38StatusDot } from '@/components/ui/p38-mobile-line';
import {
  p38Table,
  MARGIN_TABLE_BORDER,
  MARGIN_TABLE_MICRO,
  MARGIN_TABLE_PANEL,
  MARGIN_ACCENT_VALUE,
  MARGIN_BODY_TEXT,
} from '@/lib/p38TableSurfaces';
import { cn } from '@/components/utils';

const fmtR = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

const CATALOGO_MOBILE_VALUES_GRID = 'grid grid-cols-3 gap-x-1 min-w-0';
const CATALOGO_MOBILE_HEADER_LABEL = `${MARGIN_TABLE_MICRO} uppercase tracking-wide text-right leading-none opacity-90 truncate min-w-0`;
const CATALOGO_MOBILE_ESTOQUE_COL = 'relative w-[3.25rem] flex-shrink-0 border-r border-border/40 dark:border-white/10 pr-1.5 py-2.5 text-right';
const CATALOGO_MOBILE_BODY_TEXT = `${MARGIN_BODY_TEXT} leading-none`;

/** Mesma diagramação do relatório de margem mobile (2×3 valores). */
const CATALOGO_MOBILE_VALUE_ROWS = [
  [
    { key: 'valorCompra', label: 'Valor compra' },
    { key: 'custoCalculado', label: 'Custo calc.' },
    { key: 'inventarioValorizado', label: 'Invent. R$' },
  ],
  [
    { key: 'precoVenda', label: 'Preço venda' },
    { key: 'inventarioValorizado2', label: 'Invent. R$' },
    { key: 'categoriaAbcd', label: 'Curva' },
  ],
];

function formatCatalogoMobileNum(val) {
  return (val ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildCatalogoMobileTabulatedValues(produto) {
  const cat = getCatalogoComercialView(produto);
  const custoBase = resolveCustoTotalUnitBaseProduto(produto);
  const inventario = produto?.inventario_valorizado ?? custoBase * (produto?.estoque_atual || 0);
  const inventarioFmt = inventario > 0 ? formatCatalogoMobileNum(inventario) : '—';

  return {
    valorCompra: cat.valorCompraNaEmbalagem > 0 ? formatCatalogoMobileNum(cat.valorCompraNaEmbalagem) : '—',
    custoCalculado: cat.custoNaEmbalagem > 0 ? formatCatalogoMobileNum(cat.custoNaEmbalagem) : '—',
    inventarioValorizado: inventarioFmt,
    precoVenda: cat.precoVenda > 0 ? formatCatalogoMobileNum(cat.precoVenda) : '—',
    inventarioValorizado2: inventarioFmt,
    categoriaAbcd: produto?.abcd || '—',
  };
}

function catalogoMetricValueClass(colIndex) {
  if (colIndex === 2) return `${MARGIN_ACCENT_VALUE} font-semibold`;
  return 'text-foreground dark:text-foreground font-medium dark:font-normal';
}

function buildUnitOptions(produto) {
  const purchaseOptions = buildPurchaseUnitOptions(produto);
  const saleOptions = buildSaleUnitOptions(produto);
  const byUnit = new Map();

  purchaseOptions.forEach((option) => {
    if (!option?.unidade) return;
    byUnit.set(option.unidade, {
      sigla: option.unidade,
      label: option.nome || option.rotulo || option.unidade,
      fator: Number(option.fator_conversao) || 1,
    });
  });

  saleOptions.forEach((option) => {
    if (!option?.unidade) return;
    const current = byUnit.get(option.unidade) || {
      sigla: option.unidade,
      label: option.nome || option.rotulo || option.unidade,
      fator: Number(option.fator_conversao) || 1,
    };
    byUnit.set(option.unidade, {
      ...current,
      label: current.label || option.nome || option.rotulo || option.unidade,
      fator: Number(current.fator || option.fator_conversao) || 1,
    });
  });

  if (byUnit.size === 0) {
    const fallback = produto?.unidade_principal || 'UN';
    byUnit.set(fallback, { sigla: fallback, label: 'Unidade base', fator: 1 });
  }

  return Array.from(byUnit.values());
}

function getPricingForUnit(produto, unitOption) {
  const fator = Number(unitOption?.fator) > 0 ? Number(unitOption.fator) : 1;
  const scale = (value) => Number(value || 0) * fator;
  const custoBase = resolveCustoTotalUnitBaseProduto(produto);
  const saleOptions = buildSaleUnitOptions(produto);
  const sale = saleOptions.find((option) => option.unidade === unitOption?.sigla);
  const precoVenda = Number(sale?.valor_unitario ?? (produto?.preco_venda_padrao || 0) * fator) || 0;
  const custo = custoBase * fator;
  const valorCompra = scale(produto?.valor_compra);
  const frete = scale(produto?.custo_frete_padrao);
  const imposto1 = scale(produto?.custo_imposto1_padrao);
  const imposto2 = scale(produto?.custo_imposto2_padrao);
  const desconto = scale(produto?.desconto_compra_padrao);
  const outros = scale(produto?.custo_outros_padrao);
  const margem = precoVenda > 0 ? ((precoVenda - custo) / precoVenda) * 100 : 0;
  const markup = custo > 0 ? ((precoVenda - custo) / custo) * 100 : 0;
  return { fator, precoVenda, custo, valorCompra, frete, imposto1, imposto2, desconto, outros, margem, markup };
}

function PricingLine({ label, value, tone = 'default', hint }) {
  const toneClass = tone === 'positive'
    ? 'text-[#4A5D23] dark:text-[#a4ce33]'
    : tone === 'warning'
      ? 'text-orange-600 dark:text-orange-300'
      : tone === 'danger'
        ? 'text-red-600 dark:text-red-400'
        : 'text-foreground dark:text-foreground';

  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-border/40 last:border-b-0 dark:border-border/40/70">
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">{label}</div>
        {hint && <div className="text-[9px] text-muted-foreground truncate">{hint}</div>}
      </div>
      <div className={`text-xs font-semibold tabular-nums text-right ${toneClass}`}>{value}</div>
    </div>
  );
}

function PricingSection({ title, children }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card px-3 py-2 shadow-sm dark:border-border/40 dark:bg-background/70 dark:shadow-none">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function PricingDialog({ produto, open, onOpenChange }) {
  const unitOptions = useMemo(() => buildUnitOptions(produto || {}), [produto]);
  const cat = useMemo(() => produto ? getCatalogoComercialView(produto) : null, [produto]);
  const defaultUnit = cat?.sigla || unitOptions[0]?.sigla || produto?.unidade_principal || 'UN';
  const [selectedUnit, setSelectedUnit] = useState(defaultUnit);

  useEffect(() => {
    if (open) setSelectedUnit(defaultUnit);
  }, [defaultUnit, open]);

  if (!produto) return null;

  const selectedOption = unitOptions.find((option) => option.sigla === selectedUnit) || unitOptions[0];
  const pricing = getPricingForUnit(produto, selectedOption);
  const estoqueBase = Number(produto.estoque_atual || 0);
  const estoqueNaUnidade = pricing.fator > 0 ? estoqueBase / pricing.fator : estoqueBase;
  const unidadeSelecionada = selectedOption?.sigla || selectedUnit;
  const margemTone = pricing.margem >= 30 ? 'positive' : pricing.margem > 0 ? 'warning' : 'danger';
  const markupTone = pricing.markup >= 40 ? 'positive' : pricing.markup > 0 ? 'warning' : 'danger';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-sm rounded-3xl border-border/40 bg-muted/40 p-3 text-foreground shadow-2xl dark:border-border/40 dark:bg-background dark:text-foreground">
        <DialogHeader className="text-left space-y-1 pr-8">
          <DialogTitle className="text-base font-semibold text-foreground dark:text-foreground flex items-center gap-2">
            <span className="w-8 h-8 rounded-2xl p38-catalog-icon-well flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </span>
            Precificação
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground uppercase leading-snug line-clamp-1">{produto.nome}</p>
        </DialogHeader>

        <div className="space-y-2">
          <div className="rounded-2xl border border-border/40 bg-card px-3 py-2 shadow-sm dark:border-border/40 dark:bg-background/70 dark:shadow-none">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">Unidade</div>
                <div className="text-[11px] text-muted-foreground dark:text-foreground/90 truncate">consulta, sem editar</div>
              </div>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="h-8 w-24 rounded-xl border-border/40 bg-muted/40 text-xs text-foreground focus:ring-0 dark:border-border/40 dark:bg-background dark:text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[80] border-border/40 bg-card text-foreground dark:border-border/40 dark:bg-background dark:text-foreground">
                  {unitOptions.map((option) => (
                    <SelectItem key={option.sigla} value={option.sigla} className="text-xs">
                      {option.sigla}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <PricingSection title="Custos">
              <PricingLine label="Valor compra" value={`R$ ${fmtR(pricing.valorCompra)}`} hint={`/${unidadeSelecionada}`} />
              {pricing.frete !== 0 && <PricingLine label="Frete" value={`R$ ${fmtR(pricing.frete)}`} hint={`/${unidadeSelecionada}`} />}
              {pricing.imposto1 !== 0 && <PricingLine label="Imposto 1" value={`R$ ${fmtR(pricing.imposto1)}`} hint={`/${unidadeSelecionada}`} />}
              {pricing.imposto2 !== 0 && <PricingLine label="Imposto 2" value={`R$ ${fmtR(pricing.imposto2)}`} hint={`/${unidadeSelecionada}`} />}
              {pricing.desconto !== 0 && <PricingLine label="Desconto" value={`- R$ ${fmtR(pricing.desconto)}`} hint={`/${unidadeSelecionada}`} tone={pricing.desconto > 0 ? 'positive' : 'default'} />}
              {pricing.outros !== 0 && <PricingLine label="Outros" value={`R$ ${fmtR(pricing.outros)}`} hint={`/${unidadeSelecionada}`} />}
              <PricingLine label="Custo total" value={`R$ ${fmtR(pricing.custo)}`} hint={`/${unidadeSelecionada}`} />
            </PricingSection>
            <PricingSection title="Venda">
              <PricingLine label="Preço venda" value={`R$ ${fmtR(pricing.precoVenda)}`} hint={`/${unidadeSelecionada}`} />
              <PricingLine label="Markup" value={`${fmtN(pricing.markup)}%`} tone={markupTone} />
              <PricingLine label="Margem" value={`${fmtN(pricing.margem)}%`} tone={margemTone} />
              <PricingLine label="Estoque" value={`${fmtN(estoqueNaUnidade)} ${unidadeSelecionada}`} hint={`base ${fmtN(estoqueBase)} ${produto.unidade_principal || 'UN'}`} />
            </PricingSection>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CatalogoMobileColumnHeader({ className = '' }) {
  return (
    <div className={cn(`overflow-hidden border-b ${MARGIN_TABLE_BORDER} ${MARGIN_TABLE_PANEL}`, className)}>
      <div className="flex min-w-0">
        <div className="w-[3.25rem] flex-shrink-0 border-r border-white/15 px-1.5 py-2 text-right">
          <p className={`${CATALOGO_MOBILE_HEADER_LABEL} text-right`}>Estoque</p>
          <p className={`${CATALOGO_MOBILE_HEADER_LABEL} text-right mt-2`}>Un</p>
        </div>
        <div className="flex-1 min-w-0 py-2 pr-11 pl-2">
          {CATALOGO_MOBILE_VALUE_ROWS.map((valueRow, rowIdx) => (
            <div
              key={rowIdx}
              className={`${CATALOGO_MOBILE_VALUES_GRID} ${rowIdx === 0 ? '' : 'mt-1.5'}`}
            >
              {valueRow.map(({ label }) => (
                <p key={label} className={CATALOGO_MOBILE_HEADER_LABEL}>
                  {label}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CatalogoMobileTabulatedValues({ produto, className = '' }) {
  const values = buildCatalogoMobileTabulatedValues(produto);

  return (
    <div className={className}>
      {CATALOGO_MOBILE_VALUE_ROWS.map((valueRow, rowIdx) => (
        <div
          key={rowIdx}
          className={`${CATALOGO_MOBILE_VALUES_GRID} ${rowIdx === 0 ? '' : 'mt-1'}`}
        >
          {valueRow.map(({ key }, colIdx) => (
            <p
              key={key}
              className={`${CATALOGO_MOBILE_BODY_TEXT} tabular-nums text-right truncate ${catalogoMetricValueClass(colIdx)}`}
            >
              {values[key]}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

function CatalogoMobileEstoqueCol({ quantidade, unidade, stockTone }) {
  return (
    <div className={CATALOGO_MOBILE_ESTOQUE_COL}>
      <P38StatusDot tone={stockTone} className="absolute left-0 top-3" />
      <p className={`${CATALOGO_MOBILE_BODY_TEXT} tabular-nums text-foreground`}>
        {fmtN(quantidade)}
      </p>
      <p className={`${CATALOGO_MOBILE_BODY_TEXT} uppercase text-muted-foreground mt-1.5 truncate`}>
        {unidade}
      </p>
    </div>
  );
}

// ── Linha de SKU (grelha mobile, padrão Margem / pedido de compras) ───────────
const SkuCard = React.memo(function SkuCard({ row, onEdit, onOpenPricing }) {
  const p = row.produto;
  const e = p.estoque_atual || 0;
  const m = p.estoque_minimo || 0;
  const stockTone = !p.ativo ? 'muted' : e <= 0 ? 'danger' : e <= m ? 'warning' : 'success';

  const apresent = formatEstoqueApresentacao(p);
  const estoqueExibicao = apresent ? apresent.quantidade : e;
  const unidadeExibicao = apresent ? apresent.sigla : (p.unidade_principal || 'UN');

  return (
    <div className={cn(
      p38Table.mobileLine,
      'flex min-w-0 max-w-full border-l-transparent p-0 pr-0 pl-0',
    )}>
      <button
        type="button"
        className="flex flex-1 min-w-0 text-left active:bg-secondary/30 dark:active:bg-secondary/50"
        onClick={() => onEdit(p)}
      >
        <CatalogoMobileEstoqueCol
          quantidade={estoqueExibicao}
          unidade={unidadeExibicao}
          stockTone={stockTone}
        />
        <div className="flex-1 min-w-0 py-2 pr-2 pl-2">
          <p
            lang="pt-BR"
            className="text-[12px] font-normal text-foreground/90 leading-snug uppercase break-words [overflow-wrap:anywhere] line-clamp-2"
          >
            {p.nome}
          </p>
          {p.codigo_interno && (
            <p className="mt-0.5 text-[10px] text-muted-foreground font-mono truncate">
              #{p.codigo_interno}
            </p>
          )}
          <CatalogoMobileTabulatedValues produto={p} className="mt-1" />
          {apresent && (
            <p className="mt-0.5 text-[9px] text-muted-foreground truncate">
              {apresent.rotulo || 'unidade de exibição'}
            </p>
          )}
        </div>
      </button>

      <div className="flex items-start justify-center pt-2 pr-2 w-11 flex-shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(event) => {
            event.stopPropagation();
            onOpenPricing(p);
          }}
          className="h-9 w-9 rounded-lg bg-secondary/80 text-[#4A5D23] dark:text-[#a4ce33] hover:bg-secondary"
          title="Ver precificação"
        >
          <DollarSign className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
});

// ── Cabeçalho de grupo ─────────────────────────────────────────────────────────
const GroupHeader = React.memo(function GroupHeader({ row, isExpanded, onToggle }) {
  const isRoot = row.level === 1;

  return (
    <button
      type="button"
      onClick={() => onToggle(row.key)}
      className={cn(
        p38Table.mobileLine,
        'flex items-center gap-2 border-l-transparent overflow-hidden',
        isRoot ? 'px-4' : 'pl-8 pr-4 bg-secondary/15 dark:bg-secondary/20',
      )}
    >
      <ChevronRight
        className={`w-3.5 h-3.5 text-muted-foreground flex-shrink-0 md:transition-transform md:duration-150 ${isExpanded ? 'rotate-90' : ''}`}
      />
      <span className={`flex-1 min-w-0 truncate ${
        isRoot
          ? 'text-[12px] font-semibold text-foreground uppercase tracking-wide'
          : 'text-[11px] font-medium text-muted-foreground dark:text-foreground/90 uppercase'
      }`}>
        {row.label}
      </span>
      <div className="flex items-center gap-1.5 flex-shrink-0 max-w-[45%]">
        {row.criticalCount > 0 && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium border-red-200 text-red-600 dark:border-red-800 dark:text-red-400 truncate">
            {row.criticalCount} {row.criticalCount > 1 ? 'críticos' : 'crítico'}
          </Badge>
        )}
        <Badge
          variant="outline"
          className={`h-5 px-1.5 text-[10px] font-medium flex-shrink-0 ${
            isRoot
              ? 'border-border/40 text-foreground dark:border-border/40 dark:text-foreground'
              : 'border-border/40 text-muted-foreground dark:border-border/40 dark:text-foreground/90'
          }`}
        >
          {row.count}
        </Badge>
      </div>
    </button>
  );
});

// ── Componente principal ───────────────────────────────────────────────────────
export default function MobileHierarquica({ produtos, onEdit }) {
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const [pricingProduto, setPricingProduto] = useState(null);

  const tree = useTreeGrid(produtos);
  const produtosSig = useMemo(
    () => produtos.map((p) => p?.id).filter(Boolean).join('\0'),
    [produtos]
  );

  // Reinicia expansão só quando o conjunto de produtos filtrados muda — não a cada rebuild da árvore.
  useEffect(() => {
    setExpandedKeys(buildExpandedForLevel(tree, 1));
  }, [produtosSig]);

  const rows = useMemo(() => {
    const all = mergeAdjacentDuplicateGroupHeaders(flattenTree(tree, expandedKeys));
    return all.filter(r => !(r.type === 'group' && r.count === 0));
  }, [tree, expandedKeys]);

  const handleToggle = useCallback((key) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  if (produtos.length === 0) {
    return (
      <div className="py-16 text-center px-8">
        <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Package className="w-7 h-7 text-muted-foreground dark:text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Nenhum produto encontrado</p>
        <p className="text-xs text-muted-foreground mt-1">Tente ajustar os filtros de busca</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="rounded-lg border border-border/40 dark:border-white/10 overflow-hidden">
        <CatalogoMobileColumnHeader className="sticky top-0 z-20 shadow-sm" />
        {rows.map(row => (
          <div key={row.key} className="contain-layout">
            {row.type === 'group' ? (
              <GroupHeader
                row={row}
                isExpanded={expandedKeys.has(row.key)}
                onToggle={handleToggle}
              />
            ) : (
              <SkuCard
                row={row}
                onEdit={onEdit}
                onOpenPricing={setPricingProduto}
              />
            )}
          </div>
        ))}
      </div>
      <PricingDialog
        produto={pricingProduto}
        open={!!pricingProduto}
        onOpenChange={(open) => {
          if (!open) setPricingProduto(null);
        }}
      />
    </div>
  );
}
