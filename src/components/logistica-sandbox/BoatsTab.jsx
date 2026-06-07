import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Anchor, ChevronDown, Plus, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  useLogisticaContasPrevistasQuery,
  useLogisticaEmbarquesQuery,
  useLogisticaEventosQuery,
} from '@/hooks/useP38Entities';
import { p38Keys } from '@/lib/p38QueryConfig';
import { buildBoatViewModels, buildFluvialEvents } from '@/components/logistica-sandbox/fluvialDataUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BoatDetailsDialog from '@/components/logistica-sandbox/BoatDetailsDialog';
import NewTransportadoraDialog from '@/components/logistica-sandbox/NewTransportadoraDialog';

function BoatListCard({ transportadora, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-3xl bg-card shadow-sm p-4 text-left"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-2xl bg-muted flex items-center justify-center shadow-sm flex-shrink-0 ring-2 ${transportadora.status === 'ativa' ? 'ring-emerald-500/70' : 'ring-border/40 dark:ring-border/50'}`}>
            <Anchor className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground/90 font-glacial truncate">{transportadora.nome}</h3>
            <p className="text-sm text-muted-foreground truncate">Próximo ETA: {transportadora.proximo_eta}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center shadow-sm">
            <ChevronDown className="w-4 h-4 text-foreground/90" />
          </div>
        </div>
      </div>
    </button>
  );
}

export default function BoatsTab() {
  const [filter, setFilter] = useState('todas');
  const [search, setSearch] = useState('');
  const [selectedBoat, setSelectedBoat] = useState(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: transportadorasData = [] } = useQuery({
    queryKey: ['transportadoras-fluvial'],
    queryFn: () => base44.entities.Transportadora.list('-updated_date', 200),
    initialData: [],
  });

  const { data: eventosData = [] } = useLogisticaEventosQuery({ initialData: [] });
  const { data: embarquesData = [] } = useLogisticaEmbarquesQuery({ initialData: [] });
  const { data: contasPrevistasData = [] } = useLogisticaContasPrevistasQuery({ initialData: [] });

  const eventosEnriquecidos = useMemo(() => buildFluvialEvents({
    eventosLogisticos: eventosData,
    embarques: embarquesData,
    contasPrevistas: contasPrevistasData,
  }), [eventosData, embarquesData, contasPrevistasData]);

  const transportadorasNormalizadas = useMemo(() => {
    return buildBoatViewModels({
      transportadoras: transportadorasData,
      eventos: eventosEnriquecidos,
    });
  }, [transportadorasData, eventosEnriquecidos]);

  const transportadoras = useMemo(() => {
    const termo = search.trim().toLowerCase();
    let items = transportadorasNormalizadas;

    if (filter === 'ativas') items = items.filter((item) => item.status === 'ativa');
    if (filter === 'inativas') items = items.filter((item) => item.status === 'inativa');
    if (termo) items = items.filter((item) => (item.nome || '').toLowerCase().includes(termo));

    return [...items].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
  }, [filter, search, transportadorasNormalizadas]);

  const handleSaveBoat = async (updatedBoat) => {
    await queryClient.invalidateQueries({ queryKey: ['transportadoras-fluvial'] });
    await queryClient.invalidateQueries({ queryKey: p38Keys.logistica.eventos() });
    await queryClient.invalidateQueries({ queryKey: p38Keys.logistica.embarques() });
    await queryClient.invalidateQueries({ queryKey: p38Keys.logistica.contasPrevistas() });

    const boatAtualizada = transportadorasNormalizadas.find((item) => item.id === updatedBoat.id) || updatedBoat;
    setSelectedBoat(boatAtualizada);
  };

  const handleCreatedBoat = async (createdBoat) => {
    await queryClient.invalidateQueries({ queryKey: ['transportadoras-fluvial'] });
    await queryClient.invalidateQueries({ queryKey: p38Keys.logistica.eventos() });
    await queryClient.invalidateQueries({ queryKey: p38Keys.logistica.embarques() });
    await queryClient.invalidateQueries({ queryKey: p38Keys.logistica.contasPrevistas() });
    setSelectedBoat(createdBoat);
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
            className={`px-4 py-2 rounded-2xl text-sm shadow-sm transition ${filter === item.value ? 'bg-primary text-white dark:bg-muted dark:text-foreground' : 'bg-card text-muted-foreground'}`}
          >
            {item.label}
          </button>
        ))}
        </div>
        <Button onClick={() => setShowNewDialog(true)} className="rounded-2xl bg-background text-white hover:bg-primary dark:bg-muted dark:text-foreground dark:hover:bg-muted gap-2">
          <Plus className="w-4 h-4" /> Nova transportadora
        </Button>
      </div>

      <div className="rounded-3xl bg-card shadow-sm p-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar transportadora" className="border-0 bg-transparent shadow-none h-10 px-0" />
      </div>

      <div className="space-y-4">
        {transportadoras.length === 0 ? (
          <div className="rounded-3xl bg-card shadow-sm p-6 text-sm text-muted-foreground">
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
      <NewTransportadoraDialog open={showNewDialog} onOpenChange={setShowNewDialog} onCreated={handleCreatedBoat} />
    </div>
  );
}