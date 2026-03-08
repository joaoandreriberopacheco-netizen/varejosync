import React, { useState, useEffect } from 'react';
import { ChevronRight, Calendar, Layers, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

const SeletorProdutoRPP = ({ onSelectProduct, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [nivelSelecionado, setNivelSelecionado] = useState('sku');
  const [janelaTemporalSelecionada, setJanelaTemporalSelecionada] = useState('90d');
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      setCarregando(true);
      const todosProdutos = await base44.entities.Produto.list();
      
      // Estruturar produtos com seus níveis hierárquicos
      const produtosComDados = todosProdutos.map(p => ({
        id: p.id,
        nome: p.nome || 'Sem nome',
        codigo_interno: p.codigo_interno,
        categoria: p.categoria_nome || p.campo_hierarquico_1 || 'Sem categoria',
        nivel1: p.campo_hierarquico_1,
        nivel2: p.campo_hierarquico_2,
        nivel3: p.campo_hierarquico_3,
        nivel4: p.campo_hierarquico_4,
        nivel5: p.campo_hierarquico_5,
        classe: p.classe_abc || 'N/A',
        scoreIEP: p.score_iep || 0,
        lucro90d: p.lucro_90dias || 0,
        margem: p.margem_percentual || 0,
        giro: p.giro_dias || 0,
        anexacao: p.taxa_anexacao || 0
      }));
      
      setProdutos(produtosComDados);
      setErro(null);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      setErro('Erro ao carregar produtos. Tente novamente.');
      setProdutos([]);
    } finally {
      setCarregando(false);
    }
  };

  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.categoria.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.codigo_interno?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectProduct = (produto) => {
    const labelNivel = {
      'sku': 'SKU (Produto Unitário)',
      'nivel2': 'Nível 2 (Modelo/Tipo)',
      'nivel3': 'Nível 3 (Especificação)',
      'nivel1': 'Nível 1 (Categoria)',
      'nivel4': 'Nível 4 (Variante)',
      'nivel5': 'Nível 5 (Marca/Origem)'
    };

    onSelectProduct({
      ...produto,
      nivelSelecionado: nivelSelecionado,
      labelNivel: labelNivel[nivelSelecionado] || nivelSelecionado,
      janelaGiro: janelaTemporalSelecionada
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
                  <Layers className="w-3 h-3 inline mr-1" /> Nível de Análise
                </label>
                <select
                  value={nivelSelecionado}
                  onChange={(e) => setNivelSelecionado(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
                >
                  <option value="sku">SKU (Produto Unitário)</option>
                  <option value="nivel2">Nível 2 (Modelo/Tipo)</option>
                  <option value="nivel3">Nível 3 (Especificação)</option>
                  <option value="nivel4">Nível 4 (Variante)</option>
                  <option value="nivel5">Nível 5 (Marca/Origem)</option>
                  <option value="nivel1">Nível 1 (Categoria)</option>
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
             {carregando && (
               <div className="p-6 flex items-center justify-center text-gray-500 dark:text-gray-400">
                 <Loader2 className="w-4 h-4 animate-spin mr-2" />
                 Carregando produtos...
               </div>
             )}
             {erro && (
               <div className="p-6 text-center text-rose-600 dark:text-rose-400">
                 {erro}
               </div>
             )}
             {!carregando && produtosFiltrados.length === 0 && (
               <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                 Nenhum produto encontrado
               </div>
             )}
             {!carregando && produtosFiltrados.map((produto) => {
                 return (
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
                        {produto.categoria} • Código: {produto.codigo_interno}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <div className="text-right">
                           <p className="font-black text-sm text-gray-900 dark:text-white">
                             Classe {produto.classe}
                           </p>
                           <p className={`text-xs font-bold ${
                             produto.scoreIEP >= 75 ? 'text-emerald-600 dark:text-emerald-400' :
                             produto.scoreIEP >= 50 ? 'text-amber-500 dark:text-amber-400' :
                             'text-rose-600 dark:text-rose-400'
                           }`}>
                             IEP {produto.scoreIEP}
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
                  );
                  }))
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