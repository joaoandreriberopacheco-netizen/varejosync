import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import OperacaoAuthenticator from '@/components/auth/OperacaoAuthenticator';
import { format } from 'date-fns';

export default function AtualizarPrecosDialog({ isOpen, onClose, itens, produtos }) {
  const [selecionados, setSelecionados] = useState({});
  const [processando, setProcessando] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [editedCosts, setEditedCosts] = useState({});

  // Initialize edited costs from products
  useEffect(() => {
    if (isOpen && itens.length > 0) {
      const initialCosts = {};
      itens.forEach(item => {
        const produto = produtos.find(p => p.id === item.produto_id);
        if (produto) {
          initialCosts[item.produto_id] = {
            valor_compra: item.custo_unitario || produto.valor_compra || 0,
            custo_frete_padrao: produto.custo_frete_padrao || 0,
            custo_imposto1_padrao: produto.custo_imposto1_padrao || 0,
            custo_imposto2_padrao: produto.custo_imposto2_padrao || 0,
            custo_outros_padrao: produto.custo_outros_padrao || 0,
            desconto_compra_padrao: item.valor_desconto_item || produto.desconto_compra_padrao || 0,
            preco_venda_percentual: produto.preco_venda_percentual || 40,
            preco_venda_padrao: produto.preco_venda_padrao || 0
          };
        }
      });
      setEditedCosts(initialCosts);
    }
  }, [isOpen, itens, produtos]);

  const handleCostChange = (produtoId, field, value) => {
    setEditedCosts(prev => ({
      ...prev,
      [produtoId]: {
        ...prev[produtoId],
        [field]: parseFloat(value) || 0
      }
    }));
  };

  // Calcular dados de comparação para cada item com custos editáveis
  const itensComComparacao = itens.map(item => {
    const produto = produtos.find(p => p.id === item.produto_id);
    if (!produto) return null;

    const costs = editedCosts[item.produto_id] || {};
    const valorCompra = costs.valor_compra || item.custo_unitario || produto.valor_compra || 0;
    const frete = costs.custo_frete_padrao || 0;
    const imp1 = costs.custo_imposto1_padrao || 0;
    const imp2 = costs.custo_imposto2_padrao || 0;
    const outros = costs.custo_outros_padrao || 0;
    const desconto = costs.desconto_compra_padrao || 0;
    
    const novoCusto = valorCompra + frete + imp1 + imp2 + outros - desconto;
    const custoAtual = produto.preco_custo_calculado || produto.valor_compra || 0;
    const diferencaCusto = novoCusto - custoAtual;
    const temDiferenca = Math.abs(diferencaCusto) > 0.01;

    const markup = costs.preco_venda_percentual || 40;
    const precoVendaAtual = produto.preco_venda_padrao || 0;
    const precoVendaSugerido = novoCusto * (1 + markup / 100);

    return {
      ...item,
      produto,
      custoAtual,
      novoCusto,
      diferencaCusto,
      temDiferenca,
      markup,
      precoVendaAtual,
      precoVendaSugerido,
      costs
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

  const handleInitiateUpdate = () => {
    const itensSelecionados = itensComComparacao.filter(i => selecionados[i.produto_id]);
    
    if (itensSelecionados.length === 0) {
      toast({
        title: "Nenhum item selecionado",
        description: "Selecione ao menos um item para atualizar",
        variant: "destructive"
      });
      return;
    }

    setPendingUpdate(itensSelecionados);
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = async (authData) => {
    if (!pendingUpdate) return;
    
    setProcessando(true);

    try {
      for (const item of pendingUpdate) {
        const costs = editedCosts[item.produto_id];
        await base44.entities.Produto.update(item.produto_id, {
          valor_compra: costs.valor_compra,
          custo_frete_padrao: costs.custo_frete_padrao,
          custo_imposto1_padrao: costs.custo_imposto1_padrao,
          custo_imposto2_padrao: costs.custo_imposto2_padrao,
          custo_outros_padrao: costs.custo_outros_padrao,
          desconto_compra_padrao: costs.desconto_compra_padrao,
          preco_custo_calculado: item.novoCusto,
          preco_venda_percentual: costs.preco_venda_percentual,
          preco_venda_padrao: item.precoVendaSugerido
        });
      }

      toast({
        title: "✓ Preços atualizados",
        description: `${pendingUpdate.length} produto(s) atualizado(s) com sucesso [Auth: ${authData.intervenienteName}]`,
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
      setPendingUpdate(null);
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

                    <div className="space-y-3 mt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[10px] text-gray-500 dark:text-gray-400">Preço Compra</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.costs?.valor_compra || 0}
                            onChange={(e) => handleCostChange(item.produto_id, 'valor_compra', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-500 dark:text-gray-400">Desconto</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.costs?.desconto_compra_padrao || 0}
                            onChange={(e) => handleCostChange(item.produto_id, 'desconto_compra_padrao', e.target.value)}
                            className="h-8 text-sm text-green-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label className="text-[10px] text-gray-500 dark:text-gray-400">Frete (Un)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.costs?.custo_frete_padrao || 0}
                            onChange={(e) => handleCostChange(item.produto_id, 'custo_frete_padrao', e.target.value)}
                            className="h-8 text-sm text-blue-600"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-500 dark:text-gray-400">Imp 1 (Un)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.costs?.custo_imposto1_padrao || 0}
                            onChange={(e) => handleCostChange(item.produto_id, 'custo_imposto1_padrao', e.target.value)}
                            className="h-8 text-sm text-orange-600"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-500 dark:text-gray-400">Imp 2 (Un)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.costs?.custo_imposto2_padrao || 0}
                            onChange={(e) => handleCostChange(item.produto_id, 'custo_imposto2_padrao', e.target.value)}
                            className="h-8 text-sm text-orange-600"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-500 dark:text-gray-400">Outros (Un)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.costs?.custo_outros_padrao || 0}
                            onChange={(e) => handleCostChange(item.produto_id, 'custo_outros_padrao', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div>
                          <Label className="text-[10px] text-gray-500 dark:text-gray-400">Custo Total</Label>
                          <div className="h-8 flex items-center px-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-bold">
                            R$ {item.novoCusto.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-500 dark:text-gray-400">Markup %</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={item.costs?.preco_venda_percentual || 40}
                            onChange={(e) => handleCostChange(item.produto_id, 'preco_venda_percentual', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-500 dark:text-gray-400">Preço Venda</Label>
                          <div className="h-8 flex items-center px-2 bg-teal-50 dark:bg-teal-900/20 rounded text-sm font-bold text-teal-700 dark:text-teal-400">
                            R$ {item.precoVendaSugerido.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
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
              onClick={handleInitiateUpdate}
              disabled={processando || Object.keys(selecionados).filter(k => selecionados[k]).length === 0}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {processando ? 'Aplicando...' : `Autenticar e Aplicar ${Object.keys(selecionados).filter(k => selecionados[k]).length} Selecionado(s)`}
            </Button>
          )}
        </div>

        <OperacaoAuthenticator 
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={handleAuthSuccess}
          operationName="Atualizar Custos e Preços de Venda"
        />
      </DialogContent>
    </Dialog>
  );
}