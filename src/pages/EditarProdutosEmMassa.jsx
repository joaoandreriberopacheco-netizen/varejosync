import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Monitor } from 'lucide-react';
import GradeEdicaoMassiva from '@/components/produtos/GradeEdiacaoMassiva';
import FiltrosProdutosEmMassa from '@/components/produtos/FiltrosProdutosEmMassa';

export default function EditarProdutosEmMassa() {
  const [isMobile, setIsMobile] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ busca: '', categoria: '', ativo: 'todos' });
  const [salvarLoading, setSalvarLoading] = useState(false);

  // Detectar tamanho da tela
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Carregar produtos
  useEffect(() => {
    if (!isMobile) {
      carregarProdutos();
    }
  }, [isMobile]);

  const carregarProdutos = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.Produto.list();
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar produtos
  const produtosFiltrados = produtos.filter(produto => {
    const matchBusca = !filtros.busca || 
      produto.nome?.toLowerCase().includes(filtros.busca.toLowerCase()) ||
      produto.codigo_interno?.includes(filtros.busca);
    
    const matchCategoria = !filtros.categoria || produto.categoria_id === filtros.categoria;
    
    const matchAtivo = filtros.ativo === 'todos' || 
      (filtros.ativo === 'ativo' ? produto.ativo : !produto.ativo);
    
    return matchBusca && matchCategoria && matchAtivo;
  });

  const handleSalvar = async (alteracoesFiltradas) => {
    try {
      setSalvarLoading(true);
      
      // Bulk update: enviar apenas as linhas alteradas
      const updates = Object.entries(alteracoesFiltradas).map(([id, dados]) => ({
        id,
        ...dados,
      }));

      if (updates.length > 0) {
        // Usar bulkCreate ou update individual (ajustar conforme API Base44)
        for (const update of updates) {
          await base44.entities.Produto.update(update.id, update);
        }
      }

      await carregarProdutos();
    } catch (error) {
      console.error('Erro ao salvar produtos:', error);
    } finally {
      setSalvarLoading(false);
    }
  };

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6 bg-white dark:bg-gray-900">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center max-w-sm">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Monitor className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </div>
          </div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Disponível apenas em desktop
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            A edição em massa de produtos é otimizada para telas grandes. Use um computador ou tablet em modo paisagem para acessar esta funcionalidade.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-glacial font-semibold text-gray-900 dark:text-white">
          Editar Produtos em Massa
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {produtosFiltrados.length} produto{produtosFiltrados.length !== 1 ? 's' : ''}
          {Object.keys(alteracoes).length > 0 && ` • ${Object.keys(alteracoes).length} alteração${Object.keys(alteracoes).length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Filtros */}
      <FiltrosProdutosEmMassa 
        filtros={filtros}
        onFiltrosChange={setFiltros}
        onAdicionarLinha={handleAdicionarLinha}
      />

      {/* Tabela */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 dark:text-gray-400">Carregando produtos...</div>
          </div>
        ) : (
          <TabelaProdutosEditavel
            produtos={produtosFiltrados}
            alteracoes={alteracoes}
            onAlteracao={handleAlteracao}
          />
        )}
      </div>

      {/* Footer com botões de ação */}
      {Object.keys(alteracoes).length > 0 && (
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3">
          <button
            onClick={() => setAlteracoes({})}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Descartar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvarLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {salvarLoading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      )}
    </div>
  );
}