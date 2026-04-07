import React, { useMemo, useState } from 'react';
import BoatExpandedCard from '@/components/logistica-sandbox/BoatExpandedCard';

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


export default function BoatsTab() {
  const [filter, setFilter] = useState('todas');

  const transportadoras = useMemo(() => {
    if (filter === 'ativas') return mockTransportadoras.filter((item) => item.status === 'ativa');
    if (filter === 'inativas') return mockTransportadoras.filter((item) => item.status === 'inativa');
    return mockTransportadoras;
  }, [filter]);

  return (
    <div className="space-y-4">
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {transportadoras.map((transportadora) => (
          <BoatExpandedCard
            key={transportadora.id}
            transportadora={{
              ...transportadora,
              timeline: [
                { label: 'Chegada em Manaus', data: transportadora.inicio_ciclo },
                { label: 'Saída de Manaus', data: transportadora.proxima_saida },
                { label: 'Chegada em Tabatinga', data: transportadora.proximo_eta },
              ],
            }}
          />
        ))}
      </div>
    </div>
  );
}