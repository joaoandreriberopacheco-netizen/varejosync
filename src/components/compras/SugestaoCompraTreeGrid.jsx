import React, { useState, useCallback, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { ChevronRight, Layers } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  useCatalogTreeGrid,
  flattenTree,
  mergeAdjacentDuplicateGroupHeaders,
  catalogProdutosStructureSig,
  TREE_GRID_EXPAND_ALL_LEVEL,
  resolveExpandedKeysForMasterLevel,
} from '@/components/produtos/treegrid/useTreeGrid';
import { LevelControl } from '@/components/produtos/treegrid/TreeGrid';
import { useVirtualRows } from '@/hooks/useVirtualRows';
import { cn } from '@/components/utils';
import { p38Table } from '@/lib/p38TableSurfaces';
import {
  countDescendantSugestaoLinhas,
  getLinhaAbcdLetter,
  resolveSugestaoLinhaForTreeRow,
} from '@/lib/sugestaoCompraTree';

/** Listas típicas de sugestão (<250 linhas): render completo evita tela vazia da virtualização. */
const SUGESTAO_VIRTUALIZE_MIN_ROWS = 250;

const HIER_STEP = 20;
const CELL_PAD = 4;
const PRODUTO_MIN_WIDTH = 220;
const PRODUTO_STICKY_SHADOW = 'shadow-[4px_0_12px_-4px_rgba(0,0,0,0.12)] dark:shadow-[4px_0_12px_-4px_rgba(0,0,0,0.45)]';

const fmtN = (n) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

