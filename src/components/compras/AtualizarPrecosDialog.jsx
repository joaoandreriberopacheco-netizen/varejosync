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
  const [precoVendaInput, setPrecoVendaInput] = useState({}); // estado local do input sem recalcular
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize edited costs from products
  useEffect(() => {
    if (isOpen && itens.length > 0) {
      const initialCosts = {};
      itens.forEach(item => {
        const produto = produtos.find(p => p.id === item.produto_id);
        if (produto) {
          const custoInicial = (item.custo_unitario || produto.valor_compra || 0)
            + (produto.custo_frete_padrao || 0)
            + (produto.custo_imposto1_padrao || 0)
            + (produto.custo_imposto2_padrao || 0)
            + (produto.custo_outros_padrao || 0)
            - (item.valor_desconto_item || produto.desconto_compra_padrao || 0);
          const markupInicial = produto.preco_venda_percentual || 40;
          const precoVendaInicial = produto.preco_venda_padrao || custoInicial * (1 + markupInicial / 100);
          initialCosts[item.produto_id] = {
            valor_compra: item.custo_unitario || produto.valor_compra || 0,
            custo_frete_padrao: produto.custo_frete_padrao || 0,
            custo_imposto1_padrao: produto.custo_imposto1_padrao || 0,
            custo_imposto2_padrao: produto.custo_imposto2_padrao || 0,
            custo_outros_padrao: produto.custo_outros_padrao || 0,
            desconto_compra_padrao: item.valor_desconto_item || produto.desconto_compra_padrao || 0,
            preco_venda_percentual: markupInicial,
            preco_venda_padrao: precoVendaInicial
          };
        }
      });
      setEditedCosts(initialCosts);
      // Inicializar inputs locais
      const inputs = {};
      Object.keys(initialCosts).forEach(id => {
        const c = initialCosts[id];
        inputs[id] = formatMoneyStatic(c.preco_venda_padrao || 0);
      });
      setPrecoVendaInput(inputs);
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

  // Handler circular: markup → recalcula preço venda
  const handleMarkupChange = (produtoId, markupValue) => {
    const markup = parseFloat(markupValue) || 0;
    setEditedCosts(prev => {
      const costs = prev[produtoId] || {};
      const valorCompra = costs.valor_compra || 0;
      const frete = costs.custo_frete_padrao || 0;
      const imp1 = costs.custo_imposto1_padrao || 0;
      const imp2 = costs.custo_imposto2_padrao || 0;
      const outros = costs.custo_outros_padrao || 0;
      const desconto = costs.desconto_compra_padrao || 0;
      const novoCusto = valorCompra + frete + imp1 + imp2 + outros - desconto;
      const novoPreco = novoCusto > 0 ? novoCusto * (1 + markup / 100) : costs.preco_venda_padrao || 0;
      // Atualiza input local também
      setPrecoVendaInput(prev2 => ({ ...prev2, [produtoId]: formatMoneyStatic(novoPreco) }));
      return {
        ...prev,
        [produtoId]: {
          ...costs,
          preco_venda_percentual: markup,
          preco_venda_padrao: novoPreco
        }
      };
    });
  };

  // Handler circular: preço venda → recalcula markup (apenas no blur)
  const handlePrecoVendaBlur = (produtoId) => {
    const precoStr = precoVendaInput[produtoId] || '0';
    const preco = parseMoney(precoStr);
    setEditedCosts(prev => {
      const costs = prev[produtoId] || {};
      const valorCompra = costs.valor_compra || 0;
      const frete = costs.custo_frete_padrao || 0;
      const imp1 = costs.custo_imposto1_padrao || 0;
      const imp2 = costs.custo_imposto2_padrao || 0;
      const outros = costs.custo_outros_padrao || 0;
      const desconto = costs.desconto_compra_padrao || 0;
      const novoCusto = valorCompra + frete + imp1 + imp2 + outros - desconto;
      const novoMarkup = novoCusto > 0 ? ((preco / novoCusto) - 1) * 100 : 0;
      return {
        ...prev,
        [produtoId]: {
          ...costs,
          preco_venda_padrao: preco,
          preco_venda_percentual: Math.max(0, novoMarkup)
        }
      };
    });
    // Normaliza display
    setPrecoVendaInput(prev => ({ ...prev, [produtoId]: formatMoneyStatic(preco) }));
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
    const precoVendaSugerido = costs.preco_venda_padrao != null
      ? costs.preco_venda_padrao
      : novoCusto * (1 + markup / 100);

    // Sync markup change → update precoVendaInput if not focused
    // (handled via handleMarkupChange)

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

  const formatMoneyStatic = (value) => {
    const num = parseFloat(value) || 0;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatMoney = formatMoneyStatic;

  const parseMoney = (str) => {
    if (!str) return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const handleMoneyChange = (produtoId, field, value) => {
    const numValue = parseMoney(value);
    handleCostChange(produtoId, field, numValue);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isMobile ? '!max-w-[100vw] !w-[100vw] h-[100vh] !rounded-none p-0' : '!max-w-[95vw]'} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader className={isMobile ? 'px-4 pt-4 pb-3' : ''}>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            Revisar Preços de Venda
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {qtdItensComDiferenca > 0 
              ? `${qtdItensComDiferenca} produto(s) com alteração de custo detectada. Revise e selecione quais preços deseja atualizar.`
              : 'Nenhuma alteração de custo detectada. Você pode revisar os preços atuais dos produtos.'}
          </p>
        </DialogHeader>

        <div className={isMobile ? 'mt-2' : 'mt-4'}>
          <div className={`flex items-center justify-between mb-3 ${isMobile ? 'px-4' : ''}`}>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {itensComComparacao.length} produto(s) no pedido
              {qtdItensComDiferenca > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded text-[10px] font-medium">
                  {qtdItensComDiferenca} com alteração
                </span>
              )}
            </p>
            {qtdItensComDiferenca > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelecionarTodos}
                className="text-xs h-7 shadow-sm"
              >
                Selecionar Alterados
              </Button>
            )}
          </div>

          {isMobile ? (
            <div className="space-y-3 px-4">
              {itensComComparacao.map(item => (
                <div
                  key={item.produto_id}
                  className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">
                        {item.produto_nome}
                      </div>
                      {item.temDiferenca && (
                        <div className="flex items-center gap-1 text-xs">
                          {item.diferencaCusto > 0 ? (
                            <>
                              <TrendingUp className="w-3 h-3 text-red-500" />
                              <span className="text-red-600 dark:text-red-400 font-medium">
                                +R$ {formatMoney(item.diferencaCusto)}
                              </span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-3 h-3 text-green-500" />
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                -R$ {formatMoney(Math.abs(item.diferencaCusto))}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {item.temDiferenca && (
                      <Checkbox
                        checked={selecionados[item.produto_id] || false}
                        onCheckedChange={() => handleToggle(item.produto_id)}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <Label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 block">Preço Compra</Label>
                      <Input
                        type="text"
                        value={formatMoney(item.costs?.valor_compra || 0)}
                        onChange={(e) => handleMoneyChange(item.produto_id, 'valor_compra', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-9 text-sm border-0 bg-gray-50 dark:bg-gray-800 shadow-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 block">Desconto</Label>
                      <Input
                        type="text"
                        value={formatMoney(item.costs?.desconto_compra_padrao || 0)}
                        onChange={(e) => handleMoneyChange(item.produto_id, 'desconto_compra_padrao', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-9 text-sm border-0 bg-gray-50 dark:bg-gray-800 shadow-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 block">Frete</Label>
                      <Input
                        type="text"
                        value={formatMoney(item.costs?.custo_frete_padrao || 0)}
                        onChange={(e) => handleMoneyChange(item.produto_id, 'custo_frete_padrao', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-9 text-sm border-0 bg-gray-50 dark:bg-gray-800 shadow-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 block">Imp 1</Label>
                      <Input
                        type="text"
                        value={formatMoney(item.costs?.custo_imposto1_padrao || 0)}
                        onChange={(e) => handleMoneyChange(item.produto_id, 'custo_imposto1_padrao', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-9 text-sm border-0 bg-gray-50 dark:bg-gray-800 shadow-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 block">Imp 2</Label>
                      <Input
                        type="text"
                        value={formatMoney(item.costs?.custo_imposto2_padrao || 0)}
                        onChange={(e) => handleMoneyChange(item.produto_id, 'custo_imposto2_padrao', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-9 text-sm border-0 bg-gray-50 dark:bg-gray-800 shadow-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 block">Outros</Label>
                      <Input
                        type="text"
                        value={formatMoney(item.costs?.custo_outros_padrao || 0)}
                        onChange={(e) => handleMoneyChange(item.produto_id, 'custo_outros_padrao', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-9 text-sm border-0 bg-gray-50 dark:bg-gray-800 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Custo Total</span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">R$ {formatMoney(item.novoCusto)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-gray-500 dark:text-gray-400 flex-shrink-0">Markup %</Label>
                      <Input
                       type="number"
                       step="0.1"
                       value={item.costs?.preco_venda_percentual || 40}
                       onChange={(e) => handleMarkupChange(item.produto_id, e.target.value)}
                       onFocus={(e) => e.target.select()}
                       className="h-9 text-sm flex-1 border-0 bg-gray-50 dark:bg-gray-800 shadow-sm"
                      />
                      </div>
                      <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-gray-500 dark:text-gray-400 flex-shrink-0">Preço Venda</Label>
                      <Input
                        type="text"
                        value={precoVendaInput[item.produto_id] ?? formatMoney(item.precoVendaSugerido)}
                        onChange={(e) => setPrecoVendaInput(prev => ({ ...prev, [item.produto_id]: e.target.value }))}
                        onFocus={(e) => e.target.select()}
                        onBlur={() => handlePrecoVendaBlur(item.produto_id)}
                        className="h-9 text-sm flex-1 border-0 bg-gray-50 dark:bg-gray-800 shadow-sm font-bold"
                      />
                      </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden shadow-sm"
>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800"
>
                <tr>
                  <th className="w-8 p-2"></th>
                  <th className="text-left p-2 min-w-[200px]">Produto</th>
                  <th className="text-center p-2 w-[100px]">Preço Compra</th>
                  <th className="text-center p-2 w-[100px]">Desconto</th>
                  <th className="text-center p-2 w-[90px]">Frete</th>
                  <th className="text-center p-2 w-[90px]">Imp 1</th>
                  <th className="text-center p-2 w-[90px]">Imp 2</th>
                  <th className="text-center p-2 w-[90px]">Outros</th>
                  <th className="text-center p-2 w-[110px] bg-gray-100 dark:bg-gray-700 font-bold">Custo Total</th>
                  <th className="text-center p-2 w-[80px]">Markup %</th>
                  <th className="text-center p-2 w-[110px] bg-gray-100 dark:bg-gray-700 font-bold">Preço Venda</th>
                </tr>
              </thead>
              <tbody>
                {itensComComparacao.map(item => (
                  <tr
                    key={item.produto_id}
                    className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="p-2 text-center">
                      {item.temDiferenca && (
                        <Checkbox
                          checked={selecionados[item.produto_id] || false}
                          onCheckedChange={() => handleToggle(item.produto_id)}
                        />
                      )}
                    </td>
                    <td className="p-2">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {item.produto_nome}
                      </div>
                      {item.temDiferenca && (
                        <div className="flex items-center gap-1 text-xs mt-0.5">
                          {item.diferencaCusto > 0 ? (
                            <>
                              <TrendingUp className="w-3 h-3 text-red-500" />
                              <span className="text-red-600 dark:text-red-400 font-medium">
                                +R$ {formatMoney(item.diferencaCusto)}
                              </span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-3 h-3 text-green-500" />
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                -R$ {formatMoney(Math.abs(item.diferencaCusto))}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        value={formatMoney(item.costs?.valor_compra || 0)}
                        onChange={(e) => handleMoneyChange(item.produto_id, 'valor_compra', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-8 text-center text-sm bg-gray-50 dark:bg-gray-800 border-0 shadow-sm"
                        placeholder="R$ 0,00"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        value={formatMoney(item.costs?.desconto_compra_padrao || 0)}
                        onChange={(e) => handleMoneyChange(item.produto_id, 'desconto_compra_padrao', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-8 text-center text-sm bg-gray-50 dark:bg-gray-800 border-0 shadow-sm"
                        placeholder="R$ 0,00"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        value={formatMoney(item.costs?.custo_frete_padrao || 0)}
                        onChange={(e) => handleMoneyChange(item.produto_id, 'custo_frete_padrao', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-8 text-center text-sm bg-gray-50 dark:bg-gray-800 border-0 shadow-sm"
                        placeholder="R$ 0,00"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        value={formatMoney(item.costs?.custo_imposto1_padrao || 0)}
                        onChange={(e) => handleMoneyChange(item.produto_id, 'custo_imposto1_padrao', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-8 text-center text-sm bg-gray-50 dark:bg-gray-800 border-0 shadow-sm"
                        placeholder="R$ 0,00"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        value={formatMoney(item.costs?.custo_imposto2_padrao || 0)}
                        onChange={(e) => handleMoneyChange(item.produto_id, 'custo_imposto2_padrao', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-8 text-center text-sm bg-gray-50 dark:bg-gray-800 border-0 shadow-sm"
                        placeholder="R$ 0,00"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        value={formatMoney(item.costs?.custo_outros_padrao || 0)}
                        onChange={(e) => handleMoneyChange(item.produto_id, 'custo_outros_padrao', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-8 text-center text-sm bg-gray-50 dark:bg-gray-800 border-0 shadow-sm"
                        placeholder="R$ 0,00"
                      />
                    </td>
                    <td className="p-2 bg-gray-50 dark:bg-gray-800">
                      <div className="text-center font-bold text-gray-900 dark:text-gray-100">
                        R$ {formatMoney(item.novoCusto)}
                      </div>
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.1"
                        value={item.costs?.preco_venda_percentual || 40}
                        onChange={(e) => handleMarkupChange(item.produto_id, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-8 text-center text-sm bg-gray-50 dark:bg-gray-800 border-0 shadow-sm"
                      />
                    </td>
                    <td className="p-2 bg-gray-50 dark:bg-gray-800">
                      <Input
                        type="text"
                        value={precoVendaInput[item.produto_id] ?? formatMoney(item.precoVendaSugerido)}
                        onChange={(e) => setPrecoVendaInput(prev => ({ ...prev, [item.produto_id]: e.target.value }))}
                        onFocus={(e) => e.target.select()}
                        onBlur={() => handlePrecoVendaBlur(item.produto_id)}
                        className="h-8 text-center text-sm bg-gray-50 dark:bg-gray-800 border-0 shadow-none font-bold"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        <div className={`flex items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 ${isMobile ? 'px-4 pb-4' : ''}`}>
          <Button
            variant="outline"
            onClick={() => onClose(false)}
            disabled={processando}
            className="border-0 shadow-sm"
          >
            {qtdItensComDiferenca > 0 ? 'Ignorar' : 'Fechar'}
          </Button>
          {qtdItensComDiferenca > 0 && (
            <Button
              onClick={handleInitiateUpdate}
              disabled={processando || Object.keys(selecionados).filter(k => selecionados[k]).length === 0}
              className="shadow-sm"
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