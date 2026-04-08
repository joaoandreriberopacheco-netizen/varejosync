import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Anchor, ChevronDown, Plus, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [search, setSearch] = useState('');
  const [selectedBoat, setSelectedBoat] = useState(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: transportadorasData = [] } = useQuery({
    queryKey: ['transportadoras-fluvial'],
    queryFn: () => base44.entities.Transportadora.list('-updated_date', 200),
    initialData: [],
  });

  const { data: eventosData = [] } = useQuery({
    queryKey: ['eventos-logisticos-fluvial'],
    queryFn: () => base44.entities.EventoLogisticoSandbox.list('-data_saida_origem', 500),
    initialData: [],
  });

  const transportadorasNormalizadas = useMemo(() => {
    return transportadorasData.map((item) => {
      const eventosRelacionados = eventosData
        .filter((evento) => evento.transportadora_id === item.id)
        .sort((a, b) => new Date(a.data_saida_origem || 0) - new Date(b.data_saida_origem || 0));

      const proximoEvento = eventosRelacionados.find((evento) => {
        if (!evento.data_chegada_destino) return false;
        return new Date(`${evento.data_chegada_destino}T00:00:00`) >= new Date();
      }) || eventosRelacionados[0];

      return {
        ...item,
        status: item.ativo === false ? 'inativa' : 'ativa',
        proximo_eta: proximoEvento?.data_chegada_destino ? format(new Date(`${proximoEvento.data_chegada_destino}T00:00:00`), 'dd/MM/yyyy') : '-',
        recorrencia: item.saida_referencia || '-',
        eventos: eventosRelacionados.map((evento) => ({
          id: evento.id,
          titulo: evento.nome || `${item.nome} · ${evento.codigo}`,
          codigo: evento.codigo || '-',
          data: evento.data_saida_origem ? format(new Date(`${evento.data_saida_origem}T00:00:00`), 'dd/MM/yyyy') : '-',
          cargas: evento.total_embarques_relacionados || 0,
          freteValor: 'Frete pendente',
          financeiroStatus: evento.tem_conta_frete ? 'vinculado' : 'sem_conta',
          pagamentoLabel: evento.tem_conta_frete ? 'Conta vinculada' : 'Sem conta',
          embarques: [],
          anexos: [],
        })),
        timeline: eventosRelacionados.flatMap((evento) => ([
          {
            label: 'Chegada em Manaus',
            data: evento.data_chegada_manaus ? format(new Date(`${evento.data_chegada_manaus}T00:00:00`), 'dd/MM/yyyy') : '-',
            status: 'Planejado',
            dayLabel: evento.data_chegada_manaus ? format(new Date(`${evento.data_chegada_manaus}T00:00:00`), 'dd') : '--',
            hasLinked: false,
            linkedCount: 0,
          },
          {
            label: 'Saída de Manaus',
            data: evento.data_saida_origem ? format(new Date(`${evento.data_saida_origem}T00:00:00`), 'dd/MM/yyyy') : '-',
            status: 'Planejado',
            dayLabel: evento.data_saida_origem ? format(new Date(`${evento.data_saida_origem}T00:00:00`), 'dd') : '--',
            hasLinked: false,
            linkedCount: 0,
          },
          {
            label: 'ETA Tabatinga',
            data: evento.data_chegada_destino ? format(new Date(`${evento.data_chegada_destino}T00:00:00`), 'dd/MM/yyyy') : '-',
            status: 'Planejado',
            dayLabel: evento.data_chegada_destino ? format(new Date(`${evento.data_chegada_destino}T00:00:00`), 'dd') : '--',
            hasLinked: false,
            linkedCount: 0,
          }
        ])),
        itinerario_real: eventosRelacionados.flatMap((evento) => ([
          {
            id: `${evento.id}-manaus`,
            etapa: 'Chegada em Manaus',
            data: evento.data_chegada_manaus ? format(new Date(`${evento.data_chegada_manaus}T00:00:00`), 'dd/MM/yyyy') : '-',
            tipo: 'passada',
          },
          {
            id: `${evento.id}-saida`,
            etapa: 'Saída de Manaus',
            data: evento.data_saida_origem ? format(new Date(`${evento.data_saida_origem}T00:00:00`), 'dd/MM/yyyy') : '-',
            tipo: 'atual',
          },
          {
            id: `${evento.id}-tabatinga`,
            etapa: 'ETA Tabatinga',
            data: evento.data_chegada_destino ? format(new Date(`${evento.data_chegada_destino}T00:00:00`), 'dd/MM/yyyy') : '-',
            tipo: 'futura',
          }
        ])),
      };
    });
  }, [transportadorasData, eventosData]);

  const transportadoras = useMemo(() => {
    const termo = search.trim().toLowerCase();
    let items = transportadorasNormalizadas;

    if (filter === 'ativas') items = items.filter((item) => item.status === 'ativa');
    if (filter === 'inativas') items = items.filter((item) => item.status === 'inativa');
    if (termo) items = items.filter((item) => (item.nome || '').toLowerCase().includes(termo));

    return [...items].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
  }, [filter, search, transportadorasNormalizadas]);

  const handleSaveBoat = (updatedBoat) => {
    const boatAtualizada = transportadorasNormalizadas.find((item) => item.id === updatedBoat.id) || updatedBoat;
    setSelectedBoat(boatAtualizada);
    queryClient.invalidateQueries({ queryKey: ['transportadoras-fluvial'] });
    queryClient.invalidateQueries({ queryKey: ['eventos-logisticos-fluvial'] });
  };

  const handleCreatedBoat = (createdBoat) => {
    queryClient.invalidateQueries({ queryKey: ['transportadoras-fluvial'] });
    queryClient.invalidateQueries({ queryKey: ['eventos-logisticos-fluvial'] });
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

      <div className="rounded-3xl bg-white dark:bg-gray-800 shadow-sm p-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar transportadora" className="border-0 bg-transparent shadow-none h-10 px-0" />
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
      <NewTransportadoraDialog open={showNewDialog} onOpenChange={setShowNewDialog} onCreated={handleCreatedBoat} />
    </div>
  );
}