function AbcdBadge({ letter }) {
  const value = String(letter || '').toUpperCase();
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  const tone =
    value === 'A' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
    : value === 'B' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300'
    : value === 'C' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
    : value === 'E' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
    : 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-bold ${tone}`}>
      {value}
    </span>
  );
}

const catalogHierDepth = (level) => Math.max(0, (level ?? 1) - 1);

function ProdutoCell({ row, isExpanded, onToggle }) {
  const isCategoryBand = !!row.isCategoryBand;
  const isGroup = row.type === 'group';
  const hierDepth = isCategoryBand ? 0 : catalogHierDepth(row.level);
  const p = row.produto;
  const label = isGroup ? row.label : p?.nome;
  const isPrimeiroNivel = row.level === 1;

  return (
    <div
      className="flex items-center w-max max-w-none"
      style={{ paddingLeft: CELL_PAD + hierDepth * HIER_STEP }}
    >
      {isGroup ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(row.key); }}
          className="flex items-center gap-1.5 min-w-0 text-left"
        >
          <ChevronRight
            className={cn(
              'w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0',
              isExpanded && 'rotate-90',
            )}
          />
          <span className={cn(
            'text-xs whitespace-nowrap uppercase tracking-wide truncate',
            isCategoryBand
              ? 'font-bold text-teal-800 dark:text-teal-300'
              : isPrimeiroNivel
                ? 'font-semibold text-foreground/90'
                : 'font-normal text-muted-foreground',
          )}>
            {label}
          </span>
          {row.count > 0 ? (
            <Badge
              variant="outline"
              className={cn(
                'h-5 px-1.5 text-[10px] font-medium flex-shrink-0',
                isCategoryBand
                  ? 'border-teal-200/60 text-teal-700 dark:border-teal-800 dark:text-teal-300'
                  : 'border-border/40 text-muted-foreground',
              )}
            >
              {row.count}
            </Badge>
          ) : null}
        </button>
      ) : (
        <div className="flex items-center gap-1.5 min-w-0 ml-5">
          <span className={cn(
            'text-xs uppercase truncate',
            isPrimeiroNivel ? 'font-semibold text-foreground/90' : 'text-muted-foreground',
          )}>
            {label}
          </span>
          {p?.codigo_interno ? (
            <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">{p.codigo_interno}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SugestaoDataCells({ linha, row, disp, renderFornecedorSelect }) {
  if (!linha) {
    const groupAbcd = row?.abcdDominante || '';
    return (
      <>
        <td className="text-center py-2 px-2 whitespace-nowrap">
          {groupAbcd ? <AbcdBadge letter={groupAbcd} /> : <span className="text-xs text-muted-foreground">—</span>}
        </td>
        <td className="text-right py-2 px-2"><span className="text-xs text-muted-foreground">—</span></td>
        <td className="text-right py-2 px-2"><span className="text-xs text-muted-foreground">—</span></td>
        <td className="text-right py-2 px-2"><span className="text-xs text-muted-foreground">—</span></td>
        <td className="py-2 px-2"><span className="text-xs text-muted-foreground">—</span></td>
      </>
    );
  }

  const sugestao = linha.sugestao;
  const estoque = sugestao?.estoque_atual ?? linha.produto?.estoque_atual ?? 0;
  const ponto = sugestao?.ponto_pedido ?? linha.produto?.estoque_minimo ?? 0;
  const abcd = getLinhaAbcdLetter(linha, row?.abcdDominante);

  return (
    <>
      <td className="text-center py-2 px-2 whitespace-nowrap">
        <AbcdBadge letter={abcd} />
      </td>
      <td className="text-right py-2 px-2 whitespace-nowrap">
        <span className="text-xs text-muted-foreground tabular-nums">{fmtN(estoque)}</span>
      </td>
      <td className="text-right py-2 px-2 whitespace-nowrap">
        <span className="text-xs text-muted-foreground tabular-nums">{fmtN(ponto)}</span>
      </td>
      <td className="text-right py-2 px-2 whitespace-nowrap">
        <span className="text-xs font-medium text-foreground tabular-nums">
          {fmtN(disp?.quantidade ?? 0)}
          {disp?.unidade ? <span className="text-muted-foreground font-normal ml-1">{disp.unidade}</span> : null}
        </span>
        {linha.tipo === 'grupo' ? (
          <div className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5 justify-end">
            <Layers className="w-3 h-3" />
            {linha.skus?.length ?? 0} mod.
          </div>
        ) : null}
      </td>
      <td className="py-2 px-2 min-w-[10rem]" onClick={(e) => e.stopPropagation()}>
        {renderFornecedorSelect?.(linha)}
      </td>
    </>
  );
}

export default function SugestaoCompraTreeGrid({
  produtos,
  linhaLookup,
  agruparHierarquia = true,
  sortOrder = 'abcd_desc',
  groupByCategory = false,
  masterLevel = 1,
  selectedItems = {},
  onToggleSelected,
  sugestaoDisplayLinha,
  renderFornecedorSelect,
}) {
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const scrollContainerRef = useRef(null);
  const treeRef = useRef(null);

  const tree = useCatalogTreeGrid(produtos, { groupByCategory });
  treeRef.current = tree;

  const produtosStructureSig = useMemo(
    () => catalogProdutosStructureSig(produtos, { groupByCategory }),
    [produtos, groupByCategory],
  );

  useEffect(() => {
    setExpandedKeys(resolveExpandedKeysForMasterLevel(treeRef.current, masterLevel, groupByCategory));
  }, [produtosStructureSig, groupByCategory, masterLevel]);

  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = 0;
  }, [produtosStructureSig, groupByCategory, masterLevel, sortOrder]);

  const rows = useMemo(
    () => mergeAdjacentDuplicateGroupHeaders(
      flattenTree(tree, expandedKeys, '', 0, sortOrder, { groupByCategory }),
    ),
    [tree, expandedKeys, sortOrder, groupByCategory],
  );

  const handleToggle = useCallback((key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const estimateRowSize = useCallback(
    (index) => (rows[index]?.type === 'group' ? 40 : 48),
    [rows],
  );
  const virtualRows = useVirtualRows({
    itemCount: rows.length,
    estimateSize: estimateRowSize,
    overscan: 12,
    scrollElementRef: scrollContainerRef,
  });
  const shouldVirtualizeRows = rows.length >= SUGESTAO_VIRTUALIZE_MIN_ROWS;
  const visibleRows = useMemo(
    () => (shouldVirtualizeRows ? rows.slice(virtualRows.startIndex, virtualRows.endIndex) : rows),
    [rows, shouldVirtualizeRows, virtualRows.endIndex, virtualRows.startIndex],
  );
  const paddingTop = shouldVirtualizeRows ? virtualRows.paddingTop : 0;
  const paddingBottom = shouldVirtualizeRows ? virtualRows.paddingBottom : 0;

  const produtoWidth = PRODUTO_MIN_WIDTH;

  return (
    <div className="flex flex-col min-h-0 w-full border border-border/40 rounded-lg overflow-hidden bg-card">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto overscroll-contain max-h-[min(70vh,720px)] [overflow-anchor:none]"
      >
        <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 760 }}>
          <thead className={p38Table.headerSolid}>
            <tr className="border-b border-border/40">
              <th className={cn(p38Table.stickyHeadLeft, p38Table.stickyCell, PRODUTO_STICKY_SHADOW, p38Table.head, 'text-left py-2 w-10')} style={{ left: 0 }} />
              <th
                className={cn(p38Table.stickyHeadLeft, p38Table.stickyCell, PRODUTO_STICKY_SHADOW, p38Table.head, 'text-left py-2')}
                style={{ left: 40, minWidth: produtoWidth }}
              >
                Produto
              </th>
              <th className={cn(p38Table.head, 'text-center py-2 w-14')}>ABCD</th>
              <th className={cn(p38Table.head, p38Table.headRight, 'py-2 w-20')}>Estoque</th>
              <th className={cn(p38Table.head, p38Table.headRight, 'py-2 w-20')}>Ponto</th>
              <th className={cn(p38Table.head, p38Table.headRight, 'py-2 w-28')}>Qtd sugerida</th>
              <th className={cn(p38Table.head, 'text-left py-2 min-w-[10rem]')}>Fornecedor</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum item na árvore.
                </td>
              </tr>
            ) : (
              <>
                {paddingTop > 0 ? (
                  <tr aria-hidden="true"><td colSpan={7} style={{ height: paddingTop, padding: 0, border: 0 }} /></tr>
                ) : null}
                {visibleRows.map((row) => {
                  const linha = resolveSugestaoLinhaForTreeRow(row, linhaLookup, { agruparHierarquia });
                  const isExpanded = expandedKeys.has(row.key);
                  const sugestaoCount = row.type === 'group' && !linha
                    ? countDescendantSugestaoLinhas(row, linhaLookup, { agruparHierarquia })
                    : 0;

                  return (
                    <tr
                      key={row.key}
                      className={cn(
                        p38Table.row,
                        row.isCategoryBand && 'bg-teal-50/40 dark:bg-teal-950/20',
                        linha && 'hover:bg-muted/30',
                      )}
                    >
                      <td
                        className={cn(p38Table.stickyCellLeft, p38Table.stickyCell, PRODUTO_STICKY_SHADOW, 'py-2 w-10 text-center')}
                        style={{ left: 0 }}
                      >
                        {linha ? (
                          <Checkbox
                            checked={!!selectedItems[linha.id]}
                            onCheckedChange={(c) => onToggleSelected?.(linha.id, !!c)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : sugestaoCount > 0 ? (
                          <span className="text-[10px] text-muted-foreground tabular-nums">{sugestaoCount}</span>
                        ) : null}
                      </td>
                      <td
                        className={cn(p38Table.stickyCellLeft, p38Table.stickyCell, PRODUTO_STICKY_SHADOW, 'py-2')}
                        style={{ left: 40, minWidth: produtoWidth }}
                      >
                        <ProdutoCell row={row} isExpanded={isExpanded} onToggle={handleToggle} />
                      </td>
                      <SugestaoDataCells
                        linha={linha}
                        row={row}
                        disp={linha ? sugestaoDisplayLinha?.(linha) : null}
                        renderFornecedorSelect={renderFornecedorSelect}
                      />
                    </tr>
                  );
                })}
                {paddingBottom > 0 ? (
                  <tr aria-hidden="true"><td colSpan={7} style={{ height: paddingBottom, padding: 0, border: 0 }} /></tr>
                ) : null}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { LevelControl, TREE_GRID_EXPAND_ALL_LEVEL };
