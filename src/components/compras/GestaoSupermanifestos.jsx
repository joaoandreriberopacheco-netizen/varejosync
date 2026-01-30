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
  const variants = {
    'Pendente': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'Em Trânsito': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'Recebido': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'Cancelado': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };
  return variants[status] || 'bg-gray-100 text-gray-800';
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

  const handleDiscriminarVolumes = (supermanifesto) => {
    navigate(createPageUrl(`DiscriminarVolumes?id=${supermanifesto.id}&tipo=supermanifesto`));
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
      {/* Alerta de Pendências */}
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

      {/* Sub-abas */}
      <Tabs defaultValue="vincular" className="space-y-6">
        <TabsList className="flex w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-lg h-auto p-1 gap-1">
          <TabsTrigger 
            value="vincular" 
            className="flex-1 border-0 rounded-md py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4" />
            <span className="hidden sm:inline">Vincular Manifestos</span>
            <span className="sm:hidden">Vincular</span>
            {manifestosAguardando.length > 0 && (
              <Badge className="bg-blue-500 text-white ml-1 text-xs">{manifestosAguardando.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="lista" 
            className="flex-1 border-0 rounded-md py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm text-sm font-medium transition-all flex items-center justify-center gap-2"
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
          {/* Filtros */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-100 dark:border-gray-700 shadow-sm mb-6">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Buscar por número ou transportadora..." 
                className="pl-9 bg-gray-50 border-transparent focus:bg-white transition-all dark:bg-gray-900 dark:text-gray-200 rounded-lg" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
          </div>

          {/* Lista de Supermanifestos */}
          <div className="grid gap-3 md:gap-4">
        {supermanifestosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum supermanifesto encontrado</p>
          </div>
        ) : (
          supermanifestosFiltrados.map(sm => (
            <div key={sm.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-teal-200 dark:hover:border-teal-800 transition-all duration-200 shadow-sm">
              <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center flex-shrink-0 text-teal-600 dark:text-teal-400 shadow-sm">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{sm.numero}</span>
                        <Badge className={getStatusBadge(sm.status)}>
                          {sm.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                        <Truck className="w-3.5 h-3.5" />
                        <span className="truncate">{sm.transportadora_nome}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informações */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      ETA
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                      {sm.eta ? format(new Date(sm.eta), 'dd/MM/yyyy HH:mm') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1.5 flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      Pedidos
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                      {sm.pedidos_vinculados?.length || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1.5 flex items-center gap-1">
                      <Weight className="w-3 h-3" />
                      Peso Total
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                      {sm.peso_total_bruto_kg || 0} kg
                    </p>
                  </div>
                  <div className="flex items-end gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDiscriminarVolumes(sm)}
                      className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="hidden sm:inline">Volumes</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleVerDetalhes(sm)}
                      className="gap-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Detalhes</span>
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
          supermanifesto={selectedSupermanifesto}
          isOpen={showDetalhes}
          onClose={() => {
            setShowDetalhes(false);
            setSelectedSupermanifesto(null);
          }}
        />
      )}

      {/* Modal Discriminar Volumes */}
      {showDiscriminarVolumes && selectedSupermanifesto && (
        <DiscriminarVolumesManifesto
          manifesto={selectedSupermanifesto}
          isOpen={showDiscriminarVolumes}
          onClose={() => {
            setShowDiscriminarVolumes(false);
            setSelectedSupermanifesto(null);
            loadSupermanifestos();
          }}
          onSuccess={loadSupermanifestos}
        />
      )}
    </div>
  );
}