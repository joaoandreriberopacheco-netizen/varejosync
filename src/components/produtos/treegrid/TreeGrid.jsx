import React, { useState, useCallback, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { ChevronRight, Package, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTreeGrid, flattenTree, buildExpandedForLevel, mergeAdjacentDuplicateGroupHeaders, aggregateEstoqueDisplay, collectSkus } from './useTreeGrid';
import { formatEstoqueApresentacao, getCatalogoComercialView, getCatalogUnitLabels } from '@/lib/productUnits';
import { useVirtualRows } from '@/hooks/useVirtualRows';
import { cn } from '@/components/utils';
import { p38Table } from '@/lib/p38TableSurfaces';

// ── Formatação ────────────────────────────────────────────────────────────────
const fmtR   = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n) => `${(n ?? 0).toFixed(1)}%`;
const fmtN   = (n) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

// ── Definição completa de colunas ─────────────────────────────────────────────
const COL_DEFS = [
  { id: 'status',               label: 'Status',         w: 72  },
  { id: 'codigo_interno',       label: 'Código',         w: 96  },
  { id: 'codigo_barras',        label: 'Cód. Barras',    w: 120 },
  { id: 'categoria',            label: 'Categoria',      w: 120 },
  { id: 'tags',                 label: 'Tags',           w: 110 },
  { id: 'fornecedor',           label: 'Fornecedor',     w: 130 },
  { id: 'preco_venda',          label: 'Preço de venda', w: 108 },
  { id: 'margem',               label: 'Margem',         w: 80  },
  { id: 'preco_custo',          label: 'Custo Total',    w: 104 },
  { id: 'valor_compra',         label: 'Vl. Compra',     w: 100 },
  { id: 'markup',               label: 'Markup %',       w: 80  },
  { id: 'inventario_valorizado', label: 'Inventário R$', w: 108 },
  { id: 'estoque_atual',        label: 'Estoque',        w: 96  },
  { id: 'estoque_minimo',       label: 'Est. Mín',       w: 80  },
  { id: 'estoque_ideal',        label: 'Est. Ideal',     w: 80  },
  { id: 'estoque_maximo',       label: 'Est. Máx',       w: 80  },
  { id: 'tempo_reposicao',      label: 'Repos.',         w: 72  },
  { id: 'peso',                 label: 'Peso',           w: 72  },
  { id: 'dimensoes',            label: 'Dimensões',      w: 112 },
  { id: 'tipo',                 label: 'Tipo',           w: 80  },
  { id: 'unidade',              label: 'Unidades',       w: 72  },
  { id: 'unidades_pacote',      label: 'Un/Pct',         w: 72  },
];

export const ALL_COLS     = COL_DEFS;
export const DEFAULT_COLS = ['preco_venda', 'preco_custo', 'markup', 'inventario_valorizado'];
export const TREE_GRID_EXPAND_ALL_LEVEL = 99;

const INDENT_GROUP = 14;
const INDENT_SKU   = 8;  // indentação fixa de todos os SKUs — alinhamento uniforme
const W_EDIT = 60;       // coluna de edição sticky à esquerda (edit + delete)

/** Marcador verde mediterrâneo — pais e solteiros de 1º nível na árvore */
function CatalogTierDot() {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 p38-catalog-dot-ok"
      aria-hidden="true"
    />
  );
}

