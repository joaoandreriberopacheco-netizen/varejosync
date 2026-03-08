import React, { useState } from 'react';
import { ChevronRight, Calendar, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SeletorProdutoRPP = ({ onSelectProduct, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [nivelSelecionado, setNivelSelecionado] = useState('SKU');
  const [janelaTemporalSelecionada, setJanelaTemporalSelecionada] = useState('90d');

  // Mock de produtos para demonstração
  const produtosMock = [
    {
      id: 1,
      nome: 'Cimento Portland Standard 50kg',
      categoria: 'Cimento Portland',
      nivel1: 'Cimento Portland',
      nivel2: 'Standard',
      nivel3: '50kg',
      classe: 'A',
      iep: 85,
      lucro90d: 45200,
      margem: 45.2,
      giro: 24,
      anexacao: 68
    },
    {
      id: 2,
      nome: 'Placa Drywall Standard 12.5mm',
      categoria: 'Placas de Drywall',
      nivel1: 'Placa Drywall',
      nivel2: 'Standard',
      nivel3: '12.5mm',
      classe: 'C',
      iep: 78,
      lucro90d: 12500,
      margem: 38.5,
      giro: 18,
      anexacao: 72
    },
    {
      id: 3,
      nome: 'Torneira Monocomando Cromada',
      categoria: 'Metais',
      nivel1: 'Torneira',
      nivel2: 'Monocomando',
      nivel3: 'Cromada',
      classe: 'B',
      iep: 62,
      lucro90d: 8300,
      margem: 41.2,
      giro: 32,
      anexacao: 55
    }
  ];

  const produtosFiltrados = produtosMock.filter(p =>
    p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.categoria.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectProduct = (produto) => {
    onSelectProduct({
      ...produto,
      nivelHierarquico: nivelSelecionado,
      janelaGiro: janelaTemporalSelecionada,
      valorReal: {
        margem: `${produto.margem.toFixed(1)}%`,
        giro: `${produto.giro} dias`,
        anexacao: `${produto.anexacao}%`
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white font-glacial mb-4">
            Gerar Dossiê de Performance
          </h1>

          {/* Controles de Seleção */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Nível Hierárquico */}
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-2">
                <Layers className="w-3 h-3 inline mr-1" /> Nível Hierárquico
              </label>
              <select
                value={nivelSelecionado}
                onChange={(e) => setNivelSelecionado(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
              >
                <option value="SKU">SKU (Produto Unitário)</option>
                <option value="Nivel2">Nível 2 (Modelo/Tipo)</option>
                <option value="Nivel1">Nível 1 (Categoria)</option>
              </select>
            </div>

            {/* Janela Temporal */}
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-2">
                <Calendar className="w-3 h-3 inline mr-1" /> Período de Análise
              </label>
              <select
                value={janelaTemporalSelecionada}
                onChange={(e) => setJanelaTemporalSelecionada(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
              >
                <option value="30d">30 dias</option>
                <option value="60d">60 dias</option>
                <option value="90d">90 dias</option>
                <option value="180d">180 dias</option>
                <option value="365d">Últimos 12 meses</option>
              </select>
            </div>
          </div>

          {/* Busca */}
          <Input
            placeholder="Buscar por nome ou categoria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          />
        </div>

        {/* Lista de Produtos */}
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {produtosFiltrados.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                Nenhum produto encontrado
              </div>
            ) : (
              produtosFiltrados.map((produto) => (
                <button
                  key={produto.id}
                  onClick={() => handleSelectProduct(produto)}
                  className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-left group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">
                        {produto.nome}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {produto.categoria}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <div className="text-right">
                        <p className="font-black text-sm text-gray-900 dark:text-white">
                          Classe {produto.classe}
                        </p>
                        <p className={`text-xs font-bold ${
                          produto.iep >= 75 ? 'text-emerald-600 dark:text-emerald-400' :
                          produto.iep >= 50 ? 'text-amber-500 dark:text-amber-400' :
                          'text-rose-600 dark:text-rose-400'
                        }`}>
                          IEP {produto.iep}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition" />
                    </div>
                  </div>

                  {/* Decomposição do IEP */}
                  <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                    <div className="text-xs">
                      <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Margem</p>
                      <p className="text-gray-900 dark:text-white font-bold mt-0.5">{produto.margem.toFixed(1)}%</p>
                    </div>
                    <div className="text-xs">
                      <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Giro</p>
                      <p className="text-gray-900 dark:text-white font-bold mt-0.5">{produto.giro}d</p>
                    </div>
                    <div className="text-xs">
                      <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Anexação</p>
                      <p className="text-gray-900 dark:text-white font-bold mt-0.5">{produto.anexacao}%</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SeletorProdutoRPP;