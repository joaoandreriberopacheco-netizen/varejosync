import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Package, Boxes, Loader2, Calculator } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import OrcamentoSheet from '@/components/orcamento/OrcamentoSheet';
import { calcularPrecoVendaTabela } from '@/lib/orcamentoPrecoTabela';
import { formatEstoqueApresentacao, hasAlternativeUnits } from '@/lib/productUnits';

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
  const apresentEstoque = formatEstoqueApresentacao(p);
  const estoqueExibicao = apresentEstoque ? apresentEstoque.quantidade : e;
  const unidadeExibicao = apresentEstoque ? apresentEstoque.sigla : (p.unidade_principal || 'UN');

  return (
    <div
      className="flex items-center gap-4 px-4 py-3.5 bg-white dark:bg-gray-900 w-full"
      style={{ boxSizing: 'border-box' }}
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
        {p.imagem_url
          ? <img src={p.imagem_url} alt="" className="w-full h-full object-cover" />
          : <Package className="w-5 h-5 text-gray-300 dark:text-gray-600" />}
      </div>

      {/* Nome + info */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 leading-snug break-words flex items-center gap-1.5 flex-wrap">
          {hasAlternativeUnits(p) && (
            <span title="Várias unidades de venda" className="inline-flex flex-shrink-0">
              <Boxes className="w-3.5 h-3.5 text-gray-400" aria-hidden />
            </span>
          )}
          <span>{p.nome}</span>
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Status estoque */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCls}`} />
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
              {fmtN(estoqueExibicao)} {unidadeExibicao}
              {apresentEstoque && <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-1">(show comercial)</span>}
            </span>
          </div>
          {/* Código */}
          {p.codigo_interno && (
            <span className="text-xs text-gray-400 dark:text-gray-600 font-mono whitespace-nowrap">
              #{p.codigo_interno}
            </span>
          )}
        </div>
      </div>

      {/* Preço — direita */}
      <div className="flex-shrink-0 text-right">
        {temAjuste && precoOriginal > 0 && (
          <div className="text-xs text-gray-400 line-through whitespace-nowrap tabular-nums">
            R$ {fmtR(precoOriginal)}
          </div>
        )}
        {precoFinal > 0 && (
          <div className="text-base font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap tabular-nums">
            R$ {fmtR(precoFinal)}
          </div>
        )}
        {e <= 0 && (
          <div className="text-xs text-red-400 whitespace-nowrap mt-0.5">sem estoque</div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function TabelaPrecosConsulta() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabelaSelecionada, setTabelaSelecionada] = useState(null);
  const [tabelas, setTabelas] = useState([]);
  const [showOrcamento, setShowOrcamento] = useState(false);
  const [empresa, setEmpresa] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [, tabelasData, produtosData, empresaData] = await Promise.all([
        base44.auth.me(),
        base44.entities.TabelaPreco.filter({ ativo: true }),
        base44.entities.Produto.filter({ ativo: true }, '-created_date'),
        base44.entities.DadosEmpresa.list().catch(() => []),
      ]);
      setTabelas(tabelasData);
      const tabelaPadrao = tabelasData.find(t => t.is_default) || tabelasData[0];
      if (tabelaPadrao) setTabelaSelecionada(tabelaPadrao);
      setProdutos(produtosData);
      if (empresaData?.length > 0) setEmpresa(empresaData[0]);
    } catch (error) {
      toast.error('Erro ao carregar tabela de preços');
    } finally {
      setLoading(false);
    }
  };

  const produtosFiltrados = useMemo(() => {
    let lista = produtos;
    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      lista = lista.filter(p =>
        p.nome?.toLowerCase().includes(termo) ||
        p.codigo_interno?.toLowerCase().includes(termo) ||
        p.codigo_barras?.toLowerCase().includes(termo)
      );
    }
    return [...lista].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
  }, [produtos, searchTerm]);

  const calcularPreco = useCallback(
    (produto) => calcularPrecoVendaTabela(produto, tabelaSelecionada),
    [tabelaSelecionada]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden w-full bg-white dark:bg-gray-900 relative">

      {/* Header fixo */}
      <div className="flex-none bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 space-y-3">

        {/* Título + contagem */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 font-glacial">Tabela de Preços</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {produtosFiltrados.length} produto{produtosFiltrados.length !== 1 ? 's' : ''}
              {searchTerm && ` · "${searchTerm}"`}
            </p>
          </div>
          <span className="px-3 py-2 rounded-2xl text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            Ordem alfabética (A→Z)
          </span>
        </div>

        {/* Seletor de tabela */}
         {tabelas.length > 0 && (
           <div className="flex gap-2 flex-wrap">
             {tabelas.map(tabela => (
               <button
                 key={tabela.id}
                 onClick={() => setTabelaSelecionada(tabela)}
                 className={`px-4 py-2 rounded-2xl text-xs font-medium transition-all cursor-pointer active:scale-95 ${
                   tabelaSelecionada?.id === tabela.id
                     ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 shadow-sm'
                     : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Buscar produto, código, EAN..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="border-none bg-gray-100 dark:bg-gray-800 h-12 text-sm pl-10 text-gray-700 dark:text-gray-200 shadow-none focus-visible:ring-0 w-full rounded-2xl"
          />
        </div>
      </div>

      {/* FAB Orçamento */}
      <button
        onClick={() => setShowOrcamento(true)}
        className="fixed right-4 z-[55] flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 shadow-xl transition-all hover:bg-gray-700 active:scale-95 dark:bg-gray-100 dark:hover:bg-gray-200 p38-bottom-fab1 lg:right-6"
        title="Novo Orçamento"
      >
        <Calculator className="w-6 h-6 text-white dark:text-gray-900" />
      </button>

      {/* Orçamento Sheet */}
      <OrcamentoSheet
        isOpen={showOrcamento}
        onClose={() => setShowOrcamento(false)}
        produtos={produtos}
        tabelaSelecionada={tabelaSelecionada}
        calcularPreco={calcularPreco}
        nomeTabela={tabelaSelecionada?.nome_tabela}
        empresa={empresa}
      />

      {/* Lista simples em ordem alfabética */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {produtosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-3">
              <Package className="w-7 h-7 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhum produto encontrado</p>
            {searchTerm && <p className="text-xs text-gray-400 mt-1">Tente outros termos de busca</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {produtosFiltrados.map(produto => (
              <SkuCard
                key={produto.id}
                row={{ produto }}
                calcularPreco={calcularPreco}
                tabelaSelecionada={tabelaSelecionada}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}