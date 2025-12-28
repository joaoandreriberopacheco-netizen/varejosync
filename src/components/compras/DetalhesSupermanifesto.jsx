import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, Calendar, Weight, Package as PackageIcon, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function DetalhesSupermanifesto({ manifesto, isOpen, onClose }) {
  const [pedidosComDetalhes, setPedidosComDetalhes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && manifesto) {
      loadPedidosDetalhados();
    }
  }, [isOpen, manifesto]);

  const loadPedidosDetalhados = async () => {
    if (!manifesto?.pedidos_vinculados) return;
    
    setLoading(true);
    try {
      const pedidosIds = manifesto.pedidos_vinculados.map(p => p.pedido_id);
      const pedidosCompletos = await Promise.all(
        pedidosIds.map(id => base44.entities.PedidoCompra.filter({ id }))
      );
      
      const pedidosData = pedidosCompletos
        .map(arr => arr[0])
        .filter(Boolean);
      
      setPedidosComDetalhes(pedidosData);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'Pendente': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'Em Trânsito': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'Recebido': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      'Cancelado': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  // Agrupar pedidos por fornecedor
  const pedidosPorFornecedor = pedidosComDetalhes.reduce((acc, pedido) => {
    const fornecedorId = pedido.fornecedor_id;
    if (!acc[fornecedorId]) {
      acc[fornecedorId] = {
        nome: pedido.fornecedor_nome,
        pedidos: []
      };
    }
    acc[fornecedorId].pedidos.push(pedido);
    return acc;
  }, {});

  const totalVolumes = manifesto?.pedidos_vinculados?.reduce((sum, p) => {
    const match = p.descritivo_volumes?.match(/^(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0) || 0;

  if (!manifesto) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-gray-100 dark:border-gray-700">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Truck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            {manifesto.numero} - Detalhes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Cabeçalho: Info Principal */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Transportadora</p>
              <p className="font-semibold text-gray-900 dark:text-white">{manifesto.transportadora_nome}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Status</p>
              <Badge className={`${getStatusBadge(manifesto.status)} border-0 font-medium px-2.5 py-1`}>
                {manifesto.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">ETA</p>
              <p className="font-medium text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {manifesto.eta ? format(parseISO(manifesto.eta), 'dd/MM/yyyy HH:mm') : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Peso Total</p>
              <p className="font-medium text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                <Weight className="w-3.5 h-3.5 text-gray-400" />
                {manifesto.peso_total_bruto_kg?.toFixed(2) || '0.00'} kg
              </p>
            </div>
          </div>

          {/* Total de Volumes */}
          <div className="flex items-center justify-between p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-100 dark:border-teal-800">
            <div className="flex items-center gap-2">
              <PackageIcon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-sm font-medium text-teal-900 dark:text-teal-100">Total de Volumes</span>
            </div>
            <span className="text-lg font-bold text-teal-700 dark:text-teal-300">{totalVolumes}</span>
          </div>

          {/* Pedidos Agrupados por Fornecedor */}
          <div className="space-y-5">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
              <User className="w-4 h-4" />
              Relação por Fornecedor
            </h4>
            
            {loading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Carregando detalhes...</div>
            ) : Object.keys(pedidosPorFornecedor).length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Nenhum pedido vinculado</div>
            ) : (
              <div className="space-y-5">
                {Object.values(pedidosPorFornecedor).map((fornecedor, idx) => (
                  <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    {/* Header do Fornecedor */}
                    <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="font-semibold text-gray-900 dark:text-white">{fornecedor.nome}</span>
                      </div>
                    </div>

                    {/* Pedidos do Fornecedor */}
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {fornecedor.pedidos.map((pedido) => {
                        const pedidoManifesto = manifesto.pedidos_vinculados?.find(
                          p => p.pedido_id === pedido.id
                        );
                        
                        return (
                          <div key={pedido.id} className="p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white mb-1">{pedido.numero}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {pedido.itens?.length || 0} {pedido.itens?.length === 1 ? 'item' : 'itens'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase mb-1">Peso</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {pedidoManifesto?.peso_informado_kg || 0} kg
                                </p>
                              </div>
                            </div>

                            {/* Descritivo de Volumes */}
                            {pedidoManifesto?.descritivo_volumes && (
                              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">Volumes:</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  {pedidoManifesto.descritivo_volumes}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Descritivo Consolidado (Rodapé) */}
          {manifesto.observacoes_consolidadas && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Descritivo Consolidado de Volumes
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {manifesto.observacoes_consolidadas}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <Button variant="outline" onClick={onClose} className="rounded-lg">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}