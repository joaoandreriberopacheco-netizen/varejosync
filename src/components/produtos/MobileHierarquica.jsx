import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronRight, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTreeGrid, flattenTree, buildExpandedForLevel, mergeAdjacentDuplicateGroupHeaders } from './treegrid/useTreeGrid';
import { formatEstoqueApresentacao, getCatalogoComercialView } from '@/lib/productUnits';

const fmtR = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

// ── Card de SKU ────────────────────────────────────────────────────────────────
const SkuCard = React.memo(function SkuCard({ row, onEdit }) {
  const p      = row.produto;
  const markup = row.markup;
  const cat    = getCatalogoComercialView(p);
  const e = p.estoque_atual  || 0;
  const m = p.estoque_minimo || 0;
  const dotCls = !p.ativo    ? 'bg-gray-400'
    : e <= 0                 ? 'bg-red-500 md:animate-pulse'
    : e <= m                 ? 'bg-orange-400'
    : 'bg-green-500';

  const apresent = formatEstoqueApresentacao(p);
  const estoqueExibicao = apresent ? apresent.quantidade : e;
  const unidadeExibicao = apresent ? apresent.sigla : (p.unidade_principal || 'UN');

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 bg-white dark:bg-gray-900 w-full min-w-0 max-w-full box-border">
      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5">
        {p.imagem_url
          ? <img src={p.imagem_url} alt="" className="w-full h-full object-cover" />
          : <Package className="w-4 h-4 text-gray-300 dark:text-gray-600" />}
      </div>

      <div className="flex-1 min-w-0 overflow-hidden" onClick={() => onEdit(p)}>
        <p className="text-[12px] font-normal text-gray-700 dark:text-gray-200 leading-snug uppercase break-words [overflow-wrap:anywhere] line-clamp-3">
          {p.nome}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 min-w-0 max-w-full">
          <div className="flex items-center gap-1 min-w-0 max-w-full">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotCls}`} />
            <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight min-w-0">
              <span className="block truncate">{fmtN(estoqueExibicao)} {unidadeExibicao}</span>
              {apresent && (
                <span className="block truncate text-[10px] mt-0.5">
                  {apresent.rotulo ? `(${apresent.rotulo})` : '(unidade de exibição)'}
                </span>
              )}
            </span>
          </div>
          {p.codigo_interno && (
            <span className="text-[10px] text-gray-400 dark:text-gray-600 font-mono truncate max-w-[40%]">
              #{p.codigo_interno}
            </span>
          )}
          {cat.precoVenda > 0 && (
            <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-100 tabular-nums truncate max-w-full">
              R$ {fmtR(cat.precoVenda)}
              <span className="text-[10px] font-normal text-gray-400 ml-0.5">/{cat.sigla}</span>
            </span>
          )}
          {markup > 0 && (() => {
            const custo = cat.custoNaEmbalagem || 0;
            const pv = cat.precoVenda || 0;
            const label = (custo > 0 && pv > 0)
              ? `Custo R$${fmtR(custo)} → Venda R$${fmtR(pv)} (${cat.sigla}) = ${markup.toFixed(1)}% mk`
              : `${markup.toFixed(1)}% markup`;
            return (
              <span
                title={label}
                className={`text-[11px] font-medium tabular-nums flex-shrink-0 ${
                  markup < 20 ? 'text-red-500' : markup < 40 ? 'text-orange-400' : 'text-green-500'
                }`}
              >
                {markup.toFixed(1)}%↑
              </span>
            );
          })()}
        </div>
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

  const tree = useTreeGrid(produtos);
  const produtosSig = useMemo(
    () => produtos.map((p) => p?.id).filter(Boolean).join('\0'),
    [produtos]
  );

  // Reinicia expansão só quando o conjunto de produtos filtrados muda — não a cada rebuild da árvore.
  useEffect(() => {
    setExpandedKeys(buildExpandedForLevel(tree, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tree é derivado de produtos via produtosSig
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
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
