import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronRight, Package, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTreeGrid, flattenTree, buildExpandedForLevel } from './useTreeGrid';

const fmt = (n) =>
  (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Cada nível recebe 14px de padding-left incremental
const INDENT = 14; // px por nível

// ── Linha de Grupo ────────────────────────────────────────────────────────────
function GroupRow({ row, isExpanded, onToggle }) {
  const indent = (row.level - 1) * INDENT;

  return (
    <tr
      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer select-none"
      onClick={onToggle}
    >
      {/* Col 1: Árvore – sticky left */}
      <td className="py-2 px-0 sticky left-0 bg-white dark:bg-gray-900 z-10 min-w-0">
        <div className="flex items-center gap-1" style={{ paddingLeft: 12 + indent }}>
          <ChevronRight
            className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
          />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate uppercase leading-tight">
            {row.label}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 ml-0.5">
            ({row.count})
          </span>
        </div>
      </td>

      {/* Col 2: Foto — vazia em grupos */}
      <td className="py-2 w-9 min-w-[36px]" />

      {/* Col 3: Preço Médio IQR */}
      <td className="py-2 px-3 text-right w-[104px] min-w-[104px]">
        {row.precoMedioIQR > 0
          ? <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">~{fmt(row.precoMedioIQR)}</span>
          : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
      </td>

      {/* Col 4: Custo Médio IQR */}
      <td className="py-2 px-3 text-right w-[104px] min-w-[104px]">
        {row.custoMedioIQR > 0
          ? <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">~{fmt(row.custoMedioIQR)}</span>
          : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
      </td>

      {/* Col 5: Estoque Total */}
      <td className="py-2 px-3 text-right w-[88px] min-w-[88px]">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 tabular-nums">
          {fmt(row.estoqueTotal)}
        </span>
      </td>

      {/* Col 6: Ações — vazia */}
      <td className="py-2 w-8 min-w-[32px]" />
    </tr>
  );
}

// ── Linha de SKU ──────────────────────────────────────────────────────────────
function SkuRow({ row, onEdit }) {
  const p = row.produto;
  const indent = (row.level - 1) * INDENT;
  const estoqueAtual = p.estoque_atual || 0;
  const estoqueMinimo = p.estoque_minimo || 0;

  const statusColor =
    !p.ativo            ? 'bg-gray-400'
    : estoqueAtual <= 0 ? 'bg-red-500 animate-pulse'
    : estoqueAtual <= estoqueMinimo ? 'bg-orange-400'
    : 'bg-green-500';

  return (
    <tr className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/80 dark:hover:bg-gray-800/30 group">
      {/* Col 1: Nome – sticky left */}
      <td className="py-1.5 px-0 sticky left-0 bg-white dark:bg-gray-900 z-10 min-w-0">
        <div className="flex items-center gap-2" style={{ paddingLeft: 12 + indent }}>
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColor}`} />
          <span className="text-xs text-gray-600 dark:text-gray-300 truncate uppercase leading-tight">
            {p.nome}
          </span>
          {p.codigo_interno && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 font-mono">
              {p.codigo_interno}
            </span>
          )}
        </div>
      </td>

      {/* Col 2: Foto */}
      <td className="py-1.5 w-9 min-w-[36px] pr-1">
        <div className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
          {p.imagem_url
            ? <img src={p.imagem_url} alt="" className="w-full h-full object-cover" />
            : <Package className="w-3.5 h-3.5 text-gray-300" />}
        </div>
      </td>

      {/* Col 3: Preço Venda */}
      <td className="py-1.5 px-3 text-right w-[104px] min-w-[104px]">
        <span className="text-xs text-gray-700 dark:text-gray-200 tabular-nums">
          {p.preco_venda_padrao ? `R$ ${fmt(p.preco_venda_padrao)}` : '—'}
        </span>
      </td>

      {/* Col 4: Custo */}
      <td className="py-1.5 px-3 text-right w-[104px] min-w-[104px]">
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {p.preco_custo_calculado ? `R$ ${fmt(p.preco_custo_calculado)}` : '—'}
        </span>
      </td>

      {/* Col 5: Estoque */}
      <td className="py-1.5 px-3 text-right w-[88px] min-w-[88px]">
        <span className="text-xs text-gray-600 dark:text-gray-300 tabular-nums">
          {fmt(p.estoque_atual)}&nbsp;{p.unidade_principal || ''}
        </span>
      </td>

      {/* Col 6: Editar */}
      <td className="py-1.5 w-8 min-w-[32px] pr-1">
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

// ── Manete de Potência (controle de nível global) ─────────────────────────────
function LevelControl({ level, onChange }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-gray-400 dark:text-gray-500 mr-1 select-none">nível</span>
      {[1, 2, 3, 4].map(l => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`w-6 h-6 rounded text-[10px] font-semibold transition-colors ${
            l === level
              ? 'bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {l}
        </button>
      ))}
      {/* Nível "All" — expande tudo (SKUs visíveis) */}
      <button
        onClick={() => onChange(5)}
        className={`px-2 h-6 rounded text-[10px] font-semibold transition-colors ${
          level === 5
            ? 'bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        all
      </button>
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────────────────────
export default function TreeGrid({ produtos, onEdit }) {
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const [masterLevel, setMasterLevel] = useState(1);

  const tree = useTreeGrid(produtos);

  useEffect(() => {
    setExpandedKeys(buildExpandedForLevel(tree, masterLevel));
  }, [masterLevel, tree]);

  const rows = useMemo(
    () => flattenTree(tree, expandedKeys),
    [tree, expandedKeys]
  );

  const handleToggle = useCallback((key) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between py-2 px-1 mb-1">
        <span className="text-[11px] text-gray-400 dark:text-gray-500 select-none">
          {produtos.length} SKUs
        </span>
        <LevelControl level={masterLevel} onChange={setMasterLevel} />
      </div>

      {/* Container com scroll horizontal e primeira coluna sticky */}
      <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table
          className="border-collapse"
          style={{ tableLayout: 'fixed', minWidth: 600, width: '100%' }}
        >
          <colgroup>
            {/* Col 1 sticky — ocupa o espaço restante */}
            <col style={{ minWidth: 220, width: '100%' }} />
            {/* Col 2 Foto */}
            <col style={{ width: 36, minWidth: 36 }} />
            {/* Col 3 Preço */}
            <col style={{ width: 104, minWidth: 104 }} />
            {/* Col 4 Custo */}
            <col style={{ width: 104, minWidth: 104 }} />
            {/* Col 5 Estoque */}
            <col style={{ width: 88, minWidth: 88 }} />
            {/* Col 6 Ações */}
            <col style={{ width: 32, minWidth: 32 }} />
          </colgroup>

          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 sticky left-0 bg-white dark:bg-gray-900 z-20 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                  style={{ paddingLeft: 12 }}>
                Produto
              </th>
              <th className="py-2 w-9" />
              <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">
                Preço Venda
              </th>
              <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Custo
              </th>
              <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Estoque
              </th>
              <th className="py-2 w-8" />
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
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