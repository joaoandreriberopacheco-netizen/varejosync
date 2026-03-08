import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronRight, Package, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTreeGrid, flattenTree, buildExpandedForLevel } from './useTreeGrid';

const fmt = (n) =>
  (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Indentação por nível visual (14px cada)
const INDENT = 14;

// Larguras fixas das colunas de dados (px) — nunca mudam com indentação
const COL_FOTO    = 40;
const COL_PRECO   = 108;
const COL_CUSTO   = 108;
const COL_ESTOQUE = 96;
const COL_ACAO    = 36;
// Coluna nome: flex/auto no layout sticky

// ── Linha de Grupo ────────────────────────────────────────────────────────────
function GroupRow({ row, isExpanded, onToggle }) {
  // Nós fundidos usam o nível mais alto (menor indentação)
  const indent = (row.level - 1) * INDENT;

  return (
    <tr
      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 cursor-pointer select-none"
      onClick={onToggle}
    >
      {/* Col 1 — Nome / árvore (sticky) */}
      <td
        className="py-2 sticky left-0 bg-white dark:bg-gray-900 z-10 border-r border-gray-100 dark:border-gray-800"
        style={{ paddingLeft: 8 + indent, paddingRight: 8 }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <ChevronRight
            className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
          />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-100 truncate uppercase tracking-wide">
            {row.label}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
            ({row.count})
          </span>
        </div>
      </td>

      {/* Col 2 — Foto (vazia em grupos) */}
      <td style={{ width: COL_FOTO, minWidth: COL_FOTO }} />

      {/* Col 3 — Preço médio IQR */}
      <td
        className="text-right py-2 px-2"
        style={{ width: COL_PRECO, minWidth: COL_PRECO }}
      >
        {row.precoMedioIQR > 0
          ? <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">~{fmt(row.precoMedioIQR)}</span>
          : <span className="text-xs text-gray-300 dark:text-gray-700">—</span>}
      </td>

      {/* Col 4 — Custo médio IQR */}
      <td
        className="text-right py-2 px-2"
        style={{ width: COL_CUSTO, minWidth: COL_CUSTO }}
      >
        {row.custoMedioIQR > 0
          ? <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">~{fmt(row.custoMedioIQR)}</span>
          : <span className="text-xs text-gray-300 dark:text-gray-700">—</span>}
      </td>

      {/* Col 5 — Estoque total */}
      <td
        className="text-right py-2 px-2"
        style={{ width: COL_ESTOQUE, minWidth: COL_ESTOQUE }}
      >
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 tabular-nums">
          {fmt(row.estoqueTotal)}
        </span>
      </td>

      {/* Col 6 — Ação (vazia) */}
      <td style={{ width: COL_ACAO, minWidth: COL_ACAO }} />
    </tr>
  );
}

// ── Linha de SKU ──────────────────────────────────────────────────────────────
function SkuRow({ row, onEdit }) {
  const p = row.produto;
  const indent = (row.level - 1) * INDENT;
  const estoqueAtual = p.estoque_atual || 0;
  const estoqueMinimo = p.estoque_minimo || 0;

  const dotColor =
    !p.ativo            ? 'bg-gray-400'
    : estoqueAtual <= 0 ? 'bg-red-500 animate-pulse'
    : estoqueAtual <= estoqueMinimo ? 'bg-orange-400'
    : 'bg-green-500';

  return (
    <tr className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/70 dark:hover:bg-gray-800/25 group">
      {/* Col 1 — Nome (sticky) */}
      <td
        className="py-1.5 sticky left-0 bg-white dark:bg-gray-900 z-10 border-r border-gray-100 dark:border-gray-800"
        style={{ paddingLeft: 8 + indent, paddingRight: 8 }}
      >
        <div className="flex items-center gap-2 min-w-0">
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

      {/* Col 2 — Foto */}
      <td
        className="py-1.5"
        style={{ width: COL_FOTO, minWidth: COL_FOTO }}
      >
        <div className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden mx-auto">
          {p.imagem_url
            ? <img src={p.imagem_url} alt="" className="w-full h-full object-cover" />
            : <Package className="w-3.5 h-3.5 text-gray-300" />}
        </div>
      </td>

      {/* Col 3 — Preço Venda */}
      <td
        className="text-right py-1.5 px-2"
        style={{ width: COL_PRECO, minWidth: COL_PRECO }}
      >
        <span className="text-xs text-gray-700 dark:text-gray-200 tabular-nums">
          {p.preco_venda_padrao ? `R$ ${fmt(p.preco_venda_padrao)}` : '—'}
        </span>
      </td>

      {/* Col 4 — Custo */}
      <td
        className="text-right py-1.5 px-2"
        style={{ width: COL_CUSTO, minWidth: COL_CUSTO }}
      >
        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
          {p.preco_custo_calculado ? `R$ ${fmt(p.preco_custo_calculado)}` : '—'}
        </span>
      </td>

      {/* Col 5 — Estoque */}
      <td
        className="text-right py-1.5 px-2"
        style={{ width: COL_ESTOQUE, minWidth: COL_ESTOQUE }}
      >
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {fmt(p.estoque_atual)}&nbsp;{p.unidade_principal || ''}
        </span>
      </td>

      {/* Col 6 — Editar */}
      <td
        className="py-1.5 text-center"
        style={{ width: COL_ACAO, minWidth: COL_ACAO }}
      >
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

// ── Manete de Potência ────────────────────────────────────────────────────────
function LevelControl({ level, onChange }) {
  const levels = [
    { v: 1, label: '1' },
    { v: 2, label: '2' },
    { v: 3, label: '3' },
    { v: 4, label: '4' },
    { v: 99, label: 'all' },
  ];
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

// ── Componente Principal ──────────────────────────────────────────────────────
export default function TreeGrid({ produtos, onEdit }) {
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const [masterLevel, setMasterLevel] = useState(1);

  const tree = useTreeGrid(produtos);

  useEffect(() => {
    setExpandedKeys(buildExpandedForLevel(tree, masterLevel));
  }, [masterLevel, tree]);

  const rows = useMemo(() => flattenTree(tree, expandedKeys), [tree, expandedKeys]);

  const handleToggle = useCallback((key) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  // Largura mínima total da tabela
  const tableMinWidth = 220 + COL_FOTO + COL_PRECO + COL_CUSTO + COL_ESTOQUE + COL_ACAO;

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between py-2 px-1 mb-1">
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          {produtos.length} SKUs
        </span>
        <LevelControl level={masterLevel} onChange={setMasterLevel} />
      </div>

      {/* Scroll container — overflow-x liberto */}
      <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table
          style={{
            tableLayout: 'auto',      // auto: colunas crescem pelo conteúdo
            borderCollapse: 'collapse',
            minWidth: tableMinWidth,
            width: '100%',
          }}
        >
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              {/* Cabeçalho nome — sticky */}
              <th
                className="text-left py-2 sticky left-0 bg-white dark:bg-gray-900 z-20 border-r border-gray-100 dark:border-gray-800 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                style={{ paddingLeft: 8, paddingRight: 8, minWidth: 220 }}
              >
                Produto
              </th>
              <th style={{ width: COL_FOTO, minWidth: COL_FOTO }} />
              <th
                className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"
                style={{ width: COL_PRECO, minWidth: COL_PRECO }}
              >
                Preço Venda
              </th>
              <th
                className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                style={{ width: COL_CUSTO, minWidth: COL_CUSTO }}
              >
                Custo
              </th>
              <th
                className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                style={{ width: COL_ESTOQUE, minWidth: COL_ESTOQUE }}
              >
                Estoque
              </th>
              <th style={{ width: COL_ACAO, minWidth: COL_ACAO }} />
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