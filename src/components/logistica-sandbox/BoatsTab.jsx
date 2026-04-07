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
    contato: 'Carlos Nogueira',
    telefone: '(92) 99999-1001',
    recorrencia: 'Chegada em Manaus → +7 dias saída → +7 dias ETA Tabatinga',
    itinerario_real: [
      { id: 'itr-1', etapa: 'Chegada em Manaus', data: '2026-03-03', tipo: 'passada' },
      { id: 'itr-2', etapa: 'Saída de Manaus', data: '2026-03-10', tipo: 'atual' },
      { id: 'itr-3', etapa: 'ETA Tabatinga', data: '2026-03-17', tipo: 'futura' },
    ],
    inicio_ciclo: '2026-03-03',
    proxima_saida: '2026-03-10',
    proximo_eta: '2026-03-17',
    eventos: [
      { id: 'evt-1', codigo: 'EVT-0310', titulo: 'Saída de Manaus', data: '10/03/2026', status: 'Concluído', cargas: 2, freteValor: 'R$ 14.800,00', financeiroStatus: 'pago', pagamentoLabel: 'Frete pago', embarques: [{ id: 'emb-1', nome: 'EMB-201', resumo: '2 volumes · Fornecedor A', status: 'Despachado' }, { id: 'emb-2', nome: 'EMB-202', resumo: '5 volumes · Fornecedor B', status: 'Recebido' }], anexos: [{ id: 'anx-1', nome: 'Conhecimento.pdf', tipo: 'PDF' }, { id: 'anx-2', nome: 'Comprovante.jpg', tipo: 'Imagem' }] },
      { id: 'evt-2', codigo: 'EVT-0317', titulo: 'ETA Tabatinga', data: '17/03/2026', status: 'Previsto', cargas: 1, freteValor: 'R$ 16.250,00', financeiroStatus: 'atrasado', pagamentoLabel: 'Conta atrasada', embarques: [{ id: 'emb-3', nome: 'EMB-203', resumo: '1 volume · Fornecedor C', status: 'Em trânsito' }], anexos: [{ id: 'anx-3', nome: 'Romaneio.pdf', tipo: 'PDF' }] },
      { id: 'evt-3', codigo: 'EVT-0303', titulo: 'Chegada em Manaus', data: '03/03/2026', status: 'Concluído', cargas: 1, freteValor: 'R$ 13.200,00', financeiroStatus: 'vinculado', pagamentoLabel: 'Conta a pagar vinculada', embarques: [{ id: 'emb-4', nome: 'EMB-204', resumo: '3 volumes · Fornecedor D', status: 'Conferido' }], anexos: [{ id: 'anx-4', nome: 'Recibo.png', tipo: 'Imagem' }] },
    ],
  },
  {
    id: 'boat-2',
    nome: 'B/M Solimões Norte',
    status: 'ativa',
    contato: 'Marina Souza',
    telefone: '(92) 99999-2002',
    recorrencia: 'Chegada em Manaus → +7 dias saída → +7 dias ETA Tabatinga',
    itinerario_real: [
      { id: 'itr-4', etapa: 'Chegada em Manaus', data: '2026-03-08', tipo: 'passada' },
      { id: 'itr-5', etapa: 'Saída de Manaus', data: '2026-03-15', tipo: 'atual' },
      { id: 'itr-6', etapa: 'ETA Tabatinga', data: '2026-03-22', tipo: 'futura' },
    ],
    inicio_ciclo: '2026-03-08',
    proxima_saida: '2026-03-15',
    proximo_eta: '2026-03-22',
    eventos: [
      { id: 'evt-4', codigo: 'EVT-0315', titulo: 'Saída de Manaus', data: '15/03/2026', status: 'Concluído', cargas: 1, freteValor: 'R$ 12.500,00', financeiroStatus: 'pago', pagamentoLabel: 'Frete pago', embarques: [{ id: 'emb-5', nome: 'EMB-205', resumo: '4 volumes · Fornecedor E', status: 'Despachado' }], anexos: [{ id: 'anx-5', nome: 'Nota.pdf', tipo: 'PDF' }] },
      { id: 'evt-5', codigo: 'EVT-0322', titulo: 'ETA Tabatinga', data: '22/03/2026', status: 'Previsto', cargas: 1, freteValor: 'R$ 11.900,00', financeiroStatus: 'vinculado', pagamentoLabel: 'Conta a pagar vinculada', embarques: [{ id: 'emb-6', nome: 'EMB-206', resumo: '2 volumes · Fornecedor F', status: 'Em trânsito' }], anexos: [{ id: 'anx-6', nome: 'Comprovante.pdf', tipo: 'PDF' }] },
    ],
  },
  {
    id: 'boat-3',
    nome: 'N/M Estrela do Rio',
    status: 'inativa',
    contato: 'Ronaldo Barros',
    telefone: '(92) 99999-3003',
    recorrencia: 'Ciclo encerrado por inativação',
    itinerario_real: [
      { id: 'itr-7', etapa: 'Chegada em Manaus', data: '2025-12-01', tipo: 'passada' },
      { id: 'itr-8', etapa: 'Saída de Manaus', data: '2025-12-08', tipo: 'passada' },
      { id: 'itr-9', etapa: 'ETA Tabatinga', data: '2025-12-22', tipo: 'passada' },
    ],
    inicio_ciclo: '2025-12-01',
    proxima_saida: '-',
    proximo_eta: '-',
    eventos: [
      { id: 'evt-6', codigo: 'EVT-1222', titulo: 'ETA Tabatinga', data: '22/12/2025', status: 'Finalizado', cargas: 1, freteValor: 'R$ 11.900,00', financeiroStatus: 'sem_conta', pagamentoLabel: 'Sem conta a pagar associada', embarques: [{ id: 'emb-7', nome: 'EMB-207', resumo: '1 volume · Fornecedor G', status: 'Finalizado' }], anexos: [{ id: 'anx-7', nome: 'Resumo.txt', tipo: 'Texto' }] },
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
  const [transportadorasData, setTransportadorasData] = useState(mockTransportadoras);

  const transportadoras = useMemo(() => {
    if (filter === 'ativas') return transportadorasData.filter((item) => item.status === 'ativa');
    if (filter === 'inativas') return transportadorasData.filter((item) => item.status === 'inativa');
    return transportadorasData;
  }, [filter, transportadorasData]);

  const handleSaveBoat = (updatedBoat) => {
    setTransportadorasData((prev) => prev.map((item) => item.id === updatedBoat.id ? updatedBoat : item));
    setSelectedBoat(updatedBoat);
  };

  const handleDeleteBoat = (boatId) => {
    setTransportadorasData((prev) => prev.filter((item) => item.id !== boatId));
    setSelectedBoat(null);
  };

  const handleInactivateBoat = (boatId) => {
    setTransportadorasData((prev) => prev.map((item) => item.id === boatId ? { ...item, status: 'inativa' } : item));
    setSelectedBoat((prev) => prev && prev.id === boatId ? { ...prev, status: 'inativa' } : prev);
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
        {transportadoras.map((transportadora) => (
          <BoatListCard
            key={transportadora.id}
            transportadora={transportadora}
            onClick={() => setSelectedBoat({
              ...transportadora,
              timeline: transportadora.eventos.map((evento, index) => ({
                label: evento.titulo,
                data: evento.data,
                dayLabel: `${index + 1}`.padStart(2, '0'),
                status: evento.status,
                hasLinked: (evento.cargas || 0) > 0,
                linkedCount: evento.cargas || 0,
              })),
            })}
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