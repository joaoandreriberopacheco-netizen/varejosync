import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Package, Truck, AlertCircle, Search, PlusCircle, RefreshCw, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import VincularPedidosManifestos from './VincularPedidosManifestos';
import VincularManifestosSupermanifestos from './VincularManifestosSupermanifestos';

export default function GestaoManifestos() {
  const [pedidosAguardando, setPedidosAguardando] = useState([]);
  const [manifestosAguardando, setManifestosAguardando] = useState([]);
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
        p.status_aprovacao_financeira === 'Aprovado' && 
        !p.manifesto_entrada_id
      );
      
      // Buscar manifestos sem supermanifesto_id
      const manifestos = await base44.entities.ManifestoEntrada.filter({
        supermanifesto_id: null
      });

      setPedidosAguardando(pedidos || []);
      setManifestosAguardando(manifestos || []);
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
      {/* Alertas de Pendências */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {manifestosAguardando.length > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-1">Manifestos Aguardando Vinculação</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {manifestosAguardando.length} manifesto(s) aguardando vinculação a supermanifestos
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sub-abas de Gestão */}
      <Tabs defaultValue="pedidos-manifestos" className="space-y-6">
        <TabsList className="flex w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-lg h-auto p-1 gap-1">
          <TabsTrigger 
            value="pedidos-manifestos" 
            className="flex-1 border-0 rounded-md py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Pedidos → Manifestos</span>
            <span className="sm:hidden">Pedidos</span>
            {pedidosAguardando.length > 0 && (
              <Badge className="bg-amber-500 text-white ml-1 text-xs">{pedidosAguardando.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="manifestos-supermanifestos" 
            className="flex-1 border-0 rounded-md py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4" />
            <span className="hidden sm:inline">Manifestos → Supermanifestos</span>
            <span className="sm:hidden">Supermanifestos</span>
            {manifestosAguardando.length > 0 && (
              <Badge className="bg-blue-500 text-white ml-1 text-xs">{manifestosAguardando.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos-manifestos" className="outline-none mt-6">
          <VincularPedidosManifestos 
            pedidosAguardando={pedidosAguardando} 
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="manifestos-supermanifestos" className="outline-none mt-6">
          <VincularManifestosSupermanifestos 
            manifestosAguardando={manifestosAguardando}
            onRefresh={loadData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}