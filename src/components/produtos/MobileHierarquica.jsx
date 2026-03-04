import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Package, MoreHorizontal, Edit, Copy, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const getStockDot = (produto) => {
  if (!produto.ativo) return 'bg-gray-400';
  const e = produto.estoque_atual || 0;
  const m = produto.estoque_minimo || 0;
  if (e <= 0 || e <= m / 2) return 'bg-red-500';
  if (e <= m) return 'bg-orange-400';
  return 'bg-green-500';
};

const getStockLabel = (produto) => {
  if (!produto.ativo) return 'Inativo';
  const e = produto.estoque_atual || 0;
  const m = produto.estoque_minimo || 0;
  if (e <= 0) return 'Crítico';
  if (e <= m) return 'Baixo';
  return 'OK';
};

function ProdutoCard({ produto, onEdit, formatarNumero }) {
  const margem = produto.preco_venda_padrao > 0
    ? ((produto.preco_venda_padrao - (produto.preco_custo_calculado || 0)) / produto.preco_venda_padrao) * 100
    : 0;
  const nome = produto.nome || [produto.campo_hierarquico_1, produto.campo_hierarquico_2, produto.campo_hierarquico_3].filter(Boolean).join(' ');

  return (
    <div className="flex items-center gap-2 py-2.5 px-3 w-full overflow-hidden">
      {/* Imagem pequena */}
      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
        {produto.imagem_url
          ? <img src={produto.imagem_url} alt="" className="w-full h-full object-cover" />
          : <Package className="w-4 h-4 text-gray-300 dark:text-gray-600" />
        }
      </div>

      {/* Info — ocupa todo o espaço disponível */}
      <div className="flex-1 min-w-0 overflow-hidden" onClick={() => onEdit(produto)}>
        <p className="text-[11px] font-medium text-gray-800 dark:text-gray-200 leading-tight break-words line-clamp-2 uppercase">
          {nome}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStockDot(produto)}`} />
          <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
            {formatarNumero(produto.estoque_atual)} {produto.unidade_principal || 'UN'}
          </span>
        </div>
      </div>

      {/* Preço + margem + menu — largura fixa mínima */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <div className="text-right">
          <div className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
            R$ {formatarNumero(produto.preco_venda_padrao)}
          </div>
          <div className={`text-[10px] whitespace-nowrap ${margem < 15 ? 'text-red-500' : margem < 25 ? 'text-orange-500' : 'text-green-500'}`}>
            {formatarNumero(margem)}%
          </div>
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
              <MoreHorizontal className="h-3.5 w-3.5 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
            <DropdownMenuItem onClick={() => onEdit(produto)} className="dark:text-gray-200 dark:hover:bg-gray-700 text-xs">
              <Edit className="mr-2 h-3.5 w-3.5" />Editar
            </DropdownMenuItem>
            <DropdownMenuItem className="dark:text-gray-200 dark:hover:bg-gray-700 text-xs">
              <Copy className="mr-2 h-3.5 w-3.5" />Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600 dark:text-red-400 dark:hover:bg-gray-700 text-xs">
              <Archive className="mr-2 h-3.5 w-3.5" />Inativar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function GrupoHeader({ label, count, estoqueTotal, abaixoMin, expanded, onToggle, depth, formatarNumero }) {
  const pl = depth === 0 ? 'px-3' : 'px-6';
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2 py-2 ${pl} bg-gray-50 dark:bg-gray-800/60 text-left`}
    >
      <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </span>
      <span className={`text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 flex-1 truncate ${depth === 0 ? '' : 'font-medium text-gray-500 dark:text-gray-400'}`}>
        {label}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        {estoqueTotal > 0 && (
          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
            ∑ {formatarNumero(estoqueTotal)}
          </span>
        )}
        {abaixoMin > 0 && (
          <span className="text-[10px] text-red-500 dark:text-red-400">{abaixoMin}⚠</span>
        )}
        <span className="text-[10px] text-gray-400 dark:text-gray-500">{count}</span>
      </div>
    </button>
  );
}

export default function MobileHierarquica({ produtos, onEdit, formatarNumero }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const tree = useMemo(() => {
    const root = {};
    produtos.forEach(p => {
      // Descobrir todos os níveis preenchidos
      const niveis = [
        p.campo_hierarquico_1,
        p.campo_hierarquico_2,
        p.campo_hierarquico_3,
        p.campo_hierarquico_4,
        p.campo_hierarquico_5,
      ].filter(Boolean);

      // Agrupamos até o penúltimo nível
      // Se só tem 1 nível, agrupamos pelo L1 e o produto cai direto
      // Se tem 2+ níveis, agrupamos pelo L1 e o L2 em diante vai direto como produto (sem subgrupo)
      // Se tem 3+ níveis, agrupamos L1 > L2 e o produto cai no L2
      // Regra: grupos = niveis.slice(0, niveis.length - 1), produto cai no último grupo

      const l1 = niveis[0] || '(Sem Categoria)';
      if (!root[l1]) root[l1] = { children: {}, items: [] };

      if (niveis.length <= 2) {
        // Produto cai direto no L1 (sem subgrupo L2)
        root[l1].items.push(p);
      } else {
        // Tem 3+ níveis: agrupa por L2, produto cai no L2
        const l2 = niveis[1];
        if (!root[l1].children[l2]) root[l1].children[l2] = { items: [] };
        root[l1].children[l2].items.push(p);
      }
    });
    return root;
  }, [produtos]);

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
      {Object.entries(tree).map(([l1Key, l1Node]) => {
        const l1Expanded = expanded[l1Key] !== false;
        const allL1 = [...l1Node.items, ...Object.values(l1Node.children).flatMap(c => c.items)];
        const l1EstoqueTotal = allL1.reduce((s, p) => s + (p.estoque_atual || 0), 0);
        const l1AbaixoMin = allL1.filter(p => p.ativo && p.estoque_atual <= p.estoque_minimo).length;

        return (
          <div key={l1Key}>
            <GrupoHeader
              label={l1Key}
              count={allL1.length}
              estoqueTotal={l1EstoqueTotal}
              abaixoMin={l1AbaixoMin}
              expanded={l1Expanded}
              onToggle={() => toggle(l1Key)}
              depth={0}
              formatarNumero={formatarNumero}
            />

            {l1Expanded && (
              <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {/* Itens diretos no L1 */}
                {l1Node.items.map(p => (
                  <ProdutoCard key={p.id} produto={p} onEdit={onEdit} formatarNumero={formatarNumero} />
                ))}

                {/* Subgrupos L2 */}
                {Object.entries(l1Node.children).map(([l2Key, l2Node]) => {
                  const l2FullKey = `${l1Key}::${l2Key}`;
                  const l2Expanded = expanded[l2FullKey] !== false;
                  const l2EstoqueTotal = l2Node.items.reduce((s, p) => s + (p.estoque_atual || 0), 0);
                  const l2AbaixoMin = l2Node.items.filter(p => p.ativo && p.estoque_atual <= p.estoque_minimo).length;

                  return (
                    <div key={l2FullKey}>
                      <GrupoHeader
                        label={l2Key}
                        count={l2Node.items.length}
                        estoqueTotal={l2EstoqueTotal}
                        abaixoMin={l2AbaixoMin}
                        expanded={l2Expanded}
                        onToggle={() => toggle(l2FullKey)}
                        depth={1}
                        formatarNumero={formatarNumero}
                      />
                      {l2Expanded && l2Node.items.map(p => (
                        <ProdutoCard key={p.id} produto={p} onEdit={onEdit} formatarNumero={formatarNumero} />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}