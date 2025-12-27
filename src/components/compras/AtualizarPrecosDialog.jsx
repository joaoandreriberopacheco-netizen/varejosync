import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.jsx";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';

export default function AtualizarPrecosDialog({ isOpen, onClose, itens, produtos }) {
  const [selecionados, setSelecionados] = useState({});
  const [processando, setProcessando] = useState(false);

  // Calcular dados de comparação para cada item
  const itensComComparacao = itens.map(item => {
    const produto = produtos.find(p => p.id === item.produto_id);
    if (!produto) return null;

    const custoAtual = produto.preco_custo_calculado || produto.valor_compra || 0;
    const novoCusto = item.custo_final_unitario || 0;
    const diferencaCusto = novoCusto - custoAtual;
    const temDiferenca = Math.abs(diferencaCusto) > 0.01;

    const markupAtual = produto.preco_venda_percentual || 40;
    const precoVendaAtual = produto.preco_venda_padrao || 0;
    const precoVendaSugerido = novoCusto * (1 + markupAtual / 100);

    return {
      ...item,
      produto,
      custoAtual,
      novoCusto,
      diferencaCusto,
      temDiferenca,
      markupAtual,
      precoVendaAtual,
      precoVendaSugerido
    };
  }).filter(Boolean);

  const qtdItensComDiferenca = itensComComparacao.filter(i => i.temDiferenca).length;

  const handleToggle = (produtoId) => {
    setSelecionados(prev => ({
      ...prev,
      [produtoId]: !prev[produtoId]
    }));
  };

  const handleSelecionarTodos = () => {
    const todos = {};
    itensComComparacao.forEach(item => {
      if (item.temDiferenca) {
        todos[item.produto_id] = true;
      }
    });
    setSelecionados(todos);
  };

  const handleAplicar = async () => {
    const itensSelecionados = itensComComparacao.filter(i => selecionados[i.produto_id]);
    
    if (itensSelecionados.length === 0) {
      toast({
        title: "Nenhum item selecionado",
        description: "Selecione ao menos um item para atualizar",
        variant: "destructive"
      });
      return;
    }

    setProcessando(true);

    try {
      for (const item of itensSelecionados) {
        await base44.entities.Produto.update(item.produto_id, {
          valor_compra: item.novoCusto,
          preco_custo_calculado: item.novoCusto,
          preco_venda_padrao: item.precoVendaSugerido
        });
      }

      toast({
        title: "✓ Preços atualizados",
        description: `${itensSelecionados.length} produto(s) atualizado(s) com sucesso`,
        className: "bg-emerald-100 text-emerald-800"
      });

      onClose(true);
    } catch (error) {
      console.error('Erro ao atualizar preços:', error);
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-teal-600" />
            Revisar Preços de Venda
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {qtdItensComDiferenca > 0 
              ? `${qtdItensComDiferenca} produto(s) com alteração de custo detectada. Revise e selecione quais preços deseja atualizar.`
              : 'Nenhuma alteração de custo detectada. Você pode revisar os preços atuais dos produtos.'}
          </p>
        </DialogHeader>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {itensComComparacao.length} produto(s) no pedido
              {qtdItensComDiferenca > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded text-[10px] font-medium">
                  {qtdItensComDiferenca} com alteração
                </span>
              )}
            </p>
            {qtdItensComDiferenca > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelecionarTodos}
                className="text-xs h-7"
              >
                Selecionar Alterados
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {itensComComparacao.map(item => (
              <div
                key={item.produto_id}
                className={`p-3 rounded-lg transition-all ${
                  item.temDiferenca
                    ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800'
                    : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-1">
                    {item.temDiferenca ? (
                      <Checkbox
                        checked={selecionados[item.produto_id] || false}
                        onCheckedChange={() => handleToggle(item.produto_id)}
                      />
                    ) : (
                      <div className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        {item.produto_nome}
                      </h4>
                      {item.temDiferenca && (
                        <div className="flex items-center gap-1 text-xs">
                          {item.diferencaCusto > 0 ? (
                            <>
                              <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                              <span className="text-red-600 dark:text-red-400 font-medium">
                                +{item.diferencaCusto.toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-3.5 h-3.5 text-green-500" />
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                {item.diferencaCusto.toFixed(2)}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-0.5">Custo Atual</p>
                        <p className="font-medium text-gray-700 dark:text-gray-300">
                          R$ {item.custoAtual.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-0.5">Novo Custo</p>
                        <p className={`font-medium ${
                          item.temDiferenca 
                            ? 'text-amber-700 dark:text-amber-400' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          R$ {item.novoCusto.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-0.5">Markup</p>
                        <p className="font-medium text-gray-700 dark:text-gray-300">
                          {item.markupAtual}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-0.5">Preço Venda Atual</p>
                        <p className="font-medium text-gray-700 dark:text-gray-300">
                          R$ {item.precoVendaAtual.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {item.temDiferenca && (
                      <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Preço de Venda Sugerido:
                          </span>
                          <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">
                            R$ {item.precoVendaSugerido.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
          <Button
            variant="outline"
            onClick={() => onClose(false)}
            disabled={processando}
          >
            {qtdItensComDiferenca > 0 ? 'Ignorar' : 'Fechar'}
          </Button>
          {qtdItensComDiferenca > 0 && (
            <Button
              onClick={handleAplicar}
              disabled={processando || Object.keys(selecionados).filter(k => selecionados[k]).length === 0}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {processando ? 'Aplicando...' : `Aplicar ${Object.keys(selecionados).filter(k => selecionados[k]).length} Selecionado(s)`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}