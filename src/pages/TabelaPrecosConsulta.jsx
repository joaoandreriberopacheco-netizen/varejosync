import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Package, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function TabelaPrecosConsulta() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabelaSelecionada, setTabelaSelecionada] = useState(null);
  const [tabelas, setTabelas] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

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
    let resultado = produtos;
    
    // Filtrar por busca
    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      resultado = resultado.filter(p => 
        p.nome?.toLowerCase().includes(termo) ||
        p.codigo_interno?.toLowerCase().includes(termo) ||
        p.codigo_barras?.toLowerCase().includes(termo)
      );
    }
    
    // Ordenar alfabeticamente por nome
    return resultado.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
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

      {/* Barra de Busca */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <Input
            placeholder="Buscar por nome, código interno ou código de barras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 border-0 bg-transparent focus-visible:ring-0 px-0 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Contagem de Resultados */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {produtosFiltrados.length} de {produtos.length} produtos
      </div>

      {/* Visualização em Lista (Cards) */}
      <div className="space-y-3">
        {produtosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Package className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">Nenhum produto encontrado</p>
          </div>
        ) : (
          produtosFiltrados.map(produto => (
            <div
              key={produto.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Informações do Produto */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {produto.nome}
                    </h3>
                    {produto.estoque_atual <= (produto.estoque_minimo || 0) && (
                      <span className="flex-shrink-0 text-xs font-semibold px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                        Baixo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Cód: <span className="font-mono">{produto.codigo_interno}</span>
                    {produto.codigo_barras && (
                      <> • EAN: <span className="font-mono">{produto.codigo_barras}</span></>
                    )}
                  </p>

                  {/* Estoque e Preço */}
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Estoque
                      </p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {Math.floor(produto.estoque_atual || 0)}
                        <span className="text-xs text-gray-400 ml-1">
                          (Mín: {Math.floor(produto.estoque_minimo || 0)})
                        </span>
                      </p>
                    </div>

                    <div className="text-right">
                      {tabelaSelecionada && tabelaSelecionada.fator_ajuste !== 1 && (
                        <p className="text-xs text-gray-400 line-through mb-1">
                          R$ {produto.preco_venda_padrao?.toFixed(2) || '0.00'}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {tabelaSelecionada?.nome_tabela || 'Preço'}
                      </p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        R$ {calcularPrecoVenda(produto).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}