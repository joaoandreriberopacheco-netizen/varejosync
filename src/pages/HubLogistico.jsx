import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Truck, Package, Weight, Calendar, Trash2, Eye, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import GestaoCodigosConferencia from '@/components/logistica/GestaoCodigosConferencia';

export default function HubLogistico() {
  const [manifestos, setManifestos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [manifestoSelecionado, setManifestoSelecionado] = useState(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [pedidoParaRemover, setPedidoParaRemover] = useState(null);
  const [showConfirmRemocao, setShowConfirmRemocao] = useState(false);

  useEffect(() => {
    loadManifestos();
  }, []);

  const loadManifestos = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.Supermanifesto.list('-eta');
      setManifestos(data);
    } catch (error) {
      console.error('Erro ao carregar manifestos:', error);
      toast.error('Erro ao carregar manifestos');
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalhes = (manifesto) => {
    setManifestoSelecionado(manifesto);
    setShowDetalhes(true);
  };

  const handleRemoverPedido = (manifesto, pedido) => {
    setManifestoSelecionado(manifesto);
    setPedidoParaRemover(pedido);
    setShowConfirmRemocao(true);
  };

  const confirmarRemocao = async () => {
    try {
      const pedidosAtualizados = manifestoSelecionado.pedidos_vinculados.filter(
        p => p.pedido_id !== pedidoParaRemover.pedido_id
      );

      // Se era o único pedido, perguntar se quer excluir o manifesto
      if (pedidosAtualizados.length === 0) {
        if (!confirm('Este era o único pedido do manifesto. Deseja excluir o Manifesto vazio?')) {
          setShowConfirmRemocao(false);
          return;
        }
        
        await base44.entities.Supermanifesto.delete(manifestoSelecionado.id);
        toast.success('Manifesto excluído com sucesso');
      } else {
        // Recalcular peso e observações
        const pesoTotal = pedidosAtualizados.reduce((sum, p) => sum + (p.peso_informado_kg || 0), 0);
        const observacoesConsolidadas = pedidosAtualizados
          .map(p => `${p.pedido_numero}: ${p.descritivo_volumes}`)
          .filter(o => o.trim() !== ':')
          .join(' | ');

        await base44.entities.Supermanifesto.update(manifestoSelecionado.id, {
          pedidos_vinculados: pedidosAtualizados,
          peso_total_bruto_kg: pesoTotal,
          observacoes_consolidadas: observacoesConsolidadas
        });

        toast.success('Pedido removido do manifesto');
      }

      // Resetar status do pedido
      await base44.entities.PedidoCompra.update(pedidoParaRemover.pedido_id, {
        status: 'Enviado',
        supermanifesto_id: null
      });

      setShowConfirmRemocao(false);
      setShowDetalhes(false);
      loadManifestos();

    } catch (error) {
      console.error('Erro ao remover pedido:', error);
      toast.error('Erro ao remover pedido do manifesto');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'Pendente': 'bg-yellow-100 text-yellow-800',
      'Em Trânsito': 'bg-blue-100 text-blue-800',
      'Recebido': 'bg-emerald-100 text-emerald-800',
      'Cancelado': 'bg-red-100 text-red-800'
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const manifestosFiltrados = manifestos.filter(m => 
    m.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.transportadora_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-gray-800 dark:text-gray-200">Hub Logístico Inbound</h1>
          <p className="text-sm text-gray-500">Gestão de manifestos e planejamento de recebimento</p>
        </div>
        <Button onClick={loadManifestos} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
        <Input
          placeholder="Buscar por manifesto ou transportadora..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {manifestosFiltrados.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhum manifesto encontrado</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {manifestosFiltrados.map(manifesto => (
            <div
              key={manifesto.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 hover:border-teal-200 dark:hover:border-teal-800 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{manifesto.numero}</h3>
                      <Badge className={`${getStatusBadge(manifesto.status)} border-0`}>
                        {manifesto.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{manifesto.transportadora_nome}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVerDetalhes(manifesto)}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Ver Detalhes
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-400 uppercase mb-1">ETA</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {format(parseISO(manifesto.eta), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase mb-1">Pedidos</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-gray-400" />
                    {manifesto.pedidos_vinculados?.length || 0} vinculados
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase mb-1">Peso Total</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                    <Weight className="w-3.5 h-3.5 text-gray-400" />
                    {manifesto.peso_total_bruto_kg?.toFixed(2) || 0} kg
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase mb-1">Volumes</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {manifesto.observacoes_consolidadas || 'Sem descrição'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalhes */}
      {showDetalhes && manifestoSelecionado && (
        <Dialog open={showDetalhes} onOpenChange={setShowDetalhes}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-teal-600" />
                {manifestoSelecionado.numero} - Detalhes
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Transportadora</p>
                  <p className="font-medium">{manifestoSelecionado.transportadora_nome}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <Badge className={getStatusBadge(manifestoSelecionado.status)}>
                    {manifestoSelecionado.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">ETA</p>
                  <p className="font-medium">{format(parseISO(manifestoSelecionado.eta), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Peso Total</p>
                  <p className="font-medium">{manifestoSelecionado.peso_total_bruto_kg?.toFixed(2) || 0} kg</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Pedidos Vinculados ({manifestoSelecionado.pedidos_vinculados?.length || 0})
                </h4>
                <div className="space-y-2">
                  {manifestoSelecionado.pedidos_vinculados?.map((pedido, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{pedido.pedido_numero}</p>
                        <p className="text-xs text-gray-500 mt-1">{pedido.descritivo_volumes}</p>
                        <p className="text-xs text-gray-400 mt-1">Peso: {pedido.peso_informado_kg} kg</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoverPedido(manifestoSelecionado, pedido)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {manifestoSelecionado.observacoes_consolidadas && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <h4 className="text-sm font-semibold mb-2 text-amber-900 dark:text-amber-200">
                    Descritivo Consolidado de Volumes
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {manifestoSelecionado.observacoes_consolidadas}
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold mb-3">Conferência Cega</h4>
                <div className="grid gap-3">
                  <GestaoCodigosConferencia 
                    manifesto={manifestoSelecionado} 
                    tipo="volumes"
                    onUpdate={loadManifestos}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetalhes(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Confirmação de Remoção */}
      {showConfirmRemocao && pedidoParaRemover && (
        <Dialog open={showConfirmRemocao} onOpenChange={setShowConfirmRemocao}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Confirmar Remoção
              </DialogTitle>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tem certeza que deseja remover o pedido <strong>{pedidoParaRemover.pedido_numero}</strong> deste manifesto?
              </p>
              <p className="text-xs text-gray-500 mt-2">
                O pedido voltará ao status "Enviado" e poderá ser vinculado a outro manifesto.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmRemocao(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmarRemocao} className="bg-red-600 hover:bg-red-700">
                Confirmar Remoção
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}