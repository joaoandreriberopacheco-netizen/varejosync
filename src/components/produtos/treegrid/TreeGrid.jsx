import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronRight, Package, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTreeGrid, flattenTree, buildExpandedForLevel } from './useTreeGrid';

const fmt = (n) =>
  (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const INDENT = 16; // px por nível de indentação

// ── Linha de Grupo ────────────────────────────────────────────────────────────
function GroupRow({ row, isExpanded, onToggle }) {
  const indent = (row.level - 1) * INDENT;

  return (
    <tr
      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer select-none"
      onClick={onToggle}
    >
      {/* Coluna Produto (com indentação) */}
      <td className="py-2 px-3 w-[48%]">
        <div className="flex items-center gap-1.5" style={{ paddingLeft: indent }}>
          <ChevronRight
            className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
          />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate uppercase">
            {row.label}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1 flex-shrink-0">
            ({row.count})
          </span>
        </div>
      </td>

      {/* Foto: vazia no grupo */}
      <td className="py-2 px-2 w-[40px]" />

      {/* Preço médio IQR */}
      <td className="py-2 px-3 text-right w-[100px]">
        {row.precoMedioIQR > 0 ? (
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            ~{fmt(row.precoMedioIQR)}
          </span>
        ) : <span className="text-xs text-gray-300">—</span>}
      </td>

      {/* Custo médio IQR */}
      <td className="py-2 px-3 text-right w-[100px]">
        {row.custoMedioIQR > 0 ? (
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
            ~{fmt(row.custoMedioIQR)}
          </span>
        ) : <span className="text-xs text-gray-300">—</span>}
      </td>

      {/* Estoque total */}
      <td className="py-2 px-3 text-right w-[80px]">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 tabular-nums">
          {fmt(row.estoqueTotal)}
        </span>
      </td>

      {/* Ações: vazio */}
      <td className="py-2 px-2 w-[40px]" />
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
    !p.ativo ? 'bg-gray-400'
    : estoqueAtual <= 0 ? 'bg-red-500 animate-pulse'
    : estoqueAtual <= estoqueMinimo ? 'bg-orange-400'
    : 'bg-green-500';

  return (
    <tr className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50/70 dark:hover:bg-gray-800/30 group">
      {/* Produto */}
      <td className="py-1.5 px-3 w-[48%]">
        <div className="flex items-center gap-2" style={{ paddingLeft: indent }}>
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColor}`} />
          <span className="text-xs font-normal text-gray-600 dark:text-gray-300 truncate uppercase">
            {p.nome}
          </span>
          {p.codigo_interno && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 font-mono">
              {p.codigo_interno}
            </span>
          )}
        </div>
      </td>

      {/* Foto */}
      <td className="py-1.5 px-2 w-[40px]">
        <div className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
          {p.imagem_url
            ? <img src={p.imagem_url} alt="" className="w-full h-full object-cover" />
            : <Package className="w-3.5 h-3.5 text-gray-300" />}
        </div>
      </td>

      {/* Preço venda */}
      <td className="py-1.5 px-3 text-right w-[100px]">
        <span className="text-xs text-gray-700 dark:text-gray-200 tabular-nums">
          {p.preco_venda_padrao ? `R$ ${fmt(p.preco_venda_padrao)}` : '—'}
        </span>
      </td>

      {/* Custo */}
      <td className="py-1.5 px-3 text-right w-[100px]">
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {p.preco_custo_calculado ? `R$ ${fmt(p.preco_custo_calculado)}` : '—'}
        </span>
      </td>

      {/* Estoque */}
      <td className="py-1.5 px-3 text-right w-[80px]">
        <span className="text-xs text-gray-600 dark:text-gray-300 tabular-nums">
          {fmt(p.estoque_atual)} {p.unidade_principal || ''}
        </span>
      </td>

      {/* Ação editar */}
      <td className="py-1.5 px-2 w-[40px]">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onEdit(p)}
        >
          <Edit className="w-3 h-3 text-gray-500" />
        </Button>
      </td>
    </tr>
  );
}

// ── Controle de Nível (Manete de Potência) ────────────────────────────────────
function LevelControl({ level, onChange }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-gray-400 dark:text-gray-500 mr-1">nível</span>
      {[1, 2, 3, 4, 5].map(l => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`w-6 h-6 rounded text-[10px] font-semibold transition-colors ${
            l === level
              ? 'bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {l}
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

  // Ao mudar o nível mestre, recalcular expandidos
  useEffect(() => {
    const keys = buildExpandedForLevel(tree, masterLevel);
    setExpandedKeys(keys);
  }, [masterLevel, tree]);

  const rows = useMemo(
    () => flattenTree(tree, expandedKeys),
    [tree, expandedKeys]
  );

  const handleToggle = useCallback((key) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleLevelChange = useCallback((l) => {
    setMasterLevel(l);
  }, []);

  return (
    <div className="w-full">
      {/* Toolbar do Tree Grid */}
      <div className="flex items-center justify-between py-2 px-1 mb-1">
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          {produtos.length} SKUs
        </span>
        <LevelControl level={masterLevel} onChange={handleLevelChange} />
      </div>

      {/* Tabela com colunas fixas */}
      <div className="overflow-x-auto w-full">
        <table className="w-full table-fixed border-collapse min-w-[600px]">
          <colgroup>
            <col style={{ width: '48%' }} />
            <col style={{ width: '40px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '40px' }} />
          </colgroup>
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Produto
              </th>
              <th className="py-2 px-2" />
              <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Preço Venda
              </th>
              <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Custo
              </th>
              <th className="text-right py-2 px-3 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Estoque
              </th>
              <th className="py-2 px-2" />
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