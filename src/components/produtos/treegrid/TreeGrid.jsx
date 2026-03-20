import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronRight, Package, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTreeGrid, flattenTree, buildExpandedForLevel } from './useTreeGrid';

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
  { id: 'preco_venda',          label: 'Preço Venda',    w: 108 },
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
  { id: 'unidade',              label: 'Unid.',          w: 64  },
  { id: 'unidades_pacote',      label: 'Un/Pct',         w: 72  },
];

export const ALL_COLS     = COL_DEFS;
export const DEFAULT_COLS = ['preco_venda', 'preco_custo', 'markup', 'inventario_valorizado'];

const INDENT_GROUP = 14;
const INDENT_SKU   = 8;  // indentação fixa de todos os SKUs — alinhamento uniforme
const W_EDIT = 32;       // coluna de edição sticky à esquerda

// ── Dot de status ─────────────────────────────────────────────────────────────
function StatusDot({ produto }) {
  const e = produto.estoque_atual  || 0;
  const m = produto.estoque_minimo || 0;
  const cls = !produto.ativo           ? 'bg-gray-400'
    : e <= 0                           ? 'bg-red-500 animate-pulse'
    : e <= m                           ? 'bg-orange-400'
    : 'bg-green-500';
  const label = !produto.ativo ? 'Inativo' : e <= 0 ? 'Crítico' : e <= m ? 'Baixo' : 'OK';
  return (
    <div className="flex items-center gap-1">
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cls}`} />
      <span className="text-[10px] text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  );
}

// ── Valor de célula SKU ───────────────────────────────────────────────────────
function skuCellValue(colId, produto, margem, lastro, markup) {
  switch (colId) {
    case 'status':               return <StatusDot produto={produto} />;
    case 'codigo_interno':       return <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{produto.codigo_interno || '—'}</span>;
    case 'codigo_barras':        return <span className="text-[10px] font-mono text-gray-400">{produto.codigo_barras || '—'}</span>;
    case 'categoria':            return <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">{produto.categoria_nome || '—'}</span>;
    case 'tags':                 return (
      <div className="flex flex-wrap gap-0.5 max-w-[100px]">
        {(produto.tags || []).slice(0, 2).map(t => (
          <span key={t} className="text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1 rounded">#{t}</span>
        ))}
      </div>
    );
    case 'fornecedor':           return <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px] block">{produto.fornecedor_padrao_codigo || '—'}</span>;
    case 'preco_venda':          return <span className="text-xs text-gray-700 dark:text-gray-200 tabular-nums">{produto.preco_venda_padrao ? `R$ ${fmtR(produto.preco_venda_padrao)}` : '—'}</span>;
    case 'margem':               return <span className={`text-xs tabular-nums ${margem >= 30 ? 'text-green-600 dark:text-green-400' : margem > 0 ? 'text-gray-500 dark:text-gray-400' : 'text-red-400'}`}>{margem > 0 ? fmtPct(margem) : '—'}</span>;
    case 'preco_custo':          return <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{produto.preco_custo_calculado ? `R$ ${fmtR(produto.preco_custo_calculado)}` : '—'}</span>;
    case 'valor_compra':         return <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{produto.valor_compra ? `R$ ${fmtR(produto.valor_compra)}` : '—'}</span>;
    case 'markup':               return <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{lastro >= 0 && markup > 0 ? `${fmtN(markup)}%` : '—'}</span>;
    case 'inventario_valorizado':return <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{lastro > 0 ? fmtR(lastro) : '—'}</span>;
    case 'estoque_atual':        return <span className="text-xs text-gray-600 dark:text-gray-300 tabular-nums">{fmtN(produto.estoque_atual)} {produto.unidade_principal || ''}</span>;
    case 'estoque_minimo':       return <span className="text-xs text-gray-400 tabular-nums">{fmtN(produto.estoque_minimo)}</span>;
    case 'estoque_ideal':        return <span className="text-xs text-gray-400 tabular-nums">{fmtN(produto.estoque_ideal)}</span>;
    case 'estoque_maximo':       return <span className="text-xs text-gray-400 tabular-nums">{fmtN(produto.estoque_maximo)}</span>;
    case 'tempo_reposicao':      return <span className="text-xs text-gray-400 tabular-nums">{produto.tempo_reposicao_dias || 0}d</span>;
    case 'peso':                 return <span className="text-xs text-gray-400 tabular-nums">{fmtN(produto.peso_kg)}kg</span>;
    case 'dimensoes':            return <span className="text-xs text-gray-400">{produto.dimensoes_cm || '—'}</span>;
    case 'tipo':                 return <span className="text-xs text-gray-400">{produto.tipo || '—'}</span>;
    case 'unidade':              return <span className="text-xs text-gray-400">{produto.unidade_principal || '—'}</span>;
    case 'unidades_pacote':      return <span className="text-xs text-gray-400">{produto.unidades_por_pacote || 1}</span>;
    default:                     return <span className="text-xs text-gray-400">—</span>;
  }
}

// ── Valor agregado para grupos ────────────────────────────────────────────────
function groupCellValue(colId, agg) {
  const tilde  = v => v > 0 ? <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">~{fmtR(v)}</span> : dash();
  const tildeP = v => v > 0 ? <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">~{fmtPct(v)}</span> : dash();
  const dash   = () => <span className="text-xs text-gray-300 dark:text-gray-700">—</span>;
  switch (colId) {
    case 'preco_venda':           return tilde(agg.precoMedio);
    case 'preco_custo':           return tilde(agg.custoMedio);
    case 'valor_compra':          return tilde(agg.valorCompraMedio);
    case 'markup':                return tildeP(agg.markupMedio);
    case 'margem':                return tildeP(agg.margemMedia);
    case 'inventario_valorizado': return agg.lastroTotal > 0
      ? <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 tabular-nums">{fmtR(agg.lastroTotal)}</span>
      : dash();
    case 'estoque_atual':         return <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 tabular-nums">{fmtN(agg.estoqueTotal)}</span>;
    case 'estoque_minimo':        return <span className="text-xs text-gray-400 tabular-nums">{fmtN(agg.estoqueMinTotal)}</span>;
    case 'estoque_ideal':         return <span className="text-xs text-gray-400 tabular-nums">{fmtN(agg.estoqueIdealTotal)}</span>;
    case 'estoque_maximo':        return <span className="text-xs text-gray-400 tabular-nums">{fmtN(agg.estoqueMaxTotal)}</span>;
    case 'peso':                  return <span className="text-xs text-gray-400 tabular-nums">{fmtN(agg.pesoTotal)}kg</span>;
    case 'status':                return agg.criticalCount > 0
      ? <span className="text-[10px] text-red-500">{agg.criticalCount} crítico{agg.criticalCount > 1 ? 's' : ''}</span>
      : <span className="text-[10px] text-green-600">OK</span>;
    default:                      return dash();
  }
}

// ── Linha de Grupo ─────────────────────────────────────────────────────────────
function GroupRow({ row, isExpanded, onToggle, activeCols }) {
  const indent = (row.level - 1) * INDENT_GROUP;
  const isLeaf = row.isLeafGroup;

  return (
    <tr
      className={`border-b border-gray-100 dark:border-gray-800 ${isLeaf ? '' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40'} select-none`}
      onClick={isLeaf ? undefined : onToggle}
    >
      {/* Célula de edit vazia para grupos */}
      <td className="sticky left-0 bg-white dark:bg-gray-900 z-20"
        style={{ width: W_EDIT, minWidth: W_EDIT }} />
      {/* Célula de nome do grupo */}
      <td
        className="py-2 sticky bg-white dark:bg-gray-900 z-20 border-r border-gray-100 dark:border-gray-800"
        style={{ left: W_EDIT, paddingLeft: 4 + indent, paddingRight: 8, minWidth: 220 }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {!isLeaf && (
            <ChevronRight
              className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
            />
          )}
          {isLeaf && <div className="w-3.5 flex-shrink-0" />}
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-100 truncate uppercase tracking-wide">
            {row.label}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 ml-0.5">({row.count})</span>
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
}

// ── Linha de SKU ───────────────────────────────────────────────────────────────
function SkuRow({ row, onEdit, onDelete, activeCols }) {
  const p = row.produto;

  return (
    <tr className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/70 dark:hover:bg-gray-800/25 group">
      {/* Botão editar + excluir — sticky, congelado à esquerda */}
      <td className="py-1.5 sticky left-0 bg-white dark:bg-gray-900 z-20 text-center"
        style={{ width: W_EDIT, minWidth: W_EDIT }}>
        <div className="flex items-center gap-0.5 justify-center">
          <Button variant="ghost" size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); onEdit(p); }}>
            <Edit className="w-3 h-3 text-gray-500" />
          </Button>
          <Button variant="ghost" size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); onDelete(p); }}>
            <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
          </Button>
        </div>
      </td>
      {/* Coluna Produto — sticky logo após o botão de editar */}
      <td
        className="py-1.5 sticky bg-white dark:bg-gray-900 z-20 border-r border-gray-100 dark:border-gray-800"
        style={{ left: W_EDIT, paddingLeft: INDENT_SKU, paddingRight: 8, minWidth: 220 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center"
            style={{ width: 32, height: 32 }}>
            {p.imagem_url
              ? <img src={p.imagem_url} alt="" className="w-full h-full object-cover" />
              : <Package className="w-3.5 h-3.5 text-gray-300" />}
          </div>
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 truncate uppercase">{p.nome}</span>
          {p.codigo_interno && (
            <span className="text-[10px] text-gray-400 dark:text-gray-600 flex-shrink-0 font-mono">{p.codigo_interno}</span>
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
}

// ── Controle de Nível (exportado para uso externo no painel fixo) ─────────────
export function LevelControl({ level, onChange }) {
  return (
    <div className="flex items-center gap-1 select-none">
      <span className="text-[10px] text-gray-400 dark:text-gray-500 mr-1">nível</span>
      {[1, 2, 3, 4, 99].map(v => (
        <button key={v} onClick={() => onChange(v)}
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
// masterLevel é controlado pelo pai (painel fixo da página Produtos).
// expandedKeys é gerenciado internamente — toggle manual do usuário funciona
// independente do nível selecionado.
export default function TreeGrid({ produtos, onEdit, visibleColumns = DEFAULT_COLS, masterLevel = 1 }) {
  const [expandedKeys, setExpandedKeys] = useState(new Set());

  const tree = useTreeGrid(produtos);

  // Quando o nível muda, recalcula quais grupos ficam expandidos
  useEffect(() => {
    setExpandedKeys(
      masterLevel === 1 ? new Set() : buildExpandedForLevel(tree, masterLevel - 1)
    );
  }, [masterLevel, tree]);

  const rows = useMemo(() => flattenTree(tree, expandedKeys), [tree, expandedKeys]);

  const handleToggle = useCallback((key) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const activeCols = useMemo(
    () => COL_DEFS.filter(c => visibleColumns.includes(c.id)),
    [visibleColumns]
  );

  return (
    <div className="flex flex-col h-full w-full">
      {/* Scroll container — tabela rola livremente; coluna Produto é sticky */}
      <div className="flex-1 overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table style={{ tableLayout: 'auto', borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' }}>
          {/* thead sticky no topo durante scroll vertical */}
          <thead className="sticky top-0 z-30 bg-white dark:bg-gray-900">
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              {/* Cabeçalho coluna edit */}
              <th className="sticky left-0 bg-white dark:bg-gray-900 z-40"
                style={{ width: W_EDIT, minWidth: W_EDIT }} />
              {/* Cabeçalho coluna Produto — sticky após o edit */}
              <th
                className="text-left py-2 sticky bg-white dark:bg-gray-900 z-40 border-r border-gray-100 dark:border-gray-800 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                style={{ left: W_EDIT, paddingLeft: 8, paddingRight: 8, minWidth: 220 }}
              >
                Produto
              </th>
              {activeCols.map(col => (
                <th key={col.id}
                  className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"
                  style={{ width: col.w, minWidth: col.w }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={activeCols.length + 2} className="py-12 text-center text-sm text-gray-400">
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : (
              rows.map(row =>
                row.type === 'group'
                  ? <GroupRow key={row.key} row={row}
                      isExpanded={expandedKeys.has(row.key)}
                      onToggle={() => handleToggle(row.key)}
                      activeCols={activeCols} />
                  : <SkuRow key={row.key} row={row}
                      onEdit={onEdit}
                      activeCols={activeCols} />
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}