// ── Dot de status ─────────────────────────────────────────────────────────────
function StatusDot({ produto }) {
  const e = produto.estoque_atual  || 0;
  const m = produto.estoque_minimo || 0;
  const cls = !produto.ativo           ? 'bg-muted-foreground/40'
    : e <= 0                           ? 'bg-red-500 animate-pulse'
    : e <= m                           ? 'bg-orange-400'
    : 'p38-catalog-dot-ok';
  const label = !produto.ativo ? 'Inativo' : e <= 0 ? 'Crítico' : e <= m ? 'Baixo' : 'OK';
  return (
    <div className="flex items-center gap-1">
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cls}`} />
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

// ── Valor de célula SKU ───────────────────────────────────────────────────────
function skuCellValue(colId, produto, margem, lastro, markup) {
  const cat = getCatalogoComercialView(produto);
  switch (colId) {
    case 'status':               return <StatusDot produto={produto} />;
    case 'codigo_interno':       return <span className="text-[10px] font-mono text-muted-foreground">{produto.codigo_interno || '—'}</span>;
    case 'codigo_barras':        return <span className="text-[10px] font-mono text-muted-foreground">{produto.codigo_barras || '—'}</span>;
    case 'categoria':            return <span className="text-xs text-muted-foreground uppercase">{produto.categoria_nome || '—'}</span>;
    case 'tags':                 return (
      <div className="flex flex-wrap gap-0.5 max-w-[100px]">
        {(produto.tags || []).slice(0, 2).map(t => (
          <span key={t} className="text-[9px] bg-muted text-muted-foreground px-1 rounded">#{t}</span>
        ))}
      </div>
    );
    case 'fornecedor':           return <span className="text-xs text-muted-foreground truncate max-w-[120px] block">{produto.fornecedor_padrao_codigo || '—'}</span>;
    case 'preco_venda':          return (
      <span className="text-xs text-foreground/90 tabular-nums inline-flex flex-col leading-tight">
        {cat.precoVenda > 0 ? (
          <>
            <span>R$ {fmtR(cat.precoVenda)}</span>
            <span className="text-[10px] text-muted-foreground">/{cat.sigla}</span>
          </>
        ) : '—'}
      </span>
    );
    case 'margem':               return <span className={`text-xs tabular-nums ${margem >= 30 ? 'p38-text-accent font-medium' : margem > 0 ? 'text-muted-foreground' : 'text-red-400'}`}>{margem > 0 ? fmtPct(margem) : '—'}</span>;
    case 'preco_custo':          return (
      <span className="text-xs text-muted-foreground tabular-nums inline-flex flex-col leading-tight">
        {cat.custoNaEmbalagem > 0 ? (
          <>
            <span>R$ {fmtR(cat.custoNaEmbalagem)}</span>
            <span className="text-[10px] text-muted-foreground">/{cat.sigla}</span>
          </>
        ) : '—'}
      </span>
    );
    case 'valor_compra':         return (
      <span className="text-xs text-muted-foreground tabular-nums inline-flex flex-col leading-tight">
        {cat.valorCompraNaEmbalagem > 0 ? (
          <>
            <span>R$ {fmtR(cat.valorCompraNaEmbalagem)}</span>
            <span className="text-[10px] text-muted-foreground">/{cat.sigla}</span>
          </>
        ) : '—'}
      </span>
    );
    case 'markup':               return (
      <span className="text-xs text-muted-foreground tabular-nums">
        {lastro >= 0 && markup > 0 ? `${fmtN(markup)}%` : (produto.preco_venda_percentual > 0 ? `${fmtN(produto.preco_venda_percentual)}%` : '—')}
      </span>
    );
    case 'inventario_valorizado':return <span className="text-xs text-muted-foreground tabular-nums">{lastro > 0 ? fmtR(lastro) : '—'}</span>;
    case 'estoque_atual': {
      const apresent = formatEstoqueApresentacao(produto);
      const qtdExibicao = apresent ? apresent.quantidade : produto.estoque_atual;
      const unExibicao = apresent ? apresent.sigla : (produto.unidade_principal || 'UN');
      return (
        <span className="flex flex-col text-xs text-muted-foreground tabular-nums leading-tight">
          <span>{fmtN(qtdExibicao)} {unExibicao}</span>
          {apresent && (
            <span className="text-[10px] text-muted-foreground mt-0.5">
              {apresent.rotulo ? `(${apresent.rotulo})` : '(unidade de vitrine)'}
            </span>
          )}
        </span>
      );
    }
    case 'estoque_minimo':       return <span className="text-xs text-muted-foreground tabular-nums">{fmtN(produto.estoque_minimo)}</span>;
    case 'estoque_ideal':        return <span className="text-xs text-muted-foreground tabular-nums">{fmtN(produto.estoque_ideal)}</span>;
    case 'estoque_maximo':       return <span className="text-xs text-muted-foreground tabular-nums">{fmtN(produto.estoque_maximo)}</span>;
    case 'tempo_reposicao':      return <span className="text-xs text-muted-foreground tabular-nums">{produto.tempo_reposicao_dias || 0}d</span>;
    case 'peso':                 return <span className="text-xs text-muted-foreground tabular-nums">{fmtN(produto.peso_kg)}kg</span>;
    case 'dimensoes':            return <span className="text-xs text-muted-foreground">{produto.dimensoes_cm || '—'}</span>;
    case 'tipo':                 return <span className="text-xs text-muted-foreground">{produto.tipo || '—'}</span>;
    case 'unidade': {
      const { unidadeBase, unidadeComercial, mostramMesma } = getCatalogUnitLabels(produto);
      return (
        <span className="flex flex-col text-xs text-muted-foreground leading-tight">
          <span>{unidadeBase || '—'}</span>
          {!mostramMesma && (
            <span className="text-[9px] text-muted-foreground dark:text-muted-foreground mt-0.5">Vitrine: {unidadeComercial}</span>
          )}
        </span>
      );
    }
    case 'unidades_pacote':      return <span className="text-xs text-muted-foreground">{produto.unidades_por_pacote || 1}</span>;
    default:                     return <span className="text-xs text-muted-foreground">—</span>;
  }
}

// ── Valor agregado para grupos ────────────────────────────────────────────────
function groupCellValue(colId, row) {
  const tilde  = v => v > 0 ? <span className="text-xs text-muted-foreground tabular-nums">~{fmtR(v)}</span> : dash();
  const tildeP = v => v > 0 ? <span className="text-xs text-muted-foreground tabular-nums">~{fmtPct(v)}</span> : dash();
  const dash   = () => <span className="text-xs text-muted-foreground dark:text-foreground/90">—</span>;
  switch (colId) {
    case 'preco_venda':           return tilde(row.precoMedio);
    case 'preco_custo':           return tilde(row.custoMedio);
    case 'valor_compra':          return tilde(row.valorCompraMedio);
    case 'markup':                return tildeP(row.markupMedio);
    case 'margem':                return tildeP(row.margemMedia);
    case 'inventario_valorizado': return row.lastroTotal > 0
      ? <span className="text-xs font-semibold text-muted-foreground tabular-nums">{fmtR(row.lastroTotal)}</span>
      : dash();
    case 'estoque_atual': {
      const skus = collectSkus(row.node);
      const disp = aggregateEstoqueDisplay(skus);
      if (disp.mode === 'empty') return dash();
      if (disp.mode === 'mixed') {
        return (
          <span className="text-xs text-muted-foreground tabular-nums inline-flex flex-col leading-tight items-end">
            <span>{fmtN(disp.quantidade)}</span>
            <span className="text-[10px] text-muted-foreground">un. base (mistura)</span>
          </span>
        );
      }
      return (
        <span className="flex flex-col text-xs text-muted-foreground tabular-nums leading-tight items-end">
          <span>
            {fmtN(disp.quantidade)} {disp.sigla || (skus[0]?.unidade_principal || 'UN')}
          </span>
          {disp.mode === 'display' ? (
            <span className="text-[10px] text-muted-foreground mt-0.5">
              {disp.rotulo ? `(${disp.rotulo})` : '(unidade de vitrine)'}
            </span>
          ) : null}
        </span>
      );
    }
    case 'estoque_minimo':        return <span className="text-xs text-muted-foreground tabular-nums">{fmtN(row.estoqueMinTotal)}</span>;
    case 'estoque_ideal':         return <span className="text-xs text-muted-foreground tabular-nums">{fmtN(row.estoqueIdealTotal)}</span>;
    case 'estoque_maximo':        return <span className="text-xs text-muted-foreground tabular-nums">{fmtN(row.estoqueMaxTotal)}</span>;
    case 'peso':                  return <span className="text-xs text-muted-foreground tabular-nums">{fmtN(row.pesoTotal)}kg</span>;
    case 'status':                return row.criticalCount > 0
      ? (
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium border-red-200 text-red-600 dark:border-red-800 dark:text-red-400">
          {row.criticalCount} crítico{row.criticalCount > 1 ? 's' : ''}
        </Badge>
      )
      : (
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium p38-catalog-badge-ok">
          OK
        </Badge>
      );
    default:                      return dash();
  }
}

// ── Linha de Grupo ─────────────────────────────────────────────────────────────
const GroupRow = React.memo(function GroupRow({ row, isExpanded, onToggle, activeCols, readOnly }) {
  const editOffset = readOnly ? 0 : W_EDIT;
  const indent = (row.level - 1) * INDENT_GROUP;
  const isLeaf = row.isLeafGroup;
  const isPrimeiroNivel = row.level === 1;

  return (
    <tr
      className={cn(p38Table.row, !isLeaf && p38Table.rowInteractive, 'select-none')}
      onClick={isLeaf ? undefined : () => onToggle(row.key)}
    >
      {!readOnly && (
        <td className={cn(p38Table.stickyCellLeft)}
          style={{ width: W_EDIT, minWidth: W_EDIT }} />
      )}
      <td
        className={cn(p38Table.stickyCell, 'py-2')}
        style={{ left: editOffset, paddingLeft: 4 + indent, paddingRight: 8, minWidth: 220 }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {!isLeaf && (
            <ChevronRight
              className={`w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
            />
          )}
          {isLeaf && <div className="w-3.5 flex-shrink-0" />}
          {isPrimeiroNivel && <CatalogTierDot />}
          <span className="text-xs font-semibold text-foreground/90 dark:text-foreground truncate uppercase tracking-wide">
            {row.label}
          </span>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium border-border/40 text-muted-foreground dark:border-border/40 dark:text-muted-foreground flex-shrink-0 ml-0.5">
            {row.count}
          </Badge>
        </div>
      </td>
      {activeCols.map(col => (
        <td key={col.id} className="text-right py-2 px-2 whitespace-nowrap"
          style={{ width: col.w, minWidth: col.w }}>
          {groupCellValue(col.id, row)}
        </td>
      ))}
    </tr>
  );
});

