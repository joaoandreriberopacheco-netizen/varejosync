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
      {/* Alerta de Pendências - Estilo Glacial */}
      {pedidosAguardando.length > 0 && (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-0 ring-1 ring-gray-100 dark:ring-gray-700">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
               <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Pedidos Aguardando Vinculação</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                <span className="font-semibold text-orange-600 dark:text-orange-400">{pedidosAguardando.length} pedido(s)</span> aprovado(s) aguardando vinculação a manifestos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub-abas de Gestão - Estilo Glacial */}
      <Tabs defaultValue="vincular-pedidos" className="space-y-6">
        <TabsList className="flex w-full bg-transparent p-0 gap-4 mb-6">
          <TabsTrigger 
            value="vincular-pedidos" 
            className="flex-1 rounded-xl py-3 bg-gray-50 dark:bg-gray-800/50 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-gray-100 dark:data-[state=active]:ring-gray-700 text-gray-500 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 font-medium transition-all flex items-center justify-center gap-2"
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Vincular Pedidos</span>
            <span className="sm:hidden">Vincular</span>
            {pedidosAguardando.length > 0 && (
              <div className="bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px] text-center">
                {pedidosAguardando.length}
              </div>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="volumetrizacao" 
            className="flex-1 rounded-xl py-3 bg-gray-50 dark:bg-gray-800/50 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-gray-100 dark:data-[state=active]:ring-gray-700 text-gray-500 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 font-medium transition-all flex items-center justify-center gap-2"
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