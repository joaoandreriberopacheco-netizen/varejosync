import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Package, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildTree, collectSkus, deepCollapse } from './treegrid/useTreeGrid';

// ── Ponto de status de estoque ─────────────────────────────────────────────────
const getStockDot = (produto) => {
  if (!produto.ativo) return 'bg-gray-400';
  const e = produto.estoque_atual || 0;
  const m = produto.estoque_minimo || 0;
  if (e <= 0 || e <= m / 2) return 'bg-red-500 animate-pulse';
  if (e <= m) return 'bg-orange-400';
  return 'bg-green-500';
};

// ── Card do SKU — Imagem como Marco 0 (extrema esquerda) ────────────────────────
function ProdutoCard({ produto, onEdit, formatarNumero }) {
  const margem = produto.preco_venda_padrao > 0
    ? ((produto.preco_venda_padrao - (produto.preco_custo_calculado || 0)) / produto.preco_venda_padrao) * 100
    : 0;

  return (
    <div className="flex items-center gap-2 py-2 w-full overflow-hidden border-b border-gray-50 dark:border-gray-800/50">
      {/* Marco 0 — Imagem na extrema esquerda, sem padding extra */}
      <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ml-3">
        {produto.imagem_url
          ? <img src={produto.imagem_url} alt="" className="w-full h-full object-cover" />
          : <Package className="w-4 h-4 text-gray-300 dark:text-gray-600" />}
      </div>

      {/* Status dot */}
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStockDot(produto)}`} />

      {/* Info */}
      <div className="flex-1 min-w-0 overflow-hidden" onClick={() => onEdit(produto)}>
        <p className="text-[11px] font-normal text-gray-600 dark:text-gray-300 leading-tight line-clamp-2 uppercase">
          {produto.nome}
        </p>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          {formatarNumero(produto.estoque_atual)} {produto.unidade_principal || 'UN'}
        </span>
      </div>

      {/* Preço + margem + editar */}
      <div className="flex items-center gap-1 flex-shrink-0 pr-2">
        <div className="text-right">
          <div className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
            R$ {formatarNumero(produto.preco_venda_padrao)}
          </div>
          <div className={`text-[10px] whitespace-nowrap ${margem < 15 ? 'text-red-500' : margem < 25 ? 'text-orange-500' : 'text-green-500'}`}>
            {formatarNumero(margem)}%
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity"
          onClick={() => onEdit(produto)}
        >
          <Edit className="h-3.5 w-3.5 text-gray-500" />
        </Button>
      </div>
    </div>
  );
}

// ── Cabeçalho do Grupo ──────────────────────────────────────────────────────────
function GrupoHeader({ label, count, estoqueTotal, expanded, onToggle, depth, formatarNumero }) {
  const pl = depth === 0 ? 'pl-3' : 'pl-6';
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2 py-2 pr-3 ${pl} bg-gray-50 dark:bg-gray-800/60 text-left`}
    >
      <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </span>
      <span className={`text-[11px] uppercase tracking-wide flex-1 truncate ${depth === 0 ? 'font-semibold text-gray-700 dark:text-gray-200' : 'font-medium text-gray-500 dark:text-gray-400'}`}>
        {label}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        {estoqueTotal > 0 && (
          <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
            ∑ {formatarNumero(estoqueTotal)}
          </span>
        )}
        <span className="text-[10px] text-gray-400 dark:text-gray-500">{count}</span>
      </div>
    </button>
  );
}

// ── Renderização recursiva de um nó (com deep collapse) ─────────────────────────
function RenderNode({ nodeKey, node, depth, expanded, toggle, onEdit, formatarNumero }) {
  const { label: collapsedLabel, node: finalNode } = deepCollapse(node);
  const finalKey = buildCollapsedKey(nodeKey, node, finalNode);

  const isLeaf       = !finalNode.children || Object.keys(finalNode.children).length === 0;
  const allSkus      = collectSkus(finalNode);
  const estoqueTotal = allSkus.reduce((s, p) => s + (p.estoque_atual || 0), 0);
  const isExpanded   = expanded[finalKey] !== false; // default aberto

  // ── Achatamento Agressivo: leaf sub-grupos omitem o cabeçalho ───────────────
  // depth > 0 = não é raiz; leaf = sem sub-filhos → mostra SKUs diretamente
  if (depth > 0 && isLeaf) {
    return (
      <>
        {finalNode.skus.map(p => (
          <ProdutoCard key={p.id} produto={p} onEdit={onEdit} formatarNumero={formatarNumero} />
        ))}
      </>
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
        <div>
          {Object.entries(finalNode.children).map(([childKey, childNode]) => (
            <RenderNode
              key={childKey}
              nodeKey={`${finalKey}::${childKey}`}
              node={childNode}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              onEdit={onEdit}
              formatarNumero={formatarNumero}
            />
          ))}
          {finalNode.skus.map(p => (
            <ProdutoCard key={p.id} produto={p} onEdit={onEdit} formatarNumero={formatarNumero} />
          ))}
        </div>
      )}
    </div>
  );
}

// Reconstrói chave após deep collapse
function buildCollapsedKey(startKey, startNode, targetNode) {
  if (startNode === targetNode) return startKey;
  const childKey = Object.keys(startNode.children)[0];
  return buildCollapsedKey(
    `${startKey}::${childKey}`,
    startNode.children[childKey],
    targetNode
  );
}

// ── Componente Principal ────────────────────────────────────────────────────────
export default function MobileHierarquica({ produtos, onEdit, formatarNumero }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const tree = useMemo(() => buildTree(produtos), [produtos]);

  if (produtos.length === 0) {
    return (
      <div className="md:hidden py-12 text-center">
        <Package className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
        <p className="text-xs text-gray-400 dark:text-gray-500">Nenhum produto encontrado</p>
      </div>
    );
  }

  return (
    <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800 w-full overflow-x-hidden">
      {Object.entries(tree).map(([key, node]) => (
        <RenderNode
          key={key}
          nodeKey={key}
          node={node}
          depth={0}
          expanded={expanded}
          toggle={toggle}
          onEdit={onEdit}
          formatarNumero={formatarNumero}
        />
      ))}
    </div>
  );
}