import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Plus } from 'lucide-react';

export default function FiltrosProdutosEmMassa({ filtros, onFiltrosChange, onAdicionarLinha }) {
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    carregarCategorias();
  }, []);

  const carregarCategorias = async () => {
    try {
      const data = await base44.entities.CategoriaProduto.list();
      setCategorias(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  return (
    <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar produtos..."
          value={filtros.busca}
          onChange={(e) => onFiltrosChange({ ...filtros, busca: e.target.value })}
          className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <select
        value={filtros.categoria}
        onChange={(e) => onFiltrosChange({ ...filtros, categoria: e.target.value })}
        className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Todas as categorias</option>
        {categorias.map(cat => (
          <option key={cat.id} value={cat.id}>{cat.nome}</option>
        ))}
      </select>

      <select
        value={filtros.ativo}
        onChange={(e) => onFiltrosChange({ ...filtros, ativo: e.target.value })}
        className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="todos">Todos</option>
        <option value="ativo">Ativos</option>
        <option value="inativo">Inativos</option>
      </select>

      <button
        onClick={onAdicionarLinha}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors whitespace-nowrap"
      >
        <Plus className="w-4 h-4" />
        Adicionar
      </button>
    </div>
  );
}