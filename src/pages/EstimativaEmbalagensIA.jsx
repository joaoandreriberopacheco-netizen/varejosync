import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sparkles, Package, CheckCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { getTenantId } from '@/components/utils/tenant';

export default function EstimativaEmbalagensIA() {
  const [produtos, setProdutos] = useState([]);
  const [produtosTodos, setProdutosTodos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [estimativas, setEstimativas] = useState({});
  const [modoAnalise, setModoAnalise] = useState('sem_info'); // 'sem_info' ou 'todos'
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prods, cats] = await Promise.all([
        base44.entities.Produto.filter({ tipo: 'Produto', ativo: true }),
        base44.entities.Categoria.list()
      ]);
      const prodsSemInfo = (prods || []).filter(p => !p.unidades_por_pacote || p.unidades_por_pacote === 1);
      setProdutos(prodsSemInfo);
      setProdutosTodos(prods || []);
      setCategorias(cats || []);
    } catch (error) {
      console.error("Erro ao carregar:", error);
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEstimate = async () => {
    setIsProcessing(true);
    try {
      const prodsParaAnalisar = modoAnalise === 'todos' ? produtosTodos : produtos;
      
      const dadosProdutos = prodsParaAnalisar.map(p => ({
        id: p.id,
        nome: p.nome,
        categoria: categorias.find(c => c.id === p.categoria_id)?.nome || 'Sem categoria',
        dimensoes_cm: p.dimensoes_cm,
        peso_kg: p.peso_kg,
        tags: p.tags || []
      }));

      const BATCH_SIZE = 50;
      const batches = [];
      for (let i = 0; i < dadosProdutos.length; i += BATCH_SIZE) {
        batches.push(dadosProdutos.slice(i, i + BATCH_SIZE));
      }

      const todasEstimativas = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        // Simplificar para evitar JSON muito grande
        const batchSimplificado = batch.map(p => `${p.id}|${p.nome}|${p.categoria}|Dim:${p.dimensoes_cm||'?'}|Peso:${p.peso_kg||'?'}kg`).join('\n');
        
        const prompt = `Especialista em embalagens de materiais de construção.

TAREFA: Estimar unidades/pacote para ${batch.length} produtos (${i + 1}/${batches.length}).

PRODUTOS (ID|Nome|Categoria|Dimensões|Peso):
${batchSimplificado}

PADRÕES:
- Fixadores pequenos: 50-200un
- Metais sanitários: 6-12un
- Tubos PVC: 6un
- Tintas: 12-24un
- Elétricos: 10-50un
- Grandes (vasos, caixas): 1-2un

ANALISE o NOME e estime.

JSON:
{"estimativas":[{"produto_id":"id","unidades_por_pacote":12,"justificativa":"breve"}]}`;

        const response = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              estimativas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    produto_id: { type: "string" },
                    unidades_por_pacote: { type: "number" },
                    justificativa: { type: "string" }
                  }
                }
              }
            }
          }
        });

        todasEstimativas.push(...response.estimativas);
        
        // Aguardar 2s entre batches para evitar rate limit
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      const estimativasMap = {};
      todasEstimativas.forEach(e => {
        estimativasMap[e.produto_id] = e;
      });
      setEstimativas(estimativasMap);
      toast({ title: "✨ Concluído!", description: `${todasEstimativas.length} produtos estimados`, className: "bg-green-100 text-green-800" });
    } catch (error) {
      toast({ title: "Erro na estimativa", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = async () => {
    try {
      const updates = Object.entries(estimativas).map(([produtoId, est]) => 
        base44.entities.Produto.update(produtoId, {
          unidades_por_pacote: est.unidades_por_pacote
        })
      );

      await Promise.all(updates);
      toast({ title: "✓ Aplicado com Sucesso!", description: `${updates.length} produtos atualizados`, className: "bg-green-100 text-green-800" });
      navigate(-1);
    } catch (error) {
      toast({ title: "Erro ao aplicar", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h1 className="text-lg font-medium text-gray-900 dark:text-white">Estimativa de Embalagens com IA</h1>
              </div>
              <p className="text-sm text-gray-500">Unidades por pacote de compra</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900 dark:text-white">Escopo da Análise</h3>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setModoAnalise('sem_info')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                modoAnalise === 'sem_info' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">Apenas Sem Info</div>
              <div className="text-xs text-gray-500">{produtos.length} produtos</div>
            </button>
            
            <button
              onClick={() => setModoAnalise('todos')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                modoAnalise === 'todos' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">Todos os Produtos</div>
              <div className="text-xs text-gray-500">{produtosTodos.length} produtos</div>
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-6">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">Como Funciona</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-start gap-2">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              <p>Analisa nome, categoria e características de cada produto</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              <p>Compara com padrões de mercado para o ramo de materiais de construção</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              <p>Sugere quantidade de unidades por caixa/pacote do fornecedor</p>
            </div>
          </div>
        </div>

        {Object.keys(estimativas).length === 0 ? (
          <Button 
            onClick={handleEstimate} 
            disabled={isProcessing || (modoAnalise === 'sem_info' ? produtos.length === 0 : produtosTodos.length === 0)}
            className="w-full h-14 text-base bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Analisando com IA...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Gerar Estimativas
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-medium">Estimativas Geradas</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
               {Object.entries(estimativas).map(([produtoId, est]) => {
                 const produto = produtosTodos.find(p => p.id === produtoId);
                 return (
                    <div key={produtoId} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 dark:text-white">{produto?.nome}</span>
                            <Badge className="bg-blue-100 text-blue-700">
                              {est.unidades_por_pacote} UN/pacote
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">{est.justificativa}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setEstimativas({})} className="flex-1 h-12">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refazer Análise
              </Button>
              <Button onClick={handleApply} className="flex-1 h-12 bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Aplicar aos Produtos
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}