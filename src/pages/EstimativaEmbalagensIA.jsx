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
  const [categorias, setCategorias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [estimativas, setEstimativas] = useState({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const tid = getTenantId();
      const [prods, cats] = await Promise.all([
        base44.entities.Produto.filter({ empresa_id: tid, tipo: 'Produto', ativo: true }),
        base44.entities.Categoria.filter({ empresa_id: tid })
      ]);
      setProdutos(prods.filter(p => !p.unidades_por_pacote || p.unidades_por_pacote === 1));
      setCategorias(cats);
    } catch (error) {
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEstimate = async () => {
    setIsProcessing(true);
    try {
      const dadosProdutos = produtos.map(p => ({
        id: p.id,
        nome: p.nome,
        categoria: categorias.find(c => c.id === p.categoria_id)?.nome || 'Sem categoria',
        dimensoes_cm: p.dimensoes_cm,
        peso_kg: p.peso_kg,
        tags: p.tags || []
      }));

      const prompt = `Você é um especialista em logística e embalagens de produtos.

TAREFA: Estimar quantas unidades vêm por pacote/caixa de compra para cada produto.

PRODUTOS:
${JSON.stringify(dadosProdutos, null, 2)}

INSTRUÇÕES:
1. Analise o nome, categoria, dimensões e peso de cada produto
2. Estime quantas unidades vêm em uma embalagem padrão de compra do fornecedor
3. Considere padrões de mercado:
   - Parafusos/pequenos: 50-100 unidades
   - Torneiras/registros: 6-12 unidades
   - Tubos PVC: 6 unidades
   - Tintas: 12-24 latas
   - Ferramentas manuais: 6-12 unidades
   - Material elétrico pequeno: 10-50 unidades

RESPONDA APENAS COM JSON (sem markdown):
{
  "estimativas": [
    {
      "produto_id": "id",
      "unidades_por_pacote": 12,
      "justificativa": "razão da estimativa"
    }
  ]
}`;

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

      const estimativasMap = {};
      response.estimativas.forEach(e => {
        estimativasMap[e.produto_id] = e;
      });
      setEstimativas(estimativasMap);
      toast({ title: "✨ Estimativas Geradas!", className: "bg-green-100 text-green-800" });
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900 dark:text-white">Produtos sem Embalagem Definida</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{produtos.length} produtos serão analisados</span>
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
            disabled={isProcessing || produtos.length === 0}
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
                  const produto = produtos.find(p => p.id === produtoId);
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