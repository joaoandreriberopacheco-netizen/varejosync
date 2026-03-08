import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronRight, Package, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTreeGrid, flattenTree, buildExpandedForLevel } from './useTreeGrid';

// ── Formatação ────────────────────────────────────────────────────────────────
const fmtR   = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n) => `${(n ?? 0).toFixed(1)}%`;

// Larguras das colunas numéricas (px)
const COL = {
  preco:   112,
  custo:   100,
  margem:  80,
  lastro:  116,
  acao:    36,
};
const INDENT = 14; // px por nível visual

// Mapa de colunas disponíveis (chave → cabeçalho)
export const COLUMN_DEFS = [
  { key: 'preco',  label: 'Preço Venda' },
  { key: 'custo',  label: 'Custo'       },
  { key: 'margem', label: 'Margem'      },
  { key: 'lastro', label: 'Inventário R$' },
];

// ── Linha de Grupo ─────────────────────────────────────────────────────────────
function GroupRow({ row, isExpanded, onToggle, visibleColumns }) {
  const indent = (row.level - 1) * INDENT;
  const show   = (col) => visibleColumns.includes(col);

  return (
    <tr
      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer select-none"
      onClick={onToggle}
    >
      {/* ── Coluna Âncora (sticky) ── */}
      <td
        className="py-2 sticky left-0 z-30 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800"
        style={{ paddingLeft: 8 + indent, paddingRight: 8 }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Espaço reservado para foto — mantém alinhamento com SKUs */}
          <div className="w-7 h-7 flex-shrink-0" />
          <ChevronRight
            className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
          />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-100 truncate uppercase tracking-wide">
            {row.label}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
            ({row.count})
          </span>
        </div>
      </td>

      {show('preco') && (
        <td className="text-right py-2 px-2 whitespace-nowrap" style={{ width: COL.preco, minWidth: COL.preco }}>
          {row.precoMedioIQR > 0
            ? <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">~{fmtR(row.precoMedioIQR)}</span>
            : <span className="text-xs text-gray-300 dark:text-gray-700">—</span>}
        </td>
      )}
      {show('custo') && (
        <td className="text-right py-2 px-2" style={{ width: COL.custo, minWidth: COL.custo }}>
          {row.custoMedioIQR > 0
            ? <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">~{fmtR(row.custoMedioIQR)}</span>
            : <span className="text-xs text-gray-300 dark:text-gray-700">—</span>}
        </td>
      )}
      {show('margem') && (
        <td className="text-right py-2 px-2" style={{ width: COL.margem, minWidth: COL.margem }}>
          {row.margemMediaIQR > 0
            ? <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">~{fmtPct(row.margemMediaIQR)}</span>
            : <span className="text-xs text-gray-300 dark:text-gray-700">—</span>}
        </td>
      )}
      {show('lastro') && (
        <td className="text-right py-2 px-2" style={{ width: COL.lastro, minWidth: COL.lastro }}>
          {row.lastroTotalIQR > 0
            ? <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 tabular-nums">{fmtR(row.lastroTotalIQR)}</span>
            : <span className="text-xs text-gray-300 dark:text-gray-700">—</span>}
        </td>
      )}
      <td style={{ width: COL.acao, minWidth: COL.acao }} />
    </tr>
  );
}

