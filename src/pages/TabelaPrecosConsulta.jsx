import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Package, Loader2, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useTreeGrid, flattenTree, buildExpandedForLevel } from '@/components/produtos/treegrid/useTreeGrid';

const fmtR = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

// ── Card de SKU ────────────────────────────────────────────────────────────────
function SkuCard({ row, calcularPreco, tabelaSelecionada }) {
  const p      = row.produto;
  const e = p.estoque_atual  || 0;
  const m = p.estoque_minimo || 0;
  const dotCls = !p.ativo    ? 'bg-gray-400'
    : e <= 0                 ? 'bg-red-500 animate-pulse'
    : e <= m                 ? 'bg-orange-400'
    : 'bg-green-500';

  const precoFinal = calcularPreco(p);
  const precoOriginal = p.preco_venda_padrao || 0;
  const temAjuste = tabelaSelecionada && tabelaSelecionada.fator_ajuste !== 1;

  return (
    <div
      className="flex items-start gap-3 px-3 py-2.5 bg-white dark:bg-gray-900 w-full"
      style={{ boxSizing: 'border-box' }}
    >
      {/* Thumbnail */}
      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5">
        {p.imagem_url
          ? <img src={p.imagem_url} alt="" className="w-full h-full object-cover" />
          : <Package className="w-4 h-4 text-gray-300 dark:text-gray-600" />}
      </div>

      {/* Nome + info */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-[12px] font-normal text-gray-700 dark:text-gray-200 leading-snug uppercase break-words">
          {p.nome}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {/* Status estoque */}
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotCls}`} />
            <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
              {fmtN(e)} {p.unidade_principal || 'UN'}
            </span>
          </div>
          {/* Código */}
          {p.codigo_interno && (
            <span className="text-[10px] text-gray-400 dark:text-gray-600 font-mono whitespace-nowrap">
              #{p.codigo_interno}
            </span>
          )}
          {/* EAN */}
          {p.codigo_barras && (
            <span className="text-[10px] text-gray-400 dark:text-gray-600 font-mono whitespace-nowrap">
              EAN:{p.codigo_barras}
            </span>
          )}
        </div>
      </div>

      {/* Preço — direita */}
      <div className="flex-shrink-0 text-right">
        {temAjuste && precoOriginal > 0 && (
          <div className="text-[10px] text-gray-400 line-through whitespace-nowrap tabular-nums">
            R$ {fmtR(precoOriginal)}
          </div>
        )}
        {precoFinal > 0 && (
          <div className="text-[14px] font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap tabular-nums">
            R$ {fmtR(precoFinal)}
          </div>
        )}
        {p.estoque_atual <= (p.estoque_minimo || 0) && p.estoque_atual <= 0 && (
          <div className="text-[10px] text-red-500 whitespace-nowrap mt-0.5">sem estoque</div>
        )}
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
export default function TabelaPrecosConsulta() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabelaSelecionada, setTabelaSelecionada] = useState(null);
  const [tabelas, setTabelas] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState(new Set());

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [user, tabelasData, produtosData] = await Promise.all([
        base44.auth.me(),
        base44.entities.TabelaPreco.filter({ ativo: true }),
        base44.entities.Produto.filter({ ativo: true }, '-created_date'),
      ]);
      setTabelas(tabelasData);
      const tabelaPadrao = tabelasData.find(t => t.is_default) || tabelasData[0];
      if (tabelaPadrao) setTabelaSelecionada(tabelaPadrao);
      setProdutos(produtosData);
    } catch (error) {
      toast.error('Erro ao carregar tabela de preços');
    } finally {
      setLoading(false);
    }
  };

  const produtosFiltrados = useMemo(() => {
    if (!searchTerm) return produtos;
    const termo = searchTerm.toLowerCase();
    return produtos.filter(p =>
      p.nome?.toLowerCase().includes(termo) ||
      p.codigo_interno?.toLowerCase().includes(termo) ||
      p.codigo_barras?.toLowerCase().includes(termo)
    );
  }, [produtos, searchTerm]);

  const calcularPreco = useCallback((produto) => {
    if (!tabelaSelecionada) return produto.preco_venda_padrao || 0;
    return (produto.preco_venda_padrao || 0) * (tabelaSelecionada.fator_ajuste || 1);
  }, [tabelaSelecionada]);

  // ── Tree engine ──────────────────────────────────────────────────────────────
  const tree = useTreeGrid(produtosFiltrados);

  useEffect(() => {
    setExpandedKeys(buildExpandedForLevel(tree, 1));
  }, [tree]);

  const rows = useMemo(() => {
    const all = flattenTree(tree, expandedKeys);
    return all.filter(r => !(r.type === 'group' && r.count === 0));
  }, [tree, expandedKeys]);

  const handleToggle = useCallback((key) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden w-full bg-white dark:bg-gray-900">

      {/* Header fixo */}
      <div className="flex-none bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-3 py-2 space-y-2">

        {/* Título + contagem */}
        <div>
          <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100 font-glacial">Tabela de Preços</h1>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {produtosFiltrados.length} produto{produtosFiltrados.length !== 1 ? 's' : ''}
            {searchTerm && ` · "${searchTerm}"`}
          </p>
        </div>

        {/* Seletor de tabela */}
        {tabelas.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            {tabelas.map(tabela => (
              <button
                key={tabela.id}
                onClick={() => setTabelaSelecionada(tabela)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                  tabelaSelecionada?.id === tabela.id
                    ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                {tabela.nome_tabela}
                {tabela.fator_ajuste !== 1 && (
                  <span className="ml-1 opacity-70">
                    ({tabela.fator_ajuste > 1 ? '+' : ''}{((tabela.fator_ajuste - 1) * 100).toFixed(0)}%)
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="border-none bg-gray-100 dark:bg-gray-800 h-10 text-sm pl-9 text-gray-700 dark:text-gray-200 shadow-none focus-visible:ring-0 w-full rounded-xl"
          />
        </div>
      </div>

      {/* Lista hierárquica com scroll independente */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-3">
              <Package className="w-7 h-7 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhum produto encontrado</p>
            {searchTerm && <p className="text-xs text-gray-400 mt-1">Tente outros termos de busca</p>}
          </div>
        ) : (
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
                  calcularPreco={calcularPreco}
                  tabelaSelecionada={tabelaSelecionada}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}