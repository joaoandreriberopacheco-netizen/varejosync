import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Edit, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

const getStatusBadge = (status) => {
  // Glacial Palette
  const variants = {
    'Aguardando Conferência': 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    'Em Conferência': 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    'Conferido': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    'Com Divergências': 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    'Finalizado': 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
  };
  return variants[status] || 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
};

export default function VolumetrizacaoManifestos() {
  const navigate = useNavigate();
  const [manifestos, setManifestos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleDiscriminarVolumes = (manifesto) => {
    navigate(createPageUrl(`DiscriminarVolumes?id=${manifesto.id}&tipo=manifesto`));
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
      {/* Filtros - Glacial */}
      <div className="relative w-full mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input 
          placeholder="Buscar por número, pedido ou fornecedor..." 
          className="h-12 pl-11 bg-white dark:bg-gray-800 border-0 ring-1 ring-gray-100 dark:ring-gray-700 focus-visible:ring-gray-300 dark:focus-visible:ring-gray-600 rounded-xl shadow-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400" 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
        />
      </div>

      {/* Lista de Manifestos - Glacial */}
      <div className="grid gap-4">
        {manifestosFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl ring-1 ring-gray-100 dark:ring-gray-700">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-light">Nenhum manifesto encontrado</p>
          </div>
        ) : (
          manifestosFiltrados.map(m => (
            <div key={m.id} className="group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-md ring-1 ring-gray-100 dark:ring-gray-700 transition-all duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Informações */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 text-gray-400 dark:text-gray-500">
                    <Package className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className="text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{m.numero}</span>
                      <Badge className={`font-normal rounded-full px-3 ${getStatusBadge(m.status)}`}>
                        {m.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs uppercase tracking-wider">Pedido</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{m.pedido_numero}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs uppercase tracking-wider">Fornecedor</span>
                        <span className="truncate text-gray-700 dark:text-gray-300">{m.fornecedor_nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs uppercase tracking-wider">Volumes</span>
                        <span className="truncate text-gray-700 dark:text-gray-300">
                          {(() => {
                            const qtd = m.volumes?.reduce((acc, v) => acc + (v.quantidade || 0), 0) || 0;
                            return qtd > 0 ? qtd : 'Não informado';
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ação */}
                <Button 
                  variant="outline" 
                  onClick={() => handleDiscriminarVolumes(m)}
                  className="gap-2 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl h-11 px-6 w-full md:w-auto font-medium"
                >
                  <Edit className="w-4 h-4 text-gray-500" />
                  Discriminar Volumes
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}