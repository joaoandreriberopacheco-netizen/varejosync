import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Search, Package, Eye, Edit, Truck, Weight, Calendar, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import DetalhesSupermanifesto from './DetalhesSupermanifesto';
import DiscriminarVolumesManifesto from './DiscriminarVolumesManifesto';

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
  const [supermanifestos, setSupermanifestos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupermanifesto, setSelectedSupermanifesto] = useState(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [showDiscriminarVolumes, setShowDiscriminarVolumes] = useState(false);

  useEffect(() => {
    loadSupermanifestos();
    
    // Real-time subscription
    const unsubscribe = base44.entities.Supermanifesto.subscribe((event) => {
      loadSupermanifestos();
    });

    return () => unsubscribe();
  }, []);

  const loadSupermanifestos = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.Supermanifesto.list('-created_date');
      setSupermanifestos(data);
    } catch (error) {
      console.error("Erro ao carregar supermanifestos:", error);
      toast.error("Erro ao carregar supermanifestos");
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalhes = (supermanifesto) => {
    setSelectedSupermanifesto(supermanifesto);
    setShowDetalhes(true);
  };

  const handleDiscriminarVolumes = (supermanifesto) => {
    setSelectedSupermanifesto(supermanifesto);
    setShowDiscriminarVolumes(true);
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
      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 md:p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
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