import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Package, Edit2, AlertTriangle } from 'lucide-react';
import { buildTree, collectSkus, deepCollapse } from './treegrid/useTreeGrid';

// ── Indicador de status de estoque ────────────────────────────────────────────
const getStockInfo = (produto) => {
  if (!produto.ativo) return { dot: 'bg-gray-400', label: 'Inativo', color: 'text-gray-400' };
  const e = produto.estoque_atual || 0;
  const m = produto.estoque_minimo || 0;
  if (e <= 0) return { dot: 'bg-red-500 animate-pulse', label: 'Sem estoque', color: 'text-red-500' };
  if (e <= m / 2) return { dot: 'bg-red-500', label: 'Crítico', color: 'text-red-500' };
  if (e <= m) return { dot: 'bg-orange-400', label: 'Baixo', color: 'text-orange-400' };
  return { dot: 'bg-green-500', label: 'OK', color: 'text-green-500' };
};

// ── Custo real com fallback ────────────────────────────────────────────────────
const getCustoReal = (produto) =>
  produto.preco_custo_calculado > 0
    ? produto.preco_custo_calculado
    : (produto.valor_compra || 0)
      + (produto.custo_frete_padrao || 0)
      + (produto.custo_imposto1_padrao || 0)
      + (produto.custo_imposto2_padrao || 0)
      + (produto.custo_outros_padrao || 0)
      - (produto.desconto_compra_padrao || 0);

