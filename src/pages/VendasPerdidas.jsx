import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, PackagePlus, AlertTriangle, TrendingDown, RefreshCw, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { getTenantId } from '@/components/utils/tenant';

export default function VendasPerdidasPage() {
  const [vendasPerdidas, setVendasPerdidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mix');

  useEffect(() => {
    loadVendasPerdidas();
  }, []);

  const loadVendasPerdidas = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.VendaPerdida.list('-created_date');
      setVendasPerdidas(data);
    } catch (error) {
      console.error('Erro ao carregar vendas perdidas:', error);
    } finally {
      setLoading(false);
    }
  };

  const vendasMix = vendasPerdidas.filter(vp => vp.is_produto_do_mix !== false);
  const vendasNaoMix = vendasPerdidas.filter(vp => vp.is_produto_do_mix === false);

  // Agrupa produtos não-mix por nome e soma quantidades
  const produtosNaoMixAgrupados = vendasNaoMix.reduce((acc, vp) => {
    const nome = vp.nome_produto_nao_mix || 'Sem nome';
    if (!acc[nome]) {
      acc[nome] = { nome, quantidade_total: 0, registros: [] };
    }
    acc[nome].quantidade_total += vp.quantidade_desejada || 0;
    acc[nome].registros.push(vp);
    return acc;
  }, {});

  const formatValor = (valor) => {
    const num = parseFloat(valor) || 0;
    return num.toLocaleString('pt-BR');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-gray-800 dark:text-gray-200">Vendas Perdidas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Análise de oportunidades e sugestões de mix</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={loadVendasPerdidas}
          className="text-gray-500 hover:text-gray-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Total Registros</span>
          </div>
          <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200">{vendasPerdidas.length}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Produtos do Mix</span>
          </div>
          <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200">{vendasMix.length}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <PackagePlus className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Sugestões Novos</span>
          </div>
          <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200">{Object.keys(produtosNaoMixAgrupados).length}</p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Sem Estoque</span>
          </div>
          <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
            {vendasPerdidas.filter(vp => vp.motivo_perda === 'Sem Estoque').length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0 w-full justify-start">
          <TabsTrigger 
            value="mix"
            className="border-b-2 border-transparent data-[state=active]:border-gray-700 rounded-none py-3 px-4 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <Package className="w-4 h-4 mr-2" />
            Produtos do Mix ({vendasMix.length})
          </TabsTrigger>
          <TabsTrigger 
            value="nao-mix"
            className="border-b-2 border-transparent data-[state=active]:border-gray-700 rounded-none py-3 px-4 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <PackagePlus className="w-4 h-4 mr-2" />
            Sugestões de Novos Produtos ({Object.keys(produtosNaoMixAgrupados).length})
          </TabsTrigger>
        </TabsList>

        {/* Tab Produtos do Mix */}
        <TabsContent value="mix" className="mt-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : vendasMix.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum registro de venda perdida de produtos do mix</p>
            </div>
          ) : (
            <div className="space-y-2">
              {vendasMix.map((vp) => (
                <div key={vp.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800 dark:text-gray-200">
                        {vp.produto_consultado_nome || 'Produto não identificado'}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {vp.created_date ? format(new Date(vp.created_date), 'dd/MM/yyyy HH:mm') : '-'}
                        </span>
                        <span>Qtd: {formatValor(vp.quantidade_desejada)}</span>
                        {vp.vendedor_nome && <span>Vendedor: {vp.vendedor_nome}</span>}
                      </div>
                      {vp.observacao && (
                        <p className="text-xs text-gray-400 mt-2 italic">{vp.observacao}</p>
                      )}
                    </div>
                    <Badge 
                      className={`text-xs ${
                        vp.motivo_perda === 'Sem Estoque' ? 'bg-red-100 text-red-700' :
                        vp.motivo_perda === 'Preço Alto' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {vp.motivo_perda}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab Sugestões de Novos Produtos */}
        <TabsContent value="nao-mix" className="mt-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : Object.keys(produtosNaoMixAgrupados).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <PackagePlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhuma sugestão de novo produto registrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.values(produtosNaoMixAgrupados)
                .sort((a, b) => b.quantidade_total - a.quantidade_total)
                .map((item, idx) => (
                <div key={idx} className="p-4 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800 dark:text-gray-200">{item.nome}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span>{item.registros.length} solicitação(ões)</span>
                        <span>Total: {formatValor(item.quantidade_total)} un.</span>
                      </div>
                      {/* Lista de registros */}
                      <div className="mt-3 space-y-1">
                        {item.registros.slice(0, 3).map((reg, i) => (
                          <div key={i} className="text-xs text-gray-400 flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            {reg.created_date ? format(new Date(reg.created_date), 'dd/MM/yyyy') : '-'}
                            <span>- Qtd: {reg.quantidade_desejada}</span>
                            {reg.vendedor_nome && <span>({reg.vendedor_nome})</span>}
                          </div>
                        ))}
                        {item.registros.length > 3 && (
                          <p className="text-xs text-gray-400">+ {item.registros.length - 3} mais registros</p>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 text-xs">
                      Sugestão
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}