// ── Linha de SKU ───────────────────────────────────────────────────────────────
function SkuRow({ row, onEdit, visibleColumns }) {
  const p      = row.produto;
  const indent = (row.level - 1) * INDENT;
  const show   = (col) => visibleColumns.includes(col);

  const dotColor =
    !p.ativo                    ? 'bg-gray-400'
    : (p.estoque_atual || 0) <= 0 ? 'bg-red-500 animate-pulse'
    : (p.estoque_atual || 0) <= (p.estoque_minimo || 0) ? 'bg-orange-400'
    : 'bg-green-500';

  return (
    <tr className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/70 dark:hover:bg-gray-800/25 group">
      {/* ── Marco 0: Imagem + Nome (sticky) ── */}
      <td
        className="py-1.5 sticky left-0 z-30 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800"
        style={{ paddingLeft: 8 + indent, paddingRight: 8 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Foto — âncora visual à esquerda */}
          <div className="w-7 h-7 flex-shrink-0 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
            {p.imagem_url
              ? <img src={p.imagem_url} alt="" className="w-full h-full object-cover" />
              : <Package className="w-3.5 h-3.5 text-gray-300" />}
          </div>

          {/* Dot de status */}
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />

          {/* Nome */}
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 truncate uppercase">
            {p.nome}
          </span>

          {/* Código interno */}
          {p.codigo_interno && (
            <span className="text-[10px] font-mono text-gray-400 dark:text-gray-600 flex-shrink-0">
              {p.codigo_interno}
            </span>
          )}
        </div>
      </td>

      {show('preco') && (
        <td className="text-right py-1.5 px-2" style={{ width: COL.preco, minWidth: COL.preco }}>
          <span className="text-xs font-normal text-gray-700 dark:text-gray-200 tabular-nums">
            {p.preco_venda_padrao ? `R$ ${fmtR(p.preco_venda_padrao)}` : '—'}
          </span>
        </td>
      )}
      {show('custo') && (
        <td className="text-right py-1.5 px-2" style={{ width: COL.custo, minWidth: COL.custo }}>
          <span className="text-xs font-normal text-gray-400 dark:text-gray-500 tabular-nums">
            {p.preco_custo_calculado ? `R$ ${fmtR(p.preco_custo_calculado)}` : '—'}
          </span>
        </td>
      )}
      {show('margem') && (
        <td className="text-right py-1.5 px-2" style={{ width: COL.margem, minWidth: COL.margem }}>
          <span className={`text-xs font-normal tabular-nums ${
            p.margem_pct >= 30 ? 'text-green-600 dark:text-green-400'
            : p.margem_pct > 0 ? 'text-gray-500 dark:text-gray-400'
            : 'text-red-500'
          }`}>
            {p.margem_pct > 0 ? fmtPct(p.margem_pct) : '—'}
          </span>
        </td>
      )}
      {show('lastro') && (
        <td className="text-right py-1.5 px-2" style={{ width: COL.lastro, minWidth: COL.lastro }}>
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 tabular-nums">
            {p.inventario_valorizado > 0 ? fmtR(p.inventario_valorizado) : '—'}
          </span>
        </td>
      )}
      <td className="py-1.5 text-center" style={{ width: COL.acao, minWidth: COL.acao }}>
        <Button
          variant="ghost" size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onEdit(p); }}
        >
          <Edit className="w-3 h-3 text-gray-500" />
        </Button>
      </td>
    </tr>
  );
}

// ── Manete de Potência ─────────────────────────────────────────────────────────
function LevelControl({ level, onChange }) {
  const levels = [1, 2, 3, 4].map(v => ({ v, label: String(v) }));
  levels.push({ v: 99, label: 'all' });
  return (
    <div className="flex items-center gap-1 select-none">
      <span className="text-[10px] text-gray-400 dark:text-gray-500 mr-1">nível</span>
      {levels.map(({ v, label }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`min-w-[24px] h-6 px-1.5 rounded text-[10px] font-semibold transition-colors ${
            level === v
              ? 'bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Componente Principal ───────────────────────────────────────────────────────
const DEFAULT_COLUMNS = ['preco', 'custo', 'margem', 'lastro'];

export default function TreeGrid({
  produtos,
  onEdit,
  visibleColumns = DEFAULT_COLUMNS,
}) {
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const [masterLevel, setMasterLevel]   = useState(1);

  const tree = useTreeGrid(produtos);

  // Nível 1 → raízes colapsadas (expandedKeys vazio)
  // Nível N → expande até N-1 níveis visuais
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

  // Largura mínima da tabela: col-ancora + colunas visíveis
  const anchorMinW = 240;
  const tableMinW  = anchorMinW +
    visibleColumns.filter(c => COL[c]).reduce((s, c) => s + COL[c], 0) + COL.acao;

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between py-2 px-1 mb-1">
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          {produtos.length} SKUs
        </span>
        <LevelControl level={masterLevel} onChange={setMasterLevel} />
      </div>

      {/* Scroll horizontal real */}
      <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table
          style={{
            tableLayout: 'auto',
            borderCollapse: 'collapse',
            width: 'max-content',
            minWidth: tableMinW,
          }}
        >
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              {/* Cabeçalho âncora (sticky) */}
              <th
                className="text-left py-2 sticky left-0 z-30 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"
                style={{ paddingLeft: 8, paddingRight: 8, minWidth: anchorMinW }}
              >
                Produto
              </th>
              {visibleColumns.includes('preco') && (
                <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap" style={{ width: COL.preco }}>
                  Preço Venda
                </th>
              )}
              {visibleColumns.includes('custo') && (
                <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide" style={{ width: COL.custo }}>
                  Custo
                </th>
              )}
              {visibleColumns.includes('margem') && (
                <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide" style={{ width: COL.margem }}>
                  Margem
                </th>
              )}
              {visibleColumns.includes('lastro') && (
                <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap" style={{ width: COL.lastro }}>
                  Inventário R$
                </th>
              )}
              <th style={{ width: COL.acao }} />
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
                  ? <GroupRow
                      key={row.key}
                      row={row}
                      isExpanded={expandedKeys.has(row.key)}
                      onToggle={() => handleToggle(row.key)}
                      visibleColumns={visibleColumns}
                    />
                  : <SkuRow
                      key={row.key}
                      row={row}
                      onEdit={onEdit}
                      visibleColumns={visibleColumns}
                    />
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}