// ── Card do SKU ────────────────────────────────────────────────────────────────
function ProdutoCard({ produto, onEdit, formatarNumero }) {
  const custo = getCustoReal(produto);
  const margem = produto.preco_venda_padrao > 0 && custo > 0
    ? ((produto.preco_venda_padrao - custo) / produto.preco_venda_padrao) * 100
    : 0;
  const stock = getStockInfo(produto);
  const temAlerta = (produto.estoque_atual || 0) <= (produto.estoque_minimo || 0) && produto.ativo;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 active:bg-gray-50 dark:active:bg-gray-800/60 transition-colors cursor-pointer"
      onClick={() => onEdit(produto)}
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
        {produto.imagem_url
          ? <img src={produto.imagem_url} alt="" className="w-full h-full object-cover" />
          : <Package className="w-5 h-5 text-gray-300 dark:text-gray-600" />}
      </div>

      {/* Info principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          <p className="text-[12px] font-medium text-gray-700 dark:text-gray-200 leading-snug line-clamp-2 flex-1">
            {produto.nome}
          </p>
          {temAlerta && (
            <AlertTriangle className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {/* Status dot + label */}
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stock.dot}`} />
            <span className={`text-[10px] ${stock.color}`}>
              {formatarNumero(produto.estoque_atual || 0)} {produto.unidade_principal || 'UN'}
            </span>
          </div>
          {/* Código interno */}
          {produto.codigo_interno && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              #{produto.codigo_interno}
            </span>
          )}
        </div>
      </div>

      {/* Preço + margem */}
      <div className="flex-shrink-0 text-right">
        <div className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
          R$ {formatarNumero(produto.preco_venda_padrao || 0)}
        </div>
        {margem > 0 && (
          <div className={`text-[11px] font-medium whitespace-nowrap ${
            margem < 15 ? 'text-red-500' : margem < 25 ? 'text-orange-400' : 'text-green-500'
          }`}>
            {formatarNumero(margem)}%
          </div>
        )}
      </div>

      {/* Seta de edição */}
      <Edit2 className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
    </div>
  );
}

// ── Cabeçalho do Grupo ─────────────────────────────────────────────────────────
function GrupoHeader({ label, count, estoqueTotal, valorTotal, expanded, onToggle, depth, formatarNumero }) {
  const isRoot = depth === 0;

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2.5 py-2.5 pr-3 text-left transition-colors active:bg-gray-100 dark:active:bg-gray-700/50 ${
        isRoot
          ? 'pl-4 bg-white dark:bg-gray-900'
          : 'pl-8 bg-gray-50/80 dark:bg-gray-800/40'
      }`}
    >
      {/* Chevron */}
      <span className="flex-shrink-0 text-gray-400 dark:text-gray-500">
        {expanded
          ? <ChevronDown className="w-4 h-4" />
          : <ChevronRight className="w-4 h-4" />}
      </span>

      {/* Label */}
      <span className={`flex-1 min-w-0 truncate leading-tight ${
        isRoot
          ? 'text-[13px] font-semibold text-gray-800 dark:text-gray-100'
          : 'text-[12px] font-medium text-gray-600 dark:text-gray-300'
      }`}>
        {label}
      </span>

      {/* Pills */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {estoqueTotal > 0 && (
          <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
            ∑{formatarNumero(estoqueTotal)}
          </span>
        )}
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
          isRoot
            ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        }`}>
          {count}
        </span>
      </div>
    </button>
  );
}

// ── Reconstrói chave após deep collapse ────────────────────────────────────────
function buildCollapsedKey(startKey, startNode, targetNode) {
  if (startNode === targetNode) return startKey;
  const childKey = Object.keys(startNode.children)[0];
  return buildCollapsedKey(
    `${startKey}::${childKey}`,
    startNode.children[childKey],
    targetNode
  );
}

// ── Separador sutil entre grupos raiz ─────────────────────────────────────────
function Divider({ depth }) {
  if (depth > 0) return null;
  return <div className="h-px bg-gray-100 dark:bg-gray-800 mx-4" />;
}

// ── Renderização recursiva de um nó ───────────────────────────────────────────
function RenderNode({ nodeKey, node, depth, expanded, toggle, onEdit, formatarNumero, isLast }) {
  const { label: collapsedLabel, node: finalNode } = deepCollapse(node);
  const finalKey = buildCollapsedKey(nodeKey, node, finalNode);

  const isLeaf       = !finalNode.children || Object.keys(finalNode.children).length === 0;
  const allSkus      = collectSkus(finalNode);
  const estoqueTotal = allSkus.reduce((s, p) => s + (p.estoque_atual || 0), 0);
  const isExpanded   = expanded[finalKey] !== false;

  // Leaf sub-grupos a partir de depth 1: sem cabeçalho, só SKUs inline
  if (depth > 0 && isLeaf) {
    return (
      <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
        {finalNode.skus.map(p => (
          <ProdutoCard key={p.id} produto={p} onEdit={onEdit} formatarNumero={formatarNumero} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <GrupoHeader
        label={collapsedLabel}
        count={allSkus.length}
        estoqueTotal={estoqueTotal}
        expanded={isExpanded}
        onToggle={() => toggle(finalKey)}
        depth={depth}
        formatarNumero={formatarNumero}
      />

      {isExpanded && (
        <div className={depth === 0 ? 'border-b border-gray-100 dark:border-gray-800' : ''}>
          {finalNode.children && Object.entries(finalNode.children).map(([childKey, childNode], idx, arr) => (
            <RenderNode
              key={childKey}
              nodeKey={`${finalKey}::${childKey}`}
              node={childNode}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              onEdit={onEdit}
              formatarNumero={formatarNumero}
              isLast={idx === arr.length - 1}
            />
          ))}
          {finalNode.skus && (
            <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {finalNode.skus.map(p => (
                <ProdutoCard key={p.id} produto={p} onEdit={onEdit} formatarNumero={formatarNumero} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componente Principal ───────────────────────────────────────────────────────
export default function MobileHierarquica({ produtos, onEdit, formatarNumero }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const tree = useMemo(() => buildTree(produtos), [produtos]);

  if (produtos.length === 0) {
    return (
      <div className="md:hidden py-16 text-center px-8">
        <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Package className="w-7 h-7 text-gray-300 dark:text-gray-600" />
        </div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhum produto encontrado</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tente ajustar os filtros de busca</p>
      </div>
    );
  }

  const entries = Object.entries(tree);

  return (
    <div className="md:hidden w-full overflow-x-hidden">
      {entries.map(([key, node], idx) => (
        <React.Fragment key={key}>
          <RenderNode
            nodeKey={key}
            node={node}
            depth={0}
            expanded={expanded}
            toggle={toggle}
            onEdit={onEdit}
            formatarNumero={formatarNumero}
            isLast={idx === entries.length - 1}
          />
          {idx < entries.length - 1 && <Divider depth={0} />}
        </React.Fragment>
      ))}
    </div>
  );
}