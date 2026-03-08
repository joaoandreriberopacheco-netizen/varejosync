import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronRight, Package, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTreeGrid, flattenTree, buildExpandedForLevel } from './useTreeGrid';

// ── Formatação ────────────────────────────────────────────────────────────────
const fmtR = (n) =>
  (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n) => `${(n ?? 0).toFixed(1)}%`;

// Larguras fixas das colunas de dados (px) — nunca variam com indentação
const W = { foto: 36, preco: 108, custo: 96, margem: 80, lastro: 108, acao: 36 };
const INDENT = 14; // px por nível visual

// ── Linha de Grupo ─────────────────────────────────────────────────────────────
function GroupRow({ row, isExpanded, onToggle }) {
  const indent = (row.level - 1) * INDENT;

  return (
    <tr
      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer select-none"
      onClick={onToggle}
    >
      {/* Col 1 — Nome (sticky) */}
      <td
        className="py-2 sticky left-0 bg-white dark:bg-gray-900 z-10 border-r border-gray-100 dark:border-gray-800"
        style={{ paddingLeft: 8 + indent, paddingRight: 8, minWidth: 200 }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Espaço reservado para foto — alinha com SKUs */}
          <div style={{ width: W.foto, flexShrink: 0 }} />
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

      {/* Col 3 — Preço médio IQR */}
      <td className="text-right py-2 px-2" style={{ width: W.preco, minWidth: W.preco }}>
        {row.precoMedio > 0
          ? <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">~{fmtR(row.precoMedio)}</span>
          : <span className="text-xs text-gray-300 dark:text-gray-700">—</span>}
      </td>

      {/* Col 4 — Custo médio IQR */}
      <td className="text-right py-2 px-2" style={{ width: W.custo, minWidth: W.custo }}>
        {row.custoMedio > 0
          ? <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">~{fmtR(row.custoMedio)}</span>
          : <span className="text-xs text-gray-300 dark:text-gray-700">—</span>}
      </td>

      {/* Col 5 — Margem média IQR */}
      <td className="text-right py-2 px-2" style={{ width: W.margem, minWidth: W.margem }}>
        {row.margemMedia > 0
          ? <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">~{fmtPct(row.margemMedia)}</span>
          : <span className="text-xs text-gray-300 dark:text-gray-700">—</span>}
      </td>

      {/* Col 6 — Lastro (inventário valorizado total) */}
      <td className="text-right py-2 px-2" style={{ width: W.lastro, minWidth: W.lastro }}>
        {row.lastroTotal > 0
          ? <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 tabular-nums">{fmtR(row.lastroTotal)}</span>
          : <span className="text-xs text-gray-300 dark:text-gray-700">—</span>}
      </td>

      {/* Col 7 — Ação */}
      <td style={{ width: W.acao, minWidth: W.acao }} />
    </tr>
  );
}

// ── Linha de SKU ───────────────────────────────────────────────────────────────
function SkuRow({ row, onEdit }) {
  const p = row.produto;
  const indent = (row.level - 1) * INDENT;

  const estoqueAtual  = p.estoque_atual  || 0;
  const estoqueMinimo = p.estoque_minimo || 0;
  const dotColor =
    !p.ativo              ? 'bg-gray-400'
    : estoqueAtual <= 0   ? 'bg-red-500 animate-pulse'
    : estoqueAtual <= estoqueMinimo ? 'bg-orange-400'
    : 'bg-green-500';

  return (
    <tr className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/70 dark:hover:bg-gray-800/25 group">
      {/* Col 1 — Imagem + Nome (sticky) — imagem é a âncora visual (Marco 0) */}
      <td
        className="py-1.5 sticky left-0 bg-white dark:bg-gray-900 z-10 border-r border-gray-100 dark:border-gray-800"
        style={{ paddingLeft: 8 + indent, paddingRight: 8, minWidth: 200 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Foto — Marco 0: ponto de ancoragem visual */}
          <div
            className="flex-shrink-0 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center"
            style={{ width: W.foto, height: W.foto }}
          >
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
            <span className="text-[10px] text-gray-400 dark:text-gray-600 flex-shrink-0 font-mono">
              {p.codigo_interno}
            </span>
          )}
        </div>
      </td>

      {/* Col 3 — Preço Venda */}
      <td className="text-right py-1.5 px-2" style={{ width: W.preco, minWidth: W.preco }}>
        <span className="text-xs text-gray-700 dark:text-gray-200 tabular-nums">
          {p.preco_venda_padrao ? `R$ ${fmtR(p.preco_venda_padrao)}` : '—'}
        </span>
      </td>

      {/* Col 4 — Custo */}
      <td className="text-right py-1.5 px-2" style={{ width: W.custo, minWidth: W.custo }}>
        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
          {p.preco_custo_calculado ? `R$ ${fmtR(p.preco_custo_calculado)}` : '—'}
        </span>
      </td>

      {/* Col 5 — Margem */}
      <td className="text-right py-1.5 px-2" style={{ width: W.margem, minWidth: W.margem }}>
        <span className={`text-xs tabular-nums ${row.margem >= 30 ? 'text-green-600 dark:text-green-400' : row.margem > 0 ? 'text-gray-500 dark:text-gray-400' : 'text-red-500'}`}>
          {row.margem > 0 ? fmtPct(row.margem) : '—'}
        </span>
      </td>

      {/* Col 6 — Lastro (inventário valorizado) */}
      <td className="text-right py-1.5 px-2" style={{ width: W.lastro, minWidth: W.lastro }}>
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {row.lastro > 0 ? fmtR(row.lastro) : '—'}
        </span>
      </td>

      {/* Col 7 — Editar */}
      <td className="py-1.5 text-center" style={{ width: W.acao, minWidth: W.acao }}>
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

// ── Manete de Potência (controle de nível) ────────────────────────────────────
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
export default function TreeGrid({ produtos, onEdit }) {
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const [masterLevel, setMasterLevel]   = useState(1);

  const tree = useTreeGrid(produtos);

  // Nível 1 → apenas raízes colapsadas (expandedKeys vazio)
  // Nível 2+ → expande até o nível visual escolhido
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

  const tableMinWidth =
    200 + W.foto + W.preco + W.custo + W.margem + W.lastro + W.acao;

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between py-2 px-1 mb-1">
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          {produtos.length} SKUs
        </span>
        <LevelControl level={masterLevel} onChange={setMasterLevel} />
      </div>

      {/* Scroll container */}
      <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table
          style={{
            tableLayout: 'auto',
            borderCollapse: 'collapse',
            minWidth: tableMinWidth,
            width: '100%',
          }}
        >
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              <th
                className="text-left py-2 sticky left-0 bg-white dark:bg-gray-900 z-20 border-r border-gray-100 dark:border-gray-800 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                style={{ paddingLeft: 8, paddingRight: 8, minWidth: 200 }}
              >
                Produto
              </th>
              <th
                className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"
                style={{ width: W.preco, minWidth: W.preco }}
              >
                Preço Venda
              </th>
              <th
                className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                style={{ width: W.custo, minWidth: W.custo }}
              >
                Custo
              </th>
              <th
                className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                style={{ width: W.margem, minWidth: W.margem }}
              >
                Margem
              </th>
              <th
                className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"
                style={{ width: W.lastro, minWidth: W.lastro }}
              >
                Inventário R$
              </th>
              <th style={{ width: W.acao, minWidth: W.acao }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
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
                    />
                  : <SkuRow
                      key={row.key}
                      row={row}
                      onEdit={onEdit}
                    />
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}