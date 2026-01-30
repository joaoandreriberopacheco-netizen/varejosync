import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Package, Truck, AlertCircle, Search, PlusCircle, RefreshCw, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import VincularPedidosManifestos from './VincularPedidosManifestos';
import VolumetrizacaoManifestos from './VolumetrizacaoManifestos';

export default function GestaoManifestos() {
  const [pedidosAguardando, setPedidosAguardando] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Buscar pedidos aprovados sem manifesto_entrada_id
      const todosPedidos = await base44.entities.PedidoCompra.list();
      const pedidos = todosPedidos.filter(p => 
        p.status === 'Aprovado' && 
        p.status_aprovacao_financeira === 'Aprovado' &&
        !p.manifesto_entrada_id
      );

      setPedidosAguardando(pedidos || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta de Pendências */}
      {pedidosAguardando.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900 dark:text-amber-200 mb-1">Pedidos Aguardando Vinculação</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {pedidosAguardando.length} pedido(s) aprovado(s) aguardando vinculação a manifestos
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub-abas de Gestão */}
      <Tabs defaultValue="vincular-pedidos" className="space-y-6">
        <TabsList className="flex w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-lg h-auto p-1 gap-1">
          <TabsTrigger 
            value="vincular-pedidos" 
            className="flex-1 border-0 rounded-md py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Vincular Pedidos</span>
            <span className="sm:hidden">Vincular</span>
            {pedidosAguardando.length > 0 && (
              <Badge className="bg-amber-500 text-white ml-1 text-xs">{pedidosAguardando.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="volumetrizacao" 
            className="flex-1 border-0 rounded-md py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Volumetrização</span>
            <span className="sm:hidden">Volumes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vincular-pedidos" className="outline-none mt-6">
          <VincularPedidosManifestos 
            pedidosAguardando={pedidosAguardando} 
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="volumetrizacao" className="outline-none mt-6">
          <VolumetrizacaoManifestos />
        </TabsContent>
      </Tabs>
    </div>
  );
}