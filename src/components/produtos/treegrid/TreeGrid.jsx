import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronRight, Package, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTreeGrid, flattenTree, buildExpandedForLevel } from './useTreeGrid';

// ── Formatação ────────────────────────────────────────────────────────────────
const fmtR   = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n) => `${(n ?? 0).toFixed(1)}%`;

// IDs alinhados com ColumnSelector
const COLS = {
  preco_venda:           { id: 'preco_venda',           label: 'Preço Venda',       w: 108 },
  preco_custo:           { id: 'preco_custo',            label: 'Custo',             w: 96  },
  margem:                { id: 'margem',                 label: 'Margem',            w: 80  },
  inventario_valorizado: { id: 'inventario_valorizado',  label: 'Inventário R$',     w: 108 },
};
export const ALL_COLS    = Object.values(COLS);
export const DEFAULT_COLS = ALL_COLS.map(c => c.id);

const INDENT = 14;
const W_ACAO = 36;

// ── Linha de Grupo ─────────────────────────────────────────────────────────────
function GroupRow({ row, isExpanded, onToggle, visibleColumns }) {
  const indent = (row.level - 1) * INDENT;
  const show = (id) => visibleColumns.includes(id);

  return (
    <tr
      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer select-none"
      onClick={onToggle}
    >
      {/* Col Fixa — Nome (sticky) */}
      <td
        className="py-2 sticky left-0 bg-white dark:bg-gray-900 z-30 border-r border-gray-100 dark:border-gray-800"
        style={{ paddingLeft: 8 + indent, paddingRight: 8, minWidth: 220 }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <ChevronRight
            className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
          />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-100 truncate uppercase tracking-wide">
            {row.label}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 ml-0.5">
            ({row.count})
          </span>
        </div>
      </td>

      {show('preco_venda') && (
        <td className="text-right py-2 px-2" style={{ width: COLS.preco_venda.w, minWidth: COLS.preco_venda.w }}>
          {row.precoMedio > 0
            ? <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">~{fmtR(row.precoMedio)}</span>
            : <span className="text-xs text-gray-300 dark:text-gray-700">—</span>}
        </td>
      )}

      {show('preco_custo') && (
        <td className="text-right py-2 px-2" style={{ width: COLS.preco_custo.w, minWidth: COLS.preco_custo.w }}>
          {row.custoMedio > 0
            ? <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">~{fmtR(row.custoMedio)}</span>
            : <span className="text-xs text-gray-300 dark:text-gray-700">—</span>}
        </td>
      )}

      {show('margem') && (
        <td className="text-right py-2 px-2" style={{ width: COLS.margem.w, minWidth: COLS.margem.w }}>
          {row.margemMedia > 0
            ? <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">~{fmtPct(row.margemMedia)}</span>
            : <span className="text-xs text-gray-300 dark:text-gray-700">—</span>}
        </td>
      )}

      {show('inventario_valorizado') && (
        <td className="text-right py-2 px-2" style={{ width: COLS.inventario_valorizado.w, minWidth: COLS.inventario_valorizado.w }}>
          {row.lastroTotal > 0
            ? <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 tabular-nums">{fmtR(row.lastroTotal)}</span>
            : <span className="text-xs text-gray-300 dark:text-gray-700">—</span>}
        </td>
      )}

      <td style={{ width: W_ACAO, minWidth: W_ACAO }} />
    </tr>
  );
}

// ── Linha de SKU ───────────────────────────────────────────────────────────────
function SkuRow({ row, onEdit, visibleColumns }) {
  const p = row.produto;
  const indent = (row.level - 1) * INDENT;
  const show = (id) => visibleColumns.includes(id);

  const estoqueAtual  = p.estoque_atual  || 0;
  const estoqueMinimo = p.estoque_minimo || 0;
  const dotColor =
    !p.ativo                        ? 'bg-gray-400'
    : estoqueAtual <= 0             ? 'bg-red-500 animate-pulse'
    : estoqueAtual <= estoqueMinimo ? 'bg-orange-400'
    : 'bg-green-500';

  return (
    <tr className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/70 dark:hover:bg-gray-800/25 group">
      {/* Col Fixa — Marco 0: Imagem à extrema esquerda + Status + Nome + Código */}
      <td
        className="py-1.5 sticky left-0 bg-white dark:bg-gray-900 z-30 border-r border-gray-100 dark:border-gray-800"
        style={{ paddingLeft: 8 + indent, paddingRight: 8, minWidth: 220 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Imagem — Marco 0 (âncora visual, extrema esquerda) */}
          <div
            className="flex-shrink-0 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center"
            style={{ width: 32, height: 32 }}
          >
            {p.imagem_url
              ? <img src={p.imagem_url} alt="" className="w-full h-full object-cover" />
              : <Package className="w-3.5 h-3.5 text-gray-300" />}
          </div>
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 truncate uppercase">
            {p.nome}
          </span>
          {p.codigo_interno && (
            <span className="text-[10px] text-gray-400 dark:text-gray-600 flex-shrink-0 font-mono">
              {p.codigo_interno}
            </span>
          )}
        </div>
      </td>

      {show('preco_venda') && (
        <td className="text-right py-1.5 px-2" style={{ width: COLS.preco_venda.w, minWidth: COLS.preco_venda.w }}>
          <span className="text-xs font-normal text-gray-600 dark:text-gray-300 tabular-nums">
            {p.preco_venda_padrao ? `R$ ${fmtR(p.preco_venda_padrao)}` : '—'}
          </span>
        </td>
      )}

      {show('preco_custo') && (
        <td className="text-right py-1.5 px-2" style={{ width: COLS.preco_custo.w, minWidth: COLS.preco_custo.w }}>
          <span className="text-xs font-normal text-gray-400 dark:text-gray-500 tabular-nums">
            {p.preco_custo_calculado ? `R$ ${fmtR(p.preco_custo_calculado)}` : '—'}
          </span>
        </td>
      )}

      {show('margem') && (
        <td className="text-right py-1.5 px-2" style={{ width: COLS.margem.w, minWidth: COLS.margem.w }}>
          <span className={`text-xs font-normal tabular-nums ${
            row.margem >= 30 ? 'text-green-600 dark:text-green-400'
            : row.margem > 0 ? 'text-gray-400 dark:text-gray-500'
            : 'text-red-400'
          }`}>
            {row.margem > 0 ? fmtPct(row.margem) : '—'}
          </span>
        </td>
      )}

      {show('inventario_valorizado') && (
        <td className="text-right py-1.5 px-2" style={{ width: COLS.inventario_valorizado.w, minWidth: COLS.inventario_valorizado.w }}>
          <span className="text-xs font-normal text-gray-400 dark:text-gray-500 tabular-nums">
            {p.inventario_valorizado > 0 ? fmtR(p.inventario_valorizado) : '—'}
          </span>
        </td>
      )}

      <td className="py-1.5 text-center" style={{ width: W_ACAO, minWidth: W_ACAO }}>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onEdit(p); }}
        >
          <Edit className="w-3 h-3 text-gray-500" />
        </Button>
      </td>
    </tr>
  );
}

