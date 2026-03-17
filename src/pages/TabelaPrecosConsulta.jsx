import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Package, Loader2, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function TabelaPrecosConsulta() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabelaSelecionada, setTabelaSelecionada] = useState(null);
  const [tabelas, setTabelas] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' ou 'table'

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Carregar usuário e tabelas
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      const tabelasData = await base44.entities.TabelaPreco.filter({ ativo: true });
      setTabelas(tabelasData);
      
      // Selecionar tabela padrão ou primeira tabela
      const tabelaPadrao = tabelasData.find(t => t.is_default) || tabelasData[0];
      if (tabelaPadrao) {
        setTabelaSelecionada(tabelaPadrao);
      }
      
      // Carregar produtos ativos
      const produtosData = await base44.entities.Produto.filter({ ativo: true }, '-created_date');
      setProdutos(produtosData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
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

  const calcularPrecoVenda = (produto) => {
    if (!tabelaSelecionada) return produto.preco_venda_padrao;
    const fator = tabelaSelecionada.fator_ajuste || 1;
    return produto.preco_venda_padrao * fator;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-glacial mb-1">
            Tabela de Preços
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Consulte estoque, preços e códigos dos produtos
          </p>
        </div>

        {/* Seletor de Tabela */}
        {tabelas.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {tabelas.map(tabela => (
              <button
                key={tabela.id}
                onClick={() => setTabelaSelecionada(tabela)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  tabelaSelecionada?.id === tabela.id
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {tabela.nome_tabela}
                {tabela.fator_ajuste !== 1 && (
                  <span className="ml-2 text-xs opacity-75">
                    ({tabela.fator_ajuste > 1 ? '+' : ''}{((tabela.fator_ajuste - 1) * 100).toFixed(0)}%)
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <Input
            placeholder="Buscar por nome, código interno ou código de barras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 border-0 bg-transparent focus-visible:ring-0 px-0 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
          />
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={viewMode === 'grid' ? 'Visualizar como tabela' : 'Visualizar como grid'}
          >
            {viewMode === 'grid' ? (
              <Eye className="w-5 h-5 text-gray-400" />
            ) : (
              <EyeOff className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Contagem de Resultados */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {produtosFiltrados.length} de {produtos.length} produtos
      </div>

      {/* Visualização em Grid */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {produtosFiltrados.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400">
              <Package className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">Nenhum produto encontrado</p>
            </div>
          ) : (
            produtosFiltrados.map(produto => (
              <div
                key={produto.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Código Interno */}
                <div className="flex items-start justify-between mb-3">
                  <div className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2.5 py-1 rounded-lg">
                    {produto.codigo_interno}
                  </div>
                  {produto.estoque_atual <= (produto.estoque_minimo || 0) && (
                    <span className="text-xs font-semibold px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                      Baixo
                    </span>
                  )}
                </div>

                {/* Nome do Produto */}
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 line-clamp-2 text-sm">
                  {produto.nome}
                </h3>

                {/* Estoque */}
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Estoque
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {Math.floor(produto.estoque_atual || 0)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Mínimo: {Math.floor(produto.estoque_minimo || 0)}
                  </p>
                </div>

                {/* Preço */}
                <div className="space-y-2">
                  {tabelaSelecionada && tabelaSelecionada.fator_ajuste !== 1 && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Preço Base</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-through">
                        R$ {produto.preco_venda_padrao?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {tabelaSelecionada?.nome_tabela || 'Preço'}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      R$ {calcularPrecoVenda(produto).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Visualização em Tabela */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Produto
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estoque
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Preço de Venda
                  </th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-16 text-center text-gray-500">
                      Nenhum produto encontrado
                    </td>
                  </tr>
                ) : (
                  produtosFiltrados.map(produto => (
                    <tr
                      key={produto.id}
                      className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-mono text-xs">
                        {produto.codigo_interno}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {produto.nome}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {produto.codigo_barras}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-end justify-end gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {Math.floor(produto.estoque_atual || 0)}
                          </span>
                          {produto.estoque_atual <= (produto.estoque_minimo || 0) && (
                            <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                              ⚠
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                        R$ {calcularPrecoVenda(produto).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}