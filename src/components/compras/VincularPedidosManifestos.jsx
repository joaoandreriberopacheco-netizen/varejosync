import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Package, User, DollarSign, Calendar, PlusCircle, CheckCircle, AlertTriangle, Search, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function VincularPedidosManifestos({ pedidosAguardando, onRefresh }) {
  const [selectedPedidos, setSelectedPedidos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const pedidosFiltrados = pedidosAguardando.filter(p => 
    p.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.fornecedor_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupar por fornecedor
  const pedidosPorFornecedor = pedidosFiltrados.reduce((acc, pedido) => {
    const fornecedorId = pedido.fornecedor_id;
    if (!acc[fornecedorId]) {
      acc[fornecedorId] = {
        fornecedor_id: fornecedorId,
        fornecedor_nome: pedido.fornecedor_nome,
        pedidos: []
      };
    }
    acc[fornecedorId].pedidos.push(pedido);
    return acc;
  }, {});

  const grupos = Object.values(pedidosPorFornecedor);

  const togglePedido = (pedidoId) => {
    setSelectedPedidos(prev => 
      prev.includes(pedidoId) 
        ? prev.filter(id => id !== pedidoId)
        : [...prev, pedidoId]
    );
  };

  const handleVincular = () => {
    if (selectedPedidos.length === 0) {
      toast.error('Selecione pelo menos um pedido');
      return;
    }
    setShowConfirm(true);
  };

  const confirmarVinculacao = async () => {
    console.log('Iniciando vinculação, pedidos selecionados:', selectedPedidos);
    
    if (selectedPedidos.length === 0) {
      toast.error('Selecione pelo menos um pedido');
      setShowConfirm(false);
      return;
    }

    try {
      toast.loading('Criando manifesto...');
      
      // Buscar os pedidos selecionados
      const pedidosSelecionadosData = pedidosAguardando.filter(p => selectedPedidos.includes(p.id));
      console.log('Pedidos encontrados:', pedidosSelecionadosData);
      
      if (pedidosSelecionadosData.length === 0) {
        toast.error('Nenhum pedido encontrado');
        setShowConfirm(false);
        return;
      }
      
      // Verificar se todos são do mesmo fornecedor
      const fornecedorIds = [...new Set(pedidosSelecionadosData.map(p => p.fornecedor_id))];
      if (fornecedorIds.length > 1) {
        toast.error('Todos os pedidos devem ser do mesmo fornecedor');
        setShowConfirm(false);
        return;
      }

      const fornecedorId = fornecedorIds[0];
      const fornecedorNome = pedidosSelecionadosData[0].fornecedor_nome;

      // Gerar número do manifesto
      const todosManifestos = await base44.entities.ManifestoEntrada.list();
      const numero = `ME-${String(todosManifestos.length + 1).padStart(5, '0')}`;
      console.log('Número do manifesto:', numero);

      // Criar um único ManifestoEntrada para os pedidos selecionados
      const itensEsperados = [];
      
      for (const pedido of pedidosSelecionadosData) {
        for (const item of pedido.itens || []) {
          const existente = itensEsperados.find(ie => ie.produto_id === item.produto_id);
          if (existente) {
            existente.quantidade_esperada += (item.quantidade || 0);
          } else {
            itensEsperados.push({
              produto_id: item.produto_id,
              produto_nome: item.produto_nome,
              quantidade_esperada: item.quantidade || 0,
              quantidade_conferida: 0,
              divergencia: false
            });
          }
        }
      }

      console.log('Criando manifesto com itens:', itensEsperados);

      const novoManifesto = await base44.entities.ManifestoEntrada.create({
        numero,
        pedido_compra_id: pedidosSelecionadosData[0].id,
        pedido_numero: pedidosSelecionadosData[0].numero,
        fornecedor_id: fornecedorId,
        fornecedor_nome: fornecedorNome,
        data_recebimento: new Date().toISOString(),
        status: 'Aguardando Conferência',
        itens_esperados: itensEsperados
      });

      console.log('Manifesto criado:', novoManifesto);

      // Atualizar todos os pedidos com o manifesto_entrada_id
      await Promise.all(
        pedidosSelecionadosData.map(pedido =>
          base44.entities.PedidoCompra.update(pedido.id, {
            manifesto_entrada_id: novoManifesto.id,
            status: 'Em Trânsito'
          })
        )
      );

      console.log('Pedidos atualizados com sucesso');
      toast.dismiss();
      toast.success(`Manifesto ${numero} criado com sucesso!`);
      setSelectedPedidos([]);
      setShowConfirm(false);
      await onRefresh();
    } catch (error) {
      console.error('Erro completo ao vincular:', error);
      toast.dismiss();
      toast.error(`Erro ao criar manifesto: ${error.message}`);
      setShowConfirm(false);
    }
  };

  const formatValor = (valor) => {
    return (valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar por Nº ou fornecedor..." 
            className="pl-9 bg-gray-50 border-0 shadow-sm" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
        <Button 
          onClick={handleVincular} 
          disabled={selectedPedidos.length === 0}
          className="bg-teal-600 hover:bg-teal-700 gap-2 shadow-sm"
        >
          <CheckCircle className="w-4 h-4" />
          Criar Manifesto ({selectedPedidos.length})
        </Button>
      </div>

      {grupos.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhum pedido aguardando vinculação</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(grupo => (
            <div key={grupo.fornecedor_id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                      <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{grupo.fornecedor_nome}</h3>
                      <p className="text-xs text-gray-500">{grupo.pedidos.length} pedido(s)</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const todosSelecionados = grupo.pedidos.every(p => selectedPedidos.includes(p.id));
                      if (todosSelecionados) {
                        setSelectedPedidos(prev => prev.filter(id => !grupo.pedidos.map(p => p.id).includes(id)));
                      } else {
                        setSelectedPedidos(prev => [...new Set([...prev, ...grupo.pedidos.map(p => p.id)])]);
                      }
                    }}
                    className="gap-2 border-0 shadow-sm"
                  >
                    {grupo.pedidos.every(p => selectedPedidos.includes(p.id)) ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {grupo.pedidos.map(pedido => {
                  const isSelected = selectedPedidos.includes(pedido.id);
                  return (
                    <div
                      key={pedido.id}
                      onClick={() => togglePedido(pedido.id)}
                      className={`p-4 cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-teal-50 dark:bg-teal-900/20 border-l-4 border-teal-500' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          isSelected 
                            ? 'bg-teal-600 border-teal-600' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Número</p>
                            <p className="font-medium text-gray-900 dark:text-white">{pedido.numero}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Criação</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {pedido.created_date ? format(parseISO(pedido.created_date), 'dd/MM/yyyy') : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Itens</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{pedido.itens?.length || 0}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Total</p>
                            <p className="font-bold text-gray-900 dark:text-white">R$ {formatValor(pedido.valor_total)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              Criar Manifesto de Entrada
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Será criado um novo <strong>Manifesto de Entrada</strong> agrupando os {selectedPedidos.length} pedido(s) selecionado(s).
            </p>
            <p className="text-xs text-gray-500 mt-3">
              Os itens de todos os pedidos serão consolidados no manifesto para conferência única.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="border-0 shadow-sm">
              Cancelar
            </Button>
            <Button onClick={confirmarVinculacao} className="bg-teal-600 hover:bg-teal-700">
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}