// ── Linha de SKU ───────────────────────────────────────────────────────────────
const SkuRow = React.memo(function SkuRow({ row, onEdit, onDelete, activeCols, readOnly }) {
  const p = row.produto;
  const editOffset = readOnly ? 0 : W_EDIT;
  /** Nível 1 = solteiro na raiz; nível ≥ 2 = filho sob um pai */
  const isSolteiro = row.level === 1;

  return (
    <tr className={cn(p38Table.row, isSolteiro && 'p38-catalog-row-tier', 'group')}>
      {!readOnly && (
        <td className={cn(p38Table.stickyCellLeft, isSolteiro && 'p38-catalog-row-tier__sticky', "py-1.5 text-center")}
          style={{ width: W_EDIT, minWidth: W_EDIT }}>
          <div className="flex items-center gap-0.5 justify-center">
            <Button variant="ghost" size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onEdit(p); }}>
              <Edit className="w-3 h-3 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onDelete(p); }}>
              <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-500" />
            </Button>
          </div>
        </td>
      )}
      <td
        className={cn(p38Table.stickyCell, isSolteiro && 'p38-catalog-row-tier__sticky', "py-1.5")}
        style={{ left: editOffset, paddingLeft: INDENT_SKU, paddingRight: 8, minWidth: 220 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isSolteiro && <CatalogTierDot />}
          <div className="flex-shrink-0 rounded bg-muted overflow-hidden flex items-center justify-center"
            style={{ width: 32, height: 32 }}>
            {p.imagem_url
              ? <img src={p.imagem_url} alt="" className="w-full h-full object-cover" />
              : <Package className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
          <span className="text-xs font-normal text-muted-foreground truncate uppercase">{p.nome}</span>
          {p.codigo_interno && (
            <span className="text-[10px] text-muted-foreground flex-shrink-0 font-mono">{p.codigo_interno}</span>
          )}
        </div>
      </td>
      {activeCols.map(col => (
        <td key={col.id} className="text-right py-1.5 px-2 whitespace-nowrap"
          style={{ width: col.w, minWidth: col.w }}>
          {skuCellValue(col.id, p, row.margem, row.lastro, row.markup)}
        </td>
      ))}
    </tr>
  );
});

