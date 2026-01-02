import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sparkles, TrendingUp, DollarSign, Package, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { getTenantId } from '@/components/utils/tenant';

export default function OtimizacaoEstoqueIA() {
  const [valorInvestimento, setValorInvestimento] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultados, setResultados] = useState(null);
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
      setProdutos(prods);
      setCategorias(cats);
    } catch (error) {
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (!valorInvestimento || parseFloat(valorInvestimento) <= 0) {
      toast({ title: "Valor inválido", description: "Informe o valor do investimento", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const dadosProdutos = produtos.map(p => ({
        id: p.id,
        nome: p.nome,
        categoria: categorias.find(c => c.id === p.categoria_id)?.nome || 'Sem categoria',
        custo_unitario: p.preco_custo_calculado || 0,
        tempo_reposicao_dias: p.tempo_reposicao_dias || 0,
        estoque_atual: p.estoque_atual || 0,
        tags: p.tags || []
      }));

      // Processar em lotes de 50 produtos
      const BATCH_SIZE = 50;
      const batches = [];
      for (let i = 0; i < dadosProdutos.length; i += BATCH_SIZE) {
        batches.push(dadosProdutos.slice(i, i + BATCH_SIZE));
      }

      toast({ 
        title: "🔄 Processando...", 
        description: `Analisando ${produtos.length} produtos em ${batches.length} etapas`,
        className: "bg-blue-100 text-blue-800"
      });

      const investimentoPorBatch = parseFloat(valorInvestimento) / batches.length;
      const todasClassificacoes = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        const prompt = `Você é um especialista em gestão de estoque para materiais de construção.

TAREFA: Classificar ${batch.length} produtos e distribuir R$ ${investimentoPorBatch.toFixed(2)} de investimento.

PRODUTOS (${i + 1}/${batches.length}):
${JSON.stringify(batch, null, 2)}

REGRAS:
• Categoria A (60%): Essenciais, alto giro
• Categoria B (30%): Intermediários
• Categoria C (10%): Complementares

Para CADA produto defina:
- classificacao_abc: "A", "B" ou "C"
- estoque_minimo: segurança (considere tempo_reposicao_dias)
- estoque_ideal: ponto de pedido
- estoque_maximo: limite superior
- justificativa: breve (máx 15 palavras)

RESPONDA JSON PURO:
{"produtos":[{"produto_id":"id","classificacao_abc":"A","estoque_minimo":10,"estoque_ideal":25,"estoque_maximo":50,"justificativa":"razão"}]}`;

        const response = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              produtos: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    produto_id: { type: "string" },
                    classificacao_abc: { type: "string" },
                    estoque_minimo: { type: "number" },
                    estoque_ideal: { type: "number" },
                    estoque_maximo: { type: "number" },
                    justificativa: { type: "string" }
                  }
                }
              }
            }
          }
        });

        todasClassificacoes.push(...response.produtos);
        
        toast({ 
          title: `✓ Etapa ${i + 1}/${batches.length}`, 
          description: `${todasClassificacoes.length} de ${produtos.length} produtos classificados`,
          className: "bg-blue-100 text-blue-800"
        });
      }

      // Consolidar resumo
      const countA = todasClassificacoes.filter(p => p.classificacao_abc === 'A').length;
      const countB = todasClassificacoes.filter(p => p.classificacao_abc === 'B').length;
      const countC = todasClassificacoes.filter(p => p.classificacao_abc === 'C').length;
      
      const valorTotal = todasClassificacoes.reduce((sum, p) => {
        const prod = produtos.find(pr => pr.id === p.produto_id);
        return sum + (p.estoque_ideal * (prod?.preco_custo_calculado || 0));
      }, 0);

      const resultadoFinal = {
        produtos: todasClassificacoes,
        resumo: {
          total_produtos_a: countA,
          total_produtos_b: countB,
          total_produtos_c: countC,
          valor_estimado_estoque: valorTotal
        }
      };

      setResultados(resultadoFinal);
      toast({ title: "✨ Análise Concluída!", description: `${todasClassificacoes.length} produtos classificados`, className: "bg-green-100 text-green-800" });
    } catch (error) {
      toast({ title: "Erro na otimização", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = async () => {
    if (!resultados) return;
    
    try {
      const updates = resultados.produtos.map(r => {
        const produto = produtos.find(p => p.id === r.produto_id);
        if (!produto) return null;
        
        return base44.entities.Produto.update(r.produto_id, {
          estoque_minimo: r.estoque_minimo,
          estoque_ideal: r.estoque_ideal,
          estoque_maximo: r.estoque_maximo,
          tags: [...new Set([...(produto.tags || []), `ABC-${r.classificacao_abc}`])]
        });
      }).filter(Boolean);

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
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h1 className="text-lg font-medium text-gray-900 dark:text-white">Otimização de Estoque com IA</h1>
              </div>
              <p className="text-sm text-gray-500">Classificação ABC e distribuição inteligente</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-gray-600" />
            <h3 className="font-medium text-gray-900 dark:text-white">Valor do Investimento</h3>
          </div>
          <div className="space-y-4">
            <Input
              type="number"
              placeholder="Ex: 50000"
              value={valorInvestimento}
              onChange={(e) => setValorInvestimento(e.target.value)}
              className="text-lg h-14 bg-gray-50 dark:bg-gray-900 border-0"
            />
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Package className="w-4 h-4" />
              <span>{produtos.length} produtos serão analisados</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6">
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">Como Funciona</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-start gap-2">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
              <p><strong>Classificação ABC:</strong> Produtos essenciais (A), intermediários (B) e baixo giro (C)</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
              <p><strong>Distribuição:</strong> 60% categoria A, 30% B, 10% C</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
              <p><strong>Parâmetros:</strong> Considera tempo de reposição e categorias dos produtos</p>
            </div>
          </div>
        </div>

        {!resultados ? (
          <Button 
            onClick={handleOptimize} 
            disabled={isProcessing || !valorInvestimento}
            className="w-full h-14 text-base bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Analisando com IA...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Otimizar Estoque
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="font-medium">Resumo da Análise</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                  <div className="text-2xl font-bold text-red-600">{resultados.resumo.total_produtos_a}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Produtos A</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                  <div className="text-2xl font-bold text-yellow-600">{resultados.resumo.total_produtos_b}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Produtos B</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-600">{resultados.resumo.total_produtos_c}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Produtos C</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resultados.resumo.valor_estimado_estoque)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Valor Total</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-medium">Produtos Otimizados</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
                {resultados.produtos.map(r => {
                  const produto = produtos.find(p => p.id === r.produto_id);
                  return (
                    <div key={r.produto_id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 dark:text-white">{produto?.nome}</span>
                            <Badge className={`${
                              r.classificacao_abc === 'A' ? 'bg-red-100 text-red-700' :
                              r.classificacao_abc === 'B' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {r.classificacao_abc}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">{r.justificativa}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span>Mín: <strong>{r.estoque_minimo}</strong></span>
                            <span>Ideal: <strong>{r.estoque_ideal}</strong></span>
                            <span>Máx: <strong>{r.estoque_maximo}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setResultados(null)} className="flex-1 h-12">
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