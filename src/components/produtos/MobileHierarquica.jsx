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

const fmtR = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

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
    ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'warning'
      ? 'text-orange-600 dark:text-orange-300'
      : tone === 'danger'
        ? 'text-red-600 dark:text-red-400'
        : 'text-gray-900 dark:text-gray-100';

  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-100 last:border-b-0 dark:border-gray-800/70">
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wide text-gray-500 dark:text-gray-500">{label}</div>
        {hint && <div className="text-[9px] text-gray-400 dark:text-gray-600 truncate">{hint}</div>}
      </div>
      <div className={`text-xs font-semibold tabular-nums text-right ${toneClass}`}>{value}</div>
    </div>
  );
}

function PricingSection({ title, children }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-800 dark:bg-gray-900/70 dark:shadow-none">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</div>
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
      <DialogContent className="w-[92vw] max-w-sm rounded-3xl border-gray-200 bg-gray-50 p-3 text-gray-900 shadow-2xl dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100">
        <DialogHeader className="text-left space-y-1 pr-8">
          <DialogTitle className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span className="w-8 h-8 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </span>
            Precificação
          </DialogTitle>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase leading-snug line-clamp-1">{produto.nome}</p>
        </DialogHeader>

        <div className="space-y-2">
          <div className="rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm dark:border-gray-800 dark:bg-gray-900/70 dark:shadow-none">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-wide text-gray-500 dark:text-gray-500">Unidade</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-300 truncate">consulta, sem editar</div>
              </div>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger className="h-8 w-24 rounded-xl border-gray-200 bg-gray-50 text-xs text-gray-900 focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[80] border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
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
              <PricingLine label="Frete" value={`R$ ${fmtR(pricing.frete)}`} hint={`/${unidadeSelecionada}`} />
              <PricingLine label="Imposto 1" value={`R$ ${fmtR(pricing.imposto1)}`} hint={`/${unidadeSelecionada}`} />
              <PricingLine label="Imposto 2" value={`R$ ${fmtR(pricing.imposto2)}`} hint={`/${unidadeSelecionada}`} />
              <PricingLine label="Desconto" value={`- R$ ${fmtR(pricing.desconto)}`} hint={`/${unidadeSelecionada}`} tone={pricing.desconto > 0 ? 'positive' : 'default'} />
              <PricingLine label="Outros" value={`R$ ${fmtR(pricing.outros)}`} hint={`/${unidadeSelecionada}`} />
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

// ── Card de SKU ────────────────────────────────────────────────────────────────
const SkuCard = React.memo(function SkuCard({ row, onEdit, onOpenPricing }) {
  const p = row.produto;
  const e = p.estoque_atual || 0;
  const m = p.estoque_minimo || 0;
  const statusLabel = !p.ativo ? 'Inativo' : e <= 0 ? 'Crítico' : e <= m ? 'Baixo' : 'OK';
  const dotCls = !p.ativo ? 'bg-gray-400'
    : e <= 0 ? 'bg-red-500 md:animate-pulse'
    : e <= m ? 'bg-orange-400'
    : 'bg-green-500';

  const cat = getCatalogoComercialView(p);
  const apresent = formatEstoqueApresentacao(p);
  const estoqueExibicao = apresent ? apresent.quantidade : e;
  const unidadeExibicao = apresent ? apresent.sigla : (p.unidade_principal || 'UN');

  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)_44px] gap-3 px-3 py-2.5 bg-white dark:bg-gray-900 w-full min-w-0 max-w-full box-border">
      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5">
        {p.imagem_url
          ? <img src={p.imagem_url} alt="" className="w-full h-full object-cover" />
          : <Package className="w-4 h-4 text-gray-300 dark:text-gray-600" />}
      </div>

      <button type="button" className="min-w-0 overflow-hidden text-left" onClick={() => onEdit(p)}>
        <p className="text-[12px] font-normal text-gray-700 dark:text-gray-200 leading-snug uppercase break-words [overflow-wrap:anywhere] line-clamp-3">
          {p.nome}
        </p>
        <div className="mt-1.5 min-w-0 max-w-full">
          <div className="grid grid-cols-3 gap-2 min-w-0">
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-wide text-gray-400 dark:text-gray-600">Estoque</div>
              <div className="text-[11px] font-medium text-gray-600 dark:text-gray-300 tabular-nums truncate">
                {fmtN(estoqueExibicao)} {unidadeExibicao}
              </div>
              {apresent && (
                <div className="text-[9px] text-gray-400 dark:text-gray-600 truncate">
                  {apresent.rotulo || 'unidade de exibição'}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-wide text-gray-400 dark:text-gray-600">Preço venda</div>
              <div className="text-[11px] font-semibold text-gray-800 dark:text-gray-100 tabular-nums truncate">
                {cat.precoVenda > 0 ? (
                  <>R$ {fmtR(cat.precoVenda)} <span className="text-[9px] font-normal text-gray-400">/{cat.sigla}</span></>
                ) : '-'}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-wide text-gray-400 dark:text-gray-600">Status</div>
              <div className="flex items-center gap-1 min-w-0">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotCls}`} />
                <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{statusLabel}</span>
              </div>
            </div>
          </div>
          {p.codigo_interno && (
            <div className="mt-1 text-[10px] text-gray-400 dark:text-gray-600 font-mono truncate">
              #{p.codigo_interno}
            </div>
          )}
        </div>
      </button>

      <div className="flex items-start justify-end pt-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(event) => {
            event.stopPropagation();
            onOpenPricing(p);
          }}
          className="h-9 w-9 rounded-2xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 dark:text-emerald-300"
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
      className={`w-full min-w-0 max-w-full flex items-center gap-2 py-2.5 text-left box-border transition-colors active:bg-gray-100 dark:active:bg-gray-700/40 overflow-hidden ${
        isRoot
          ? 'px-4 bg-white dark:bg-gray-900'
          : 'pl-8 pr-4 bg-gray-50/70 dark:bg-gray-800/40'
      }`}
    >
      <ChevronRight
        className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 md:transition-transform md:duration-150 ${isExpanded ? 'rotate-90' : ''}`}
      />
      <span className={`flex-1 min-w-0 truncate ${
        isRoot
          ? 'text-[12px] font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide'
          : 'text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase'
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
              ? 'border-gray-700 text-gray-800 dark:border-gray-500 dark:text-gray-100'
              : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
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
        <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Package className="w-7 h-7 text-gray-300 dark:text-gray-600" />
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhum produto encontrado</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tente ajustar os filtros de busca</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
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
