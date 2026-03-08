import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, RotateCcw, Search, AlertCircle } from 'lucide-react';
import SpreadsheetNativa from '@/components/produtos/SpreadsheetNativa';

export default function EditarProdutosEmMassa() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvarLoading, setSalvarLoading] = useState(false);
  const [alteracoes, setAlteracoes] = useState({});
  const [busca, setBusca] = useState('');

  const carregarProdutos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Produto.list('-updated_date', 500);
      setProdutos(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarProdutos();
  }, [carregarProdutos]);

  const produtosFiltrados = produtos.filter(p => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      (p.nome || '').toLowerCase().includes(q) ||
      (p.codigo_interno || '').toLowerCase().includes(q) ||
      (p.campo_hierarquico_1 || '').toLowerCase().includes(q)
    );
  });

  const totalAlteracoes = Object.keys(alteracoes).length;

  const handleSalvar = async () => {
    try {
      setSalvarLoading(true);

      const linhasValidas = Object.entries(alteracoes).filter(([id, dados]) => {
        const produto = produtos.find(p => p.id === id);
        const preco = dados.preco_venda_padrao !== undefined ? dados.preco_venda_padrao : produto?.preco_venda_padrao;
        return preco;
      });

      for (const [id, dados] of linhasValidas) {
        await base44.entities.Produto.update(id, dados);
      }

      setAlteracoes({});
      await carregarProdutos();
    } finally {
      setSalvarLoading(false);
    }
  };

  const handleDescartar = () => {
    setAlteracoes({});
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-white dark:bg-gray-900 overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white font-glacial">
            Edição em Massa
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {produtos.length} produtos carregados
          </p>
        </div>

        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar produto..."
              className="pl-9 h-8 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {totalAlteracoes > 0 && (
            <>
              <Badge variant="secondary" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                {totalAlteracoes} alterado{totalAlteracoes > 1 ? 's' : ''}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDescartar}
                className="h-8 text-xs text-gray-500"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Descartar
              </Button>
              <Button
                size="sm"
                onClick={handleSalvar}
                disabled={salvarLoading}
                className="h-8 text-xs bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-700"
              >
                {salvarLoading ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Save className="w-3 h-3 mr-1" />
                )}
                Salvar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Corpo */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Carregando produtos...</span>
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Nenhum produto encontrado.
          </div>
        ) : (
          <SpreadsheetNativa
            produtos={produtosFiltrados}
            alteracoes={alteracoes}
            onAlteracoes={setAlteracoes}
          />
        )}
      </div>
    </div>
  );
}