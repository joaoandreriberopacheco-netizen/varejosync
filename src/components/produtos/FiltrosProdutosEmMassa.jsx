import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function FiltrosProdutosEmMassa({ filtros, onFiltrosChange, onAdicionarLinha }) {
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    carregarCategorias();
  }, []);

  const carregarCategorias = async () => {
    try {
      const data = await base44.entities.CategoriaProduto?.list?.() || [];
      setCategorias(data);
    } catch (error) {
      console.warn('Erro ao carregar categorias:', error);
    }
  };

  const handleBusca = (value) => {
    onFiltrosChange({ ...filtros, busca: value });
  };

  const handleCategoria = (value) => {
    onFiltrosChange({ ...filtros, categoria: value });
  };

  const handleAtivo = (value) => {
    onFiltrosChange({ ...filtros, ativo: value });
  };

  return (
    <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Busca */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Search className="w-4 h-4 inline mr-1" />
            Buscar
          </label>
          <input
            type="text"
            placeholder="Nome ou código..."
            value={filtros.busca}
            onChange={(e) => handleBusca(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Categoria */}
        <div className="min-w-[180px]">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Filter className="w-4 h-4 inline mr-1" />
            Categoria
          </label>
          <select
            value={filtros.categoria}
            onChange={(e) => handleCategoria(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="min-w-[140px]">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <select
            value={filtros.ativo}
            onChange={(e) => handleAtivo(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="todos">Todos</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>

        {/* Botão Adicionar */}
        <button
          onClick={onAdicionarLinha}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>
    </div>
  );
}