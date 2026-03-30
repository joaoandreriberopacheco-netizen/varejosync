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
    <div className="space-y-3">
      {pedidosAguardando.length > 0 && (
        <div className="px-4 py-3 bg-white dark:bg-gray-800 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Pedidos aguardando vinculação</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-orange-600 dark:text-orange-400">{pedidosAguardando.length}</span> item(ns) pendente(s).
              </p>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="vincular-pedidos" className="space-y-3">
        <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 gap-2 mb-1">
          <TabsTrigger 
            value="vincular-pedidos" 
            className="rounded-2xl h-12 px-3 bg-gray-100 dark:bg-gray-800/60 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm text-gray-500 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 font-medium transition-all flex items-center justify-center gap-2"
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
            className="rounded-2xl h-12 px-3 bg-gray-100 dark:bg-gray-800/60 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm text-gray-500 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 font-medium transition-all flex items-center justify-center gap-2"
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