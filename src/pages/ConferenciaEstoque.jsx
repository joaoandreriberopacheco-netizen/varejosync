import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function ConferenciaEstoque() {
  const [conferencias, setConferencias] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    loadConferencias();
  }, []);

  const loadConferencias = async () => {
    try {
      setIsLoading(true);
      const data = await base44.entities.ConferenciaEstoque.list();
      setConferencias(data);
    } catch (error) {
      console.error('Erro ao carregar conferências:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Conferência de Estoque</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gerenciar conferências de estoque</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Conferência
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : conferencias.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Nenhuma conferência realizada</div>
      ) : (
        <div className="space-y-2">
          {conferencias.map((conf) => (
            <div key={conf.id} className="p-4 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{conf.titulo || 'Conferência'}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">ID: {conf.id}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}