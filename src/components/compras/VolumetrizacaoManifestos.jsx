import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Edit, RefreshCw, Weight } from 'lucide-react';
import { toast } from 'sonner';
import DiscriminarVolumesManifesto from './DiscriminarVolumesManifesto';

const getStatusBadge = (status) => {
  const variants = {
    'Aguardando Conferência': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'Em Conferência': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'Conferido': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'Com Divergências': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'Finalizado': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  };
  return variants[status] || 'bg-gray-100 text-gray-800';
};

export default function VolumetrizacaoManifestos() {
  const [manifestos, setManifestos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManifesto, setSelectedManifesto] = useState(null);
  const [showDiscriminarVolumes, setShowDiscriminarVolumes] = useState(false);

  useEffect(() => {
    loadManifestos();
    
    // Real-time subscription
    const unsubscribe = base44.entities.ManifestoEntrada.subscribe((event) => {
      loadManifestos();
    });

    return () => unsubscribe();
  }, []);

  const loadManifestos = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.ManifestoEntrada.list('-created_date');
      setManifestos(data);
    } catch (error) {
      console.error("Erro ao carregar manifestos:", error);
      toast.error("Erro ao carregar manifestos");
    } finally {
      setLoading(false);
    }
  };

  const handleDiscriminarVolumes = async (manifesto) => {
    // Buscar pedido de compra vinculado
    try {
      const pedido = await base44.entities.PedidoCompra.filter({ id: manifesto.pedido_compra_id });
      if (pedido && pedido.length > 0) {
        // Criar estrutura compatível com DiscriminarVolumesManifesto
        const manifestoComPedidos = {
          ...manifesto,
          pedidos_vinculados: [{
            pedido_id: pedido[0].id,
            pedido_numero: pedido[0].numero,
            descritivo_volumes: '',
            peso_informado_kg: 0
          }]
        };
        setSelectedManifesto(manifestoComPedidos);
        setShowDiscriminarVolumes(true);
      }
    } catch (error) {
      console.error("Erro ao buscar pedido:", error);
      toast.error("Erro ao carregar dados do pedido");
    }
  };

  const manifestosFiltrados = manifestos.filter(m => {
    const matchSearch = m.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       m.fornecedor_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       m.pedido_numero?.toLowerCase().includes(searchTerm.toLowerCase());
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
            placeholder="Buscar por número, pedido ou fornecedor..." 
            className="pl-9 bg-gray-50 border-transparent focus:bg-white transition-all dark:bg-gray-900 dark:text-gray-200 rounded-lg" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      {/* Lista de Manifestos */}
      <div className="grid gap-3 md:gap-4">
        {manifestosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum manifesto encontrado</p>
          </div>
        ) : (
          manifestosFiltrados.map(m => (
            <div key={m.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Informações */}
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400 shadow-sm">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{m.numero}</span>
                      <Badge className={getStatusBadge(m.status)}>
                        {m.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Pedido:</span>
                        <span className="font-medium">{m.pedido_numero}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Fornecedor:</span>
                        <span className="truncate">{m.fornecedor_nome}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ação */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDiscriminarVolumes(m)}
                  className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg w-full md:w-auto"
                >
                  <Edit className="w-4 h-4" />
                  Discriminar Volumes
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Discriminar Volumes */}
      {showDiscriminarVolumes && selectedManifesto && (
        <DiscriminarVolumesManifesto
          manifesto={selectedManifesto}
          isOpen={showDiscriminarVolumes}
          onClose={() => {
            setShowDiscriminarVolumes(false);
            setSelectedManifesto(null);
            loadManifestos();
          }}
          onSuccess={loadManifestos}
        />
      )}
    </div>
  );
}