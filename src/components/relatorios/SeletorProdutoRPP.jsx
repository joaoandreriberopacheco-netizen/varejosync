import React, { useState, useEffect } from 'react';
import { ChevronRight, Calendar, Layers, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

const SeletorProdutoRPP = ({ onSelectProduct, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [nivelSelecionado, setNivelSelecionado] = useState('sku');
  const [janelaTemporalSelecionada, setJanelaTemporalSelecionada] = useState('90d');
  const [produtos, setProdutos] = useState([]);
  const [produtosHierarquicos, setProdutosHierarquicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      setCarregando(true);
      const todosProdutos = await base44.entities.Produto.list();
      
      setProdutos(todosProdutos);
      construirHierarquia(todosProdutos);
      setErro(null);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      setErro('Erro ao carregar produtos. Tente novamente.');
      setProdutos([]);
    } finally {
      setCarregando(false);
    }
  };

  // Estrutura hierárquica: Nível1 > Nível2 > Nível3 > Nível4 > Nível5 (SKU)
  const construirHierarquia = (todosProdutos) => {
    const hierarquia = {};

    todosProdutos.forEach(p => {
      const nivel1 = p.campo_hierarquico_1 || 'Sem Categoria';
      const nivel2 = p.campo_hierarquico_2 || 'Geral';
      const nivel3 = p.campo_hierarquico_3 || 'Padrão';
      const nivel4 = p.campo_hierarquico_4 || 'Unitário';
      const nivel5 = p.campo_hierarquico_5 || p.marca || 'N/A';

      if (!hierarquia[nivel1]) {
        hierarquia[nivel1] = { 
          nome: nivel1, 
          tipo: 'nivel1', 
          id: `n1-${nivel1}`,
          filhos: {} 
        };
      }

      if (!hierarquia[nivel1].filhos[nivel2]) {
        hierarquia[nivel1].filhos[nivel2] = { 
          nome: nivel2, 
          tipo: 'nivel2', 
          id: `n2-${nivel1}-${nivel2}`,
          filhos: {} 
        };
      }

      if (!hierarquia[nivel1].filhos[nivel2].filhos[nivel3]) {
        hierarquia[nivel1].filhos[nivel2].filhos[nivel3] = { 
          nome: nivel3, 
          tipo: 'nivel3', 
          id: `n3-${nivel1}-${nivel2}-${nivel3}`,
          filhos: {} 
        };
      }

      if (!hierarquia[nivel1].filhos[nivel2].filhos[nivel3].filhos[nivel4]) {
        hierarquia[nivel1].filhos[nivel2].filhos[nivel3].filhos[nivel4] = { 
          nome: nivel4, 
          tipo: 'nivel4', 
          id: `n4-${nivel1}-${nivel2}-${nivel3}-${nivel4}`,
          filhos: {} 
        };
      }

      // SKU (nivel5)
      hierarquia[nivel1].filhos[nivel2].filhos[nivel3].filhos[nivel4].filhos[nivel5] = {
        tipo: 'sku',
        id: p.id,
        nome: p.nome || `${nivel1} - ${nivel2}`,
        codigo_interno: p.codigo_interno,
        classe_abc: p.classe_abc || 'N/A',
        score_iep: p.score_iep || 0,
        margem_percentual: p.margem_percentual || 0,
        giro_dias: p.giro_dias || 0,
        taxa_anexacao: p.taxa_anexacao || 0,
        produto_original: p
      };
    });

    setProdutosHierarquicos(Object.values(hierarquia));
  };

  const filtrarHierarquia = (items) => {
    const query = searchQuery.toLowerCase();
    return items
      .filter(item => {
        if (item.tipo === 'sku') {
          return (
            item.nome.toLowerCase().includes(query) ||
            item.codigo_interno?.toLowerCase().includes(query)
          );
        }
        return item.filhos && Object.values(item.filhos).some(f => filtrarHierarquia([f]).length > 0);
      })
      .map(item => {
        if (item.filhos) {
          return {
            ...item,
            filhos: Object.values(item.filhos).filter(f => 
              filtrarHierarquia([f]).length > 0
            )
          };
        }
        return item;
      });
  };

  const produtosFiltrados = searchQuery ? filtrarHierarquia(produtosHierarquicos) : produtosHierarquicos;

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectProduct = (item) => {
    const labelNivel = {
      'sku': 'SKU (Produto Unitário)',
      'nivel2': 'Nível 2 (Modelo/Tipo)',
      'nivel3': 'Nível 3 (Especificação)',
      'nivel1': 'Nível 1 (Categoria)',
      'nivel4': 'Nível 4 (Variante)',
      'nivel5': 'Nível 5 (Marca/Origem)'
    };

    onSelectProduct({
      ...item.produto_original,
      id: item.id,
      nome: item.nome,
      codigo_interno: item.codigo_interno,
      classe_abc: item.classe_abc,
      score_iep: item.score_iep,
      margem: item.margem_percentual,
      giro: item.giro_dias,
      anexacao: item.taxa_anexacao,
      nivelSelecionado: item.tipo,
      labelNivel: labelNivel[item.tipo] || item.tipo,
      janelaGiro: janelaTemporalSelecionada
    });
  };

  // Componente recursivo para renderizar hierarquia
  const RenderHierarquia = ({ items, depth = 0 }) => {
    return items.map(item => {
      const isExpanded = expandedItems[item.id];
      const hasChildren = item.filhos && Object.keys(item.filhos).length > 0;
      const isSKU = item.tipo === 'sku';

      return (
        <div key={item.id}>
          {isSKU ? (
            // Item SKU (folha)
            <button
              onClick={() => handleSelectProduct(item)}
              className="w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-left group border-l-2 border-gray-200 dark:border-gray-800 ml-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                    {item.nome}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.codigo_interno}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <div className="text-right">
                    <p className="font-black text-xs text-gray-900 dark:text-white">
                      {item.classe_abc}
                    </p>
                    <p className={`text-xs font-bold ${
                      item.score_iep >= 75 ? 'text-emerald-600 dark:text-emerald-400' :
                      item.score_iep >= 50 ? 'text-amber-500 dark:text-amber-400' :
                      'text-rose-600 dark:text-rose-400'
                    }`}>
                      {item.score_iep}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                <div className="text-xs">
                  <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Margem</p>
                  <p className="text-gray-900 dark:text-white font-bold mt-0.5">{item.margem_percentual?.toFixed(1) || 0}%</p>
                </div>
                <div className="text-xs">
                  <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Giro</p>
                  <p className="text-gray-900 dark:text-white font-bold mt-0.5">{item.giro_dias || 0}d</p>
                </div>
                <div className="text-xs">
                  <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Adesão</p>
                  <p className="text-gray-900 dark:text-white font-bold mt-0.5">{item.taxa_anexacao || 0}%</p>
                </div>
              </div>
            </button>
          ) : (
            // Item hierárquico (categoria)
            <div>
              <button
                onClick={() => toggleExpand(item.id)}
                className="w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-left flex items-center gap-2"
                style={{ paddingLeft: `${12 + depth * 12}px` }}
              >
                {hasChildren && (
                  <ChevronDown 
                    className={`w-4 h-4 text-gray-400 dark:text-gray-600 transition ${isExpanded ? 'rotate-180' : ''}`}
                  />
                )}
                {!hasChildren && <div className="w-4" />}
                <span className="font-bold text-gray-900 dark:text-white text-sm">
                  {item.nome}
                </span>
              </button>
              {isExpanded && hasChildren && (
                <RenderHierarquia 
                  items={Object.values(item.filhos)} 
                  depth={depth + 1}
                />
              )}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white font-glacial mb-4">
            Selecionar Produto para Análise de Performance
          </h1>

          {/* Controles de Seleção */}
          <div className="grid grid-cols-2 gap-4 mb-4">
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

            {/* Espaço vazio para balanceamento */}
            <div />
          </div>

          {/* Busca */}
          <Input
            placeholder="Buscar por nome ou código interno..."
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
            {!carregando && produtosFiltrados.length > 0 && (
              <RenderHierarquia items={produtosFiltrados} />
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