// ── Manete de Nível ────────────────────────────────────────────────────────────
function LevelControl({ level, onChange }) {
  return (
    <div className="flex items-center gap-1 select-none">
      <span className="text-[10px] text-gray-400 dark:text-gray-500 mr-1">nível</span>
      {[1, 2, 3, 4, 99].map(v => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`min-w-[24px] h-6 px-1.5 rounded text-[10px] font-semibold transition-colors ${
            level === v
              ? 'bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {v === 99 ? 'all' : v}
        </button>
      ))}
    </div>
  );
}

// ── Componente Principal ───────────────────────────────────────────────────────
export default function TreeGrid({ produtos, onEdit, visibleColumns = DEFAULT_COLS }) {
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const [masterLevel, setMasterLevel]   = useState(1);

  const tree = useTreeGrid(produtos);

  useEffect(() => {
    if (masterLevel === 1) {
      setExpandedKeys(new Set());
    } else {
      setExpandedKeys(buildExpandedForLevel(tree, masterLevel - 1));
    }
  }, [masterLevel, tree]);

  const rows = useMemo(() => flattenTree(tree, expandedKeys), [tree, expandedKeys]);

  const handleToggle = useCallback((key) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const show = (id) => visibleColumns.includes(id);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-2 px-1 mb-1">
        <span className="text-[11px] text-gray-400 dark:text-gray-500">{produtos.length} SKUs</span>
        <LevelControl level={masterLevel} onChange={setMasterLevel} />
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ tableLayout: 'auto', borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' }}>
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              <th
                className="text-left py-2 sticky left-0 bg-white dark:bg-gray-900 z-30 border-r border-gray-100 dark:border-gray-800 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                style={{ paddingLeft: 8, paddingRight: 8, minWidth: 220 }}
              >
                Produto
              </th>
              {show('preco_venda') && (
                <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"
                  style={{ width: COLS.preco_venda.w, minWidth: COLS.preco_venda.w }}>
                  Preço Venda
                </th>
              )}
              {show('preco_custo') && (
                <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                  style={{ width: COLS.preco_custo.w, minWidth: COLS.preco_custo.w }}>
                  Custo
                </th>
              )}
              {show('margem') && (
                <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                  style={{ width: COLS.margem.w, minWidth: COLS.margem.w }}>
                  Margem
                </th>
              )}
              {show('inventario_valorizado') && (
                <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"
                  style={{ width: COLS.inventario_valorizado.w, minWidth: COLS.inventario_valorizado.w }}>
                  Inventário R$
                </th>
              )}
              <th style={{ width: W_ACAO, minWidth: W_ACAO }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="py-12 text-center text-sm text-gray-400">
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : (
              rows.map(row =>
                row.type === 'group'
                  ? <GroupRow key={row.key} row={row} isExpanded={expandedKeys.has(row.key)}
                      onToggle={() => handleToggle(row.key)} visibleColumns={visibleColumns} />
                  : <SkuRow key={row.key} row={row} onEdit={onEdit} visibleColumns={visibleColumns} />
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}