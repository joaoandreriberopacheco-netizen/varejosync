import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Anchor, ChevronDown, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import BoatDetailsDialog from '@/components/logistica-sandbox/BoatDetailsDialog';
import NewTransportadoraDialog from '@/components/logistica-sandbox/NewTransportadoraDialog';

function StatusBadge({ status }) {
  const classes = status === 'ativa'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';

  return <Badge className={`border-0 shadow-none ${classes}`}>{status === 'ativa' ? 'Ativa' : 'Inativa'}</Badge>;
}

function BoatListCard({ transportadora, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-3xl bg-white dark:bg-gray-800 shadow-sm p-4 text-left"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shadow-sm flex-shrink-0">
            <Anchor className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 font-glacial truncate">{transportadora.nome}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">Próximo ETA: {transportadora.proximo_eta}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={transportadora.status} />
          <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shadow-sm">
            <ChevronDown className="w-4 h-4 text-gray-700 dark:text-gray-200" />
          </div>
        </div>
      </div>
    </button>
  );
}

export default function BoatsTab() {
  const [filter, setFilter] = useState('todas');
  const [selectedBoat, setSelectedBoat] = useState(null);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const { data: transportadorasData = [] } = useQuery({
    queryKey: ['transportadoras-fluvial'],
    queryFn: () => base44.entities.Transportadora.list('-updated_date', 200),
    initialData: [],
  });

  const transportadorasNormalizadas = useMemo(() => {
    return transportadorasData.map((item) => ({
      ...item,
      status: item.ativo === false ? 'inativa' : 'ativa',
      proximo_eta: '-',
      recorrencia: item.observacoes || '-',
      eventos: [],
      timeline: [],
      itinerario_real: [],
    }));
  }, [transportadorasData]);

  const transportadoras = useMemo(() => {
    if (filter === 'ativas') return transportadorasNormalizadas.filter((item) => item.status === 'ativa');
    if (filter === 'inativas') return transportadorasNormalizadas.filter((item) => item.status === 'inativa');
    return transportadorasNormalizadas;
  }, [filter, transportadorasNormalizadas]);

  const handleSaveBoat = (updatedBoat) => {
    setSelectedBoat(updatedBoat);
  };

  const handleDeleteBoat = () => {
    setSelectedBoat(null);
  };

  const handleInactivateBoat = () => {
    setSelectedBoat(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-2">
        {[
          { value: 'todas', label: 'Todas' },
          { value: 'ativas', label: 'Ativas' },
          { value: 'inativas', label: 'Inativas' },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() => setFilter(item.value)}
            className={`px-4 py-2 rounded-2xl text-sm shadow-sm transition ${filter === item.value ? 'bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
          >
            {item.label}
          </button>
        ))}
        </div>
        <Button onClick={() => setShowNewDialog(true)} className="rounded-2xl bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 gap-2">
          <Plus className="w-4 h-4" /> Nova transportadora
        </Button>
      </div>

      <div className="space-y-4">
        {transportadoras.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-sm p-6 text-sm text-gray-500 dark:text-gray-400">
            Nenhuma transportadora cadastrada ainda.
          </div>
        ) : transportadoras.map((transportadora) => (
          <BoatListCard
            key={transportadora.id}
            transportadora={transportadora}
            onClick={() => setSelectedBoat(transportadora)}
          />
        ))}
      </div>

      <BoatDetailsDialog
        open={!!selectedBoat}
        onOpenChange={(open) => !open && setSelectedBoat(null)}
        transportadora={selectedBoat}
        onSave={handleSaveBoat}
        onDelete={handleDeleteBoat}
        onInactivate={handleInactivateBoat}
      />
      <NewTransportadoraDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </div>
  );
}