import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronRight, Package, Trash2 } from 'lucide-react';
import { useTreeGrid, flattenTree, buildExpandedForLevel } from './treegrid/useTreeGrid';

const fmtR = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

// ── Card de SKU ────────────────────────────────────────────────────────────────
function SkuCard({ row, onEdit, onDelete }) {
  const p      = row.produto;
  const markup = row.markup;
  const e = p.estoque_atual  || 0;
  const m = p.estoque_minimo || 0;
  const dotCls = !p.ativo    ? 'bg-gray-400'
    : e <= 0                 ? 'bg-red-500 animate-pulse'
    : e <= m                 ? 'bg-orange-400'
    : 'bg-green-500';

  return (
    <div
      className="flex items-start gap-3 px-3 py-2.5 bg-white dark:bg-gray-900 active:bg-gray-50 dark:active:bg-gray-800/60 cursor-pointer w-full"
      style={{ boxSizing: 'border-box' }}
      onClick={() => onEdit(p)}
    >
      {/* Thumbnail fixo */}
      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5">
        {p.imagem_url
          ? <img src={p.imagem_url} alt="" className="w-full h-full object-cover" />
          : <Package className="w-4 h-4 text-gray-300 dark:text-gray-600" />}
      </div>

      {/* Nome + info — ocupa o espaço restante, quebra normalmente */}
      <div className="flex-1 min-w-0 overflow-hidden" onClick={() => onEdit(p)}>
        <p className="text-[12px] font-normal text-gray-700 dark:text-gray-200 leading-snug uppercase break-words">
          {p.nome}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotCls}`} />
            <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
              {fmtN(e)} {p.unidade_principal || 'UN'}
            </span>
          </div>
          {p.codigo_interno && (
            <span className="text-[10px] text-gray-400 dark:text-gray-600 font-mono whitespace-nowrap">
              #{p.codigo_interno}
            </span>
          )}
          {p.preco_venda_padrao > 0 && (
            <span className="text-[12px] font-semibold text-gray-800 dark:text-gray-100 tabular-nums whitespace-nowrap">
              R$ {fmtR(p.preco_venda_padrao)}
            </span>
          )}
          {markup > 0 && (() => {
            const custo = row.produto.preco_custo_calculado || 0;
            const pv = row.produto.preco_venda_padrao || 0;
            const label = (custo > 0 && pv > 0)
              ? `Custo R$${fmtR(custo)} → Venda R$${fmtR(pv)} = ${markup.toFixed(1)}% mk`
              : `${markup.toFixed(1)}% markup`;
            return (
              <span
                title={label}
                className={`text-[11px] font-medium tabular-nums whitespace-nowrap ${
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
}

// ── Cabeçalho de grupo ─────────────────────────────────────────────────────────
function GroupHeader({ row, isExpanded, onToggle }) {
  const isRoot = row.level === 1;

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2 py-2.5 text-left transition-colors active:bg-gray-100 dark:active:bg-gray-700/40 ${
        isRoot
          ? 'px-4 bg-white dark:bg-gray-900'
          : 'pl-8 pr-4 bg-gray-50/70 dark:bg-gray-800/40'
      }`}
      style={{ boxSizing: 'border-box' }}
    >
      <ChevronRight
        className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
      />
      <span className={`flex-1 min-w-0 truncate ${
        isRoot
          ? 'text-[12px] font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide'
          : 'text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase'
      }`}>
        {row.label}
      </span>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {row.criticalCount > 0 && (
          <span className="text-[10px] text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full">
            {row.criticalCount}⚠
          </span>
        )}
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
          isRoot
            ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        }`}>
          {row.count}
        </span>
      </div>
    </button>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function MobileHierarquica({ produtos, onEdit }) {
  const [expandedKeys, setExpandedKeys] = useState(new Set());

  const tree = useTreeGrid(produtos);

  useEffect(() => {
    setExpandedKeys(buildExpandedForLevel(tree, 1));
  }, [tree]);

  const rows = useMemo(() => {
    const all = flattenTree(tree, expandedKeys);
    // Filtra grupos fantasmas (count = 0) que aparecem quando busca filtra todos os SKUs do grupo
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
    <div className="w-full" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {rows.map(row =>
          row.type === 'group' ? (
            <GroupHeader
              key={row.key}
              row={row}
              isExpanded={expandedKeys.has(row.key)}
              onToggle={() => handleToggle(row.key)}
            />
          ) : (
            <SkuCard
              key={row.key}
              row={row}
              onEdit={onEdit}
            />
          )
        )}
      </div>
    </div>
  );
}