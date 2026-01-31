import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Search, Package, Eye, Edit, Truck, Weight, Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';
import DetalhesSupermanifesto from './DetalhesSupermanifesto';
import VincularManifestosSupermanifestos from './VincularManifestosSupermanifestos';

const getStatusBadge = (status) => {
  // Glacial Palette: Subtle backgrounds, clean text
  const variants = {
    'Pendente': 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    'Em Trânsito': 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    'Recebido': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    'Cancelado': 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
  };
  return variants[status] || 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
};

export default function GestaoSupermanifestos() {
  const navigate = useNavigate();
  const [supermanifestos, setSupermanifestos] = useState([]);
  const [manifestosAguardando, setManifestosAguardando] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupermanifesto, setSelectedSupermanifesto] = useState(null);
  const [showDetalhes, setShowDetalhes] = useState(false);

  useEffect(() => {
    loadData();
    
    // Real-time subscription
    const unsubscribe = base44.entities.Supermanifesto.subscribe((event) => {
      loadData();
    });
    
    const unsubscribe2 = base44.entities.ManifestoEntrada.subscribe((event) => {
      loadData();
    });

    return () => {
      unsubscribe();
      unsubscribe2();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [smData, manifestos] = await Promise.all([
        base44.entities.Supermanifesto.list('-created_date'),
        base44.entities.ManifestoEntrada.filter({ supermanifesto_id: null })
      ]);
      setSupermanifestos(smData);
      setManifestosAguardando(manifestos || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalhes = (supermanifesto) => {
    setSelectedSupermanifesto(supermanifesto);
    setShowDetalhes(true);
  };

  const supermanifestosFiltrados = supermanifestos.filter(sm => {
    const matchSearch = sm.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       sm.transportadora_nome?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

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
      {manifestosAguardando.length > 0 && (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-0 ring-1 ring-gray-100 dark:ring-gray-700">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
               <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Manifestos Aguardando Vinculação</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                <span className="font-semibold text-blue-600 dark:text-blue-400">{manifestosAguardando.length} manifesto(s)</span> aguardando vinculação a supermanifestos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub-abas - Estilo Glacial */}
      <Tabs defaultValue="vincular" className="space-y-6">
        <TabsList className="flex w-full bg-transparent p-0 gap-4 mb-6">
          <TabsTrigger 
            value="vincular" 
            className="flex-1 rounded-xl py-3 bg-gray-50 dark:bg-gray-800/50 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-gray-100 dark:data-[state=active]:ring-gray-700 text-gray-500 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 font-medium transition-all flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4" />
            <span className="hidden sm:inline">Vincular Manifestos</span>
            <span className="sm:hidden">Vincular</span>
            {manifestosAguardando.length > 0 && (
               <div className="bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px] text-center">
                {manifestosAguardando.length}
              </div>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="lista" 
            className="flex-1 rounded-xl py-3 bg-gray-50 dark:bg-gray-800/50 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-gray-100 dark:data-[state=active]:ring-gray-700 text-gray-500 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 font-medium transition-all flex items-center justify-center gap-2"
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Visualizar Supermanifestos</span>
            <span className="sm:hidden">Visualizar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vincular" className="outline-none mt-6">
          <VincularManifestosSupermanifestos 
            manifestosAguardando={manifestosAguardando}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="lista" className="outline-none mt-6">
          {/* Filtros - Glacial: Input limpo, sem bordas pesadas */}
          <div className="relative w-full mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Buscar por número ou transportadora..." 
              className="h-12 pl-11 bg-white dark:bg-gray-800 border-0 ring-1 ring-gray-100 dark:ring-gray-700 focus-visible:ring-gray-300 dark:focus-visible:ring-gray-600 rounded-xl shadow-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>

          {/* Lista de Supermanifestos - Glacial Cards */}
          <div className="grid gap-4">
        {supermanifestosFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl ring-1 ring-gray-100 dark:ring-gray-700">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center">
               <Package className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-light">Nenhum supermanifesto encontrado</p>
          </div>
        ) : (
          supermanifestosFiltrados.map(sm => (
            <div key={sm.id} className="group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-md ring-1 ring-gray-100 dark:ring-gray-700 transition-all duration-300">
              <div className="flex flex-col gap-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-900/10 flex items-center justify-center flex-shrink-0 text-teal-600 dark:text-teal-400">
                      <Package className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{sm.numero}</span>
                        <Badge className={`font-normal rounded-full px-3 ${getStatusBadge(sm.status)}`}>
                          {sm.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Truck className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{sm.transportadora_nome}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informações Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 pt-5 border-t border-gray-50 dark:border-gray-700/50">
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      ETA
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                      {sm.eta ? format(new Date(sm.eta), 'dd/MM/yyyy HH:mm') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Package className="w-3 h-3" />
                      Volumes
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                      {sm.quantidade_volumes_estimada || 0}
                    </p>
                  </div>
                   <div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Weight className="w-3 h-3" />
                      Peso Total
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                      {sm.peso_total_bruto_kg ? sm.peso_total_bruto_kg.toFixed(2) : '0.00'} kg
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <span className="text-green-600 dark:text-green-400">$</span>
                      Valor Carga
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-bold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sm.valor_total_estimado || 0)}
                    </p>
                  </div>
                  <div className="flex items-end gap-3 justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleVerDetalhes(sm)}
                      className="h-10 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium text-sm flex items-center gap-2"
                      title="Ver Detalhes Consolidados"
                    >
                      <Eye className="w-4 h-4" />
                      Detalhes
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Detalhes */}
      {showDetalhes && selectedSupermanifesto && (
        <DetalhesSupermanifesto
          manifesto={selectedSupermanifesto}
          isOpen={showDetalhes}
          onClose={() => {
            setShowDetalhes(false);
            setSelectedSupermanifesto(null);
          }}
        />
      )}
    </div>
  );
}