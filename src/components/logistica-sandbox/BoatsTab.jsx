import React, { useMemo, useState } from 'react';
import { Anchor, ChevronDown, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import BoatDetailsDialog from '@/components/logistica-sandbox/BoatDetailsDialog';
import NewTransportadoraDialog from '@/components/logistica-sandbox/NewTransportadoraDialog';

const mockTransportadoras = [
  {
    id: 'boat-1',
    nome: 'F/B Vitória Régia',
    status: 'ativa',
    recorrencia: 'Chegada em Manaus → +7 dias saída → +7 dias ETA Tabatinga',
    inicio_ciclo: '2026-03-03',
    proxima_saida: '2026-03-10',
    proximo_eta: '2026-03-17',
    eventos: [
      { id: 'evt-1', codigo: 'EVT-0310', titulo: 'Saída de Manaus', data: '10/03/2026', status: 'Concluído' },
      { id: 'evt-2', codigo: 'EVT-0317', titulo: 'ETA Tabatinga', data: '17/03/2026', status: 'Previsto' },
      { id: 'evt-3', codigo: 'EVT-0303', titulo: 'Chegada em Manaus', data: '03/03/2026', status: 'Concluído' },
    ],
    fretes: [
      { id: 'frt-1', periodo: 'Mar/2026', valor: 'R$ 14.800,00', status: 'Pago', anexo: 'Ver anexo' },
      { id: 'frt-2', periodo: 'Abr/2026', valor: 'R$ 16.250,00', status: 'Em aberto', anexo: 'Ver anexo' },
    ],
  },
  {
    id: 'boat-2',
    nome: 'B/M Solimões Norte',
    status: 'ativa',
    recorrencia: 'Chegada em Manaus → +7 dias saída → +7 dias ETA Tabatinga',
    inicio_ciclo: '2026-03-08',
    proxima_saida: '2026-03-15',
    proximo_eta: '2026-03-22',
    eventos: [
      { id: 'evt-4', codigo: 'EVT-0315', titulo: 'Saída de Manaus', data: '15/03/2026', status: 'Concluído' },
      { id: 'evt-5', codigo: 'EVT-0322', titulo: 'ETA Tabatinga', data: '22/03/2026', status: 'Previsto' },
    ],
    fretes: [
      { id: 'frt-3', periodo: 'Fev/2026', valor: 'R$ 12.500,00', status: 'Pago', anexo: 'Ver anexo' },
    ],
  },
  {
    id: 'boat-3',
    nome: 'N/M Estrela do Rio',
    status: 'inativa',
    recorrencia: 'Ciclo encerrado por inativação',
    inicio_ciclo: '2025-12-01',
    proxima_saida: '-',
    proximo_eta: '-',
    eventos: [
      { id: 'evt-6', codigo: 'EVT-1222', titulo: 'ETA Tabatinga', data: '22/12/2025', status: 'Finalizado' },
    ],
    fretes: [
      { id: 'frt-4', periodo: 'Dez/2025', valor: 'R$ 11.900,00', status: 'Pago', anexo: 'Ver anexo' },
    ],
  },
];


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

  const transportadoras = useMemo(() => {
    if (filter === 'ativas') return mockTransportadoras.filter((item) => item.status === 'ativa');
    if (filter === 'inativas') return mockTransportadoras.filter((item) => item.status === 'inativa');
    return mockTransportadoras;
  }, [filter]);

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
        {transportadoras.map((transportadora) => (
          <BoatListCard
            key={transportadora.id}
            transportadora={transportadora}
            onClick={() => setSelectedBoat({
              ...transportadora,
              timeline: [
                { label: 'Chegada em Manaus', data: transportadora.inicio_ciclo, dayLabel: 'CM', status: 'Concluído', hasLinked: true, linkedCount: 1 },
                { label: 'Saída de Manaus', data: transportadora.proxima_saida, dayLabel: 'SM', status: 'Previsto', hasLinked: true, linkedCount: 2 },
                { label: 'ETA Tabatinga', data: transportadora.proximo_eta, dayLabel: 'ET', status: 'Previsto', hasLinked: false, linkedCount: 0 },
              ],
            })}
          />
        ))}
      </div>

      <BoatDetailsDialog open={!!selectedBoat} onOpenChange={(open) => !open && setSelectedBoat(null)} transportadora={selectedBoat} />
      <NewTransportadoraDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </div>
  );
}