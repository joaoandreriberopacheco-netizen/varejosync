import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Package, User, Search, CheckCircle, Minus, Plus, ShoppingCart, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function VincularPedidosSupermanifesto({ supermanifesto, isOpen, onClose, onSuccess }) {
  const [pedidosDisponiveis, setPedidosDisponiveis] = useState([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [quantidades, setQuantidades] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (isOpen && supermanifesto) {
      loadPedidos();
    }
  }, [isOpen, supermanifesto]);

  const loadPedidos = async () => {
    try {
      setLoading(true);
      // Buscar pedidos aprovados da mesma transportadora
      const todosPedidos = await base44.entities.PedidoCompra.list();
      const pedidos = todosPedidos.filter(p => 
        p.status === 'Aprovado' && 
        p.status_aprovacao_financeira === 'Aprovado' &&
        p.fornecedor_id === supermanifesto.transportadora_id
      );

      setPedidosDisponiveis(pedidos || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const pedidosFiltrados = pedidosDisponiveis.filter(p => 
    p.numero?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selecionarPedido = (pedido) => {
    setPedidoSelecionado(pedido);
    
    // Inicializar quantidades com o disponível de cada item
    const qtds = {};
    pedido.itens?.forEach(item => {
      const disponivel = (item.quantidade || 0) - (item.quantidade_vinculada || 0);
      qtds[item.produto_id] = disponivel;
    });
    setQuantidades(qtds);
  };

  const voltar = () => {
    setPedidoSelecionado(null);
    setQuantidades({});
  };

  const ajustarQuantidade = (produtoId, delta) => {
    setQuantidades(prev => {
      const item = pedidoSelecionado.itens.find(i => i.produto_id === produtoId);
      const disponivel = (item.quantidade || 0) - (item.quantidade_vinculada || 0);
      const atual = prev[produtoId] || 0;
      const nova = Math.max(0, Math.min(disponivel, atual + delta));
      return { ...prev, [produtoId]: nova };
    });
  };

  const setQuantidadeInput = (produtoId, valor) => {
    const item = pedidoSelecionado.itens.find(i => i.produto_id === produtoId);
    const disponivel = (item.quantidade || 0) - (item.quantidade_vinculada || 0);
    const nova = Math.max(0, Math.min(disponivel, parseFloat(valor) || 0));
    setQuantidades(prev => ({ ...prev, [produtoId]: nova }));
  };

  const confirmarVinculacao = async () => {
    try {
      // Validar que ao menos um item tem quantidade > 0
      const itensVinculados = Object.entries(quantidades)
        .filter(([_, qtd]) => qtd > 0)
        .map(([produto_id, quantidade_despachada]) => {
          const item = pedidoSelecionado.itens.find(i => i.produto_id === produto_id);
          return {
            produto_id,
            produto_nome: item.produto_nome,
            quantidade_despachada
          };
        });

      if (itensVinculados.length === 0) {
        toast.error('Selecione ao menos um item com quantidade maior que zero');
        return;
      }

      setSalvando(true);

      // Invocar função backend para vincular
      const response = await base44.functions.invoke('vincularItensPedidoAManifesto', {
        supermanifesto_id: supermanifesto.id,
        pedido_id: pedidoSelecionado.id,
        itens_vinculados: itensVinculados
      });

      if (response.data.success) {
        toast.success('Itens vinculados ao manifesto com sucesso!');
        onSuccess();
        onClose();
      } else {
        toast.error(response.data.error || 'Erro ao vincular itens');
      }
    } catch (error) {
      console.error('Erro ao vincular:', error);
      toast.error('Erro ao vincular itens ao manifesto');
    } finally {
      setSalvando(false);
    }
  };

  const getTotalSelecionado = () => {
    if (!pedidoSelecionado) return 0;
    return Object.entries(quantidades).reduce((acc, [produtoId, qtd]) => {
      const item = pedidoSelecionado.itens.find(i => i.produto_id === produtoId);
      return acc + (qtd * (item?.custo_unitario || 0));
    }, 0);
  };

  const formatValor = (valor) => {
    return (valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 dark:bg-gray-900 dark:border-gray-800">
        {!pedidoSelecionado ? (
          <>
            {/* Header */}
            <DialogHeader className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
              <DialogTitle className="text-xl font-light text-gray-900 dark:text-gray-100">
                Vincular Pedidos ao Manifesto {supermanifesto?.numero}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Selecione um pedido para definir quantidades parciais
              </p>
            </DialogHeader>

            {/* Search */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Buscar por número do pedido..." 
                  className="pl-9 bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-12 text-base" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>

            {/* Lista de pedidos */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-teal-600 rounded-full mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-3">Carregando pedidos...</p>
                </div>
              ) : pedidosFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                  <p className="text-gray-500 dark:text-gray-400">Nenhum pedido disponível para vincular</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pedidosFiltrados.map(pedido => {
                    const totalItens = pedido.itens?.reduce((acc, item) => {
                      const disponivel = (item.quantidade || 0) - (item.quantidade_vinculada || 0);
                      return acc + disponivel;
                    }, 0) || 0;

                    return (
                      <button
                        key={pedido.id}
                        onClick={() => selecionarPedido(pedido)}
                        className="w-full p-5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-700 transition-all text-left shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                              <Package className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-gray-900 dark:text-white text-lg">{pedido.numero}</span>
                                {totalItens === 0 && (
                                  <Badge className="bg-gray-100 text-gray-600 text-xs">Totalmente Vinculado</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-1">
                                  <Package className="w-3.5 h-3.5" />
                                  <span>{pedido.itens?.length || 0} itens</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                  <span>{totalItens} disponível</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Valor Total</p>
                            <p className="font-bold text-gray-900 dark:text-white text-lg">R$ {formatValor(pedido.valor_total)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="p-6 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button variant="outline" onClick={onClose} className="min-h-[48px] px-6 border-0 shadow-sm">
                Fechar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Header - Detalhe do Pedido */}
            <DialogHeader className="p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <Button variant="ghost" onClick={voltar} size="sm" className="h-8 w-8 p-0">
                  ←
                </Button>
                <DialogTitle className="text-xl font-light text-gray-900 dark:text-gray-100">
                  {pedidoSelecionado.numero}
                </DialogTitle>
              </div>
              <p className="text-sm text-gray-500">
                Defina as quantidades de cada item para este manifesto
              </p>
            </DialogHeader>

            {/* Lista de itens com quantidades */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-3">
                {pedidoSelecionado.itens?.map(item => {
                  const disponivel = (item.quantidade || 0) - (item.quantidade_vinculada || 0);
                  const selecionado = quantidades[item.produto_id] || 0;

                  return (
                    <div 
                      key={item.produto_id} 
                      className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-1">{item.produto_nome}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span>Total: {item.quantidade}</span>
                            {item.quantidade_vinculada > 0 && (
                              <span className="text-orange-600 dark:text-orange-400">Vinculado: {item.quantidade_vinculada}</span>
                            )}
                            <span className="text-teal-600 dark:text-teal-400 font-medium">Disponível: {disponivel}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Custo Unit.</p>
                          <p className="font-medium text-gray-900 dark:text-white">R$ {formatValor(item.custo_unitario)}</p>
                        </div>
                      </div>

                      {/* Controle de Quantidade - PDV Style */}
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => ajustarQuantidade(item.produto_id, -1)}
                          disabled={selecionado <= 0}
                          className="h-12 w-12 rounded-xl border-2 disabled:opacity-30 dark:border-gray-700"
                        >
                          <Minus className="w-5 h-5" />
                        </Button>
                        
                        <Input
                          type="number"
                          value={selecionado}
                          onChange={(e) => setQuantidadeInput(item.produto_id, e.target.value)}
                          className="h-12 text-center text-lg font-bold border-2 dark:bg-gray-900 dark:border-gray-700"
                          min="0"
                          max={disponivel}
                        />
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => ajustarQuantidade(item.produto_id, 1)}
                          disabled={selecionado >= disponivel}
                          className="h-12 w-12 rounded-xl border-2 disabled:opacity-30 dark:border-gray-700"
                        >
                          <Plus className="w-5 h-5" />
                        </Button>

                        <div className="ml-auto text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Subtotal</p>
                          <p className="font-bold text-gray-900 dark:text-white">R$ {formatValor(selecionado * item.custo_unitario)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer com Total */}
            <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <div className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Selecionado</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">R$ {formatValor(getTotalSelecionado())}</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={voltar} className="min-h-[48px] px-6 border-0 shadow-sm">
                    Voltar
                  </Button>
                  <Button 
                    onClick={confirmarVinculacao} 
                    disabled={salvando || getTotalSelecionado() === 0}
                    className="bg-teal-600 hover:bg-teal-700 min-h-[48px] px-8 shadow-sm"
                  >
                    {salvando ? 'Vinculando...' : 'Confirmar Vínculo'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}