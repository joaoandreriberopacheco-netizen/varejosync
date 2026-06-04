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
    <div className="flex-shrink-0 px-4 py-3 border-b border-border/40 bg-muted/50/50 flex items-center gap-3">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input autoComplete="off"
          type="text"
          placeholder="Buscar..."
          value={filtros.busca}
          onChange={(e) => onFiltrosChange({ ...filtros, busca: e.target.value })}
          className="w-full pl-10 pr-3 py-1.5 text-xs bg-card border border-border/40 text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <select
        value={filtros.categoria}
        onChange={(e) => onFiltrosChange({ ...filtros, categoria: e.target.value })}
        className="px-3 py-1.5 text-xs bg-card border border-border/40 text-foreground rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">Categorias</option>
        {categorias.map(cat => (
          <option key={cat.id} value={cat.id}>{cat.nome}</option>
        ))}
      </select>

      <select
        value={filtros.ativo}
        onChange={(e) => onFiltrosChange({ ...filtros, ativo: e.target.value })}
        className="px-3 py-1.5 text-xs bg-card border border-border/40 text-foreground rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="todos">Todos</option>
        <option value="ativo">Ativos</option>
        <option value="inativo">Inativos</option>
      </select>
    </div>
  );
}