// ── Controle de Nível (exportado para uso externo no painel fixo) ─────────────
export function LevelControl({ level, onChange }) {
  const levels = [
    { value: 1, label: '1', title: 'Mostrar apenas famílias principais' },
    { value: 2, label: '2', title: 'Expandir até o 2º nível' },
    { value: 3, label: '3', title: 'Expandir até o 3º nível' },
    { value: 4, label: '4', title: 'Expandir até o 4º nível' },
    { value: TREE_GRID_EXPAND_ALL_LEVEL, label: 'todos', title: 'Expandir todos os níveis' },
  ];

  return (
    <div className="flex items-center gap-1 select-none">
      <span className="text-[10px] text-muted-foreground mr-1">nível</span>
      {levels.map(({ value, label, title }) => (
        <button key={value} onClick={() => onChange(value)} title={title}
          className={`min-w-[24px] h-6 px-1.5 rounded text-[10px] font-semibold transition-colors ${
            level === value
              ? 'bg-muted dark:bg-muted text-white dark:text-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted dark:hover:bg-primary/90'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Componente Principal ───────────────────────────────────────────────────────
// masterLevel é controlado pelo pai (painel fixo da página Produtos).
// expandedKeys é gerenciado internamente — toggle manual do usuário funciona
// independente do nível selecionado.
export default function TreeGrid({ produtos, onEdit, onDelete, visibleColumns = DEFAULT_COLS, masterLevel = TREE_GRID_EXPAND_ALL_LEVEL, readOnly = false }) {
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const scrollContainerRef = useRef(null);
  const treeRef = useRef(null);
  const pendingScrollRestoreRef = useRef(null);

  const tree = useTreeGrid(produtos);
  treeRef.current = tree;

  // Reaplica o nível selecionado quando filtros/dados reconstruírem a árvore.
  useEffect(() => {
    const scrollEl = scrollContainerRef.current;
    if (scrollEl) {
      pendingScrollRestoreRef.current = scrollEl.scrollTop;
    }
    setExpandedKeys(
      masterLevel === 1 ? new Set() : buildExpandedForLevel(treeRef.current, masterLevel - 1)
    );
  }, [masterLevel, tree]);

  const rows = useMemo(() => mergeAdjacentDuplicateGroupHeaders(flattenTree(tree, expandedKeys)), [tree, expandedKeys]);

  useLayoutEffect(() => {
    const scrollEl = scrollContainerRef.current;
    const top = pendingScrollRestoreRef.current;
    if (scrollEl != null && top != null) {
      scrollEl.scrollTop = top;
      pendingScrollRestoreRef.current = null;
    }
  }, [expandedKeys, rows.length]);

  const handleToggle = useCallback((key) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  // Callbacks estáveis para onDelete fallback — evita recriar funções inline no map
  const noopDelete = useCallback(() => {}, []);

  const activeCols = useMemo(() => {
    const defsById = new Map(COL_DEFS.map((col) => [col.id, col]));
    return visibleColumns.map((id) => defsById.get(id)).filter(Boolean);
  }, [visibleColumns]);

  const estimateRowSize = useCallback(
    (index) => (rows[index]?.type === 'group' ? 38 : 46),
    [rows]
  );
  const virtualRows = useVirtualRows({
    itemCount: rows.length,
    estimateSize: estimateRowSize,
    overscan: 10,
    scrollElementRef: scrollContainerRef,
  });
  const shouldVirtualizeRows = rows.length > 300;
  const visibleRows = useMemo(
    () => shouldVirtualizeRows ? rows.slice(virtualRows.startIndex, virtualRows.endIndex) : rows,
    [rows, shouldVirtualizeRows, virtualRows.endIndex, virtualRows.startIndex]
  );
  const paddingTop = shouldVirtualizeRows ? virtualRows.paddingTop : 0;
  const paddingBottom = shouldVirtualizeRows ? virtualRows.paddingBottom : 0;

  const nameColLeft = readOnly ? 0 : W_EDIT;
  const headerColSpan = activeCols.length + (readOnly ? 1 : 2);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Scroll container — tabela rola livremente; coluna Produto é sticky */}
      <div className="flex-1 overflow-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }} ref={scrollContainerRef}>
        <table style={{ tableLayout: 'auto', borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' }}>
          {/* thead sticky no topo durante scroll vertical */}
          <thead className={p38Table.header}>
            <tr className="border-b border-border/40 dark:border-white/10">
              {!readOnly && (
                <th className={cn(p38Table.stickyHeadLeft)}
                  style={{ width: W_EDIT, minWidth: W_EDIT }} />
              )}
              <th
                className={cn(p38Table.stickyHeadLeft, p38Table.head, "text-left py-2")}
                style={{ left: nameColLeft, paddingLeft: 8, paddingRight: 8, minWidth: 220 }}
              >
                Produto
              </th>
              {activeCols.map(col => (
                <th key={col.id}
                  className={cn(p38Table.head, p38Table.headRight, "py-2 whitespace-nowrap")}
                  style={{ width: col.w, minWidth: col.w }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headerColSpan} className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : (
              <>
                {paddingTop > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={headerColSpan} style={{ height: paddingTop, padding: 0, border: 0 }} />
                  </tr>
                )}
                {visibleRows.map(row =>
                  row.type === 'group'
                    ? <GroupRow key={row.key} row={row}
                        isExpanded={expandedKeys.has(row.key)}
                        onToggle={handleToggle}
                        activeCols={activeCols}
                        readOnly={readOnly} />
                    : <SkuRow key={row.key} row={row}
                        onEdit={onEdit}
                        onDelete={onDelete || noopDelete}
                        activeCols={activeCols}
                        readOnly={readOnly} />
                )}
                {paddingBottom > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={headerColSpan} style={{ height: paddingBottom, padding: 0, border: 0 }} />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}