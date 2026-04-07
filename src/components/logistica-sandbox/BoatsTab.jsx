import React, { useMemo, useState } from 'react';
import { Anchor, CalendarRange, FileText, Link as LinkIcon, MoreHorizontal, Pencil, Power, Trash2, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

function EventBadge({ status }) {
  const map = {
    'Concluído': 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900',
    'Previsto': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    'Finalizado': 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };
  return <Badge className={`border-0 shadow-none ${map[status] || 'bg-gray-100 text-gray-700'}`}>{status}</Badge>;
}

function FreteBadge({ status }) {
  const map = {
    'Pago': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    'Em aberto': 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };
  return <Badge className={`border-0 shadow-none ${map[status] || 'bg-gray-100 text-gray-700'}`}>{status}</Badge>;
}

function BoatCard({ transportadora }) {
  const hasHistory = transportadora.eventos.length > 0 || transportadora.fretes.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-4 md:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center shadow-sm">
              <Anchor className="w-4 h-4 text-gray-700 dark:text-gray-200" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate font-glacial">{transportadora.nome}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{transportadora.recorrencia}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={transportadora.status} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-2xl bg-gray-100 dark:bg-gray-700 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-600">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl border-0 shadow-xl">
              <DropdownMenuItem className="rounded-xl gap-2"><Pencil className="w-4 h-4" /> Editar</DropdownMenuItem>
              {hasHistory ? (
                <DropdownMenuItem className="rounded-xl gap-2"><Power className="w-4 h-4" /> Inativar</DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="rounded-xl gap-2 text-red-600 focus:text-red-600"><Trash2 className="w-4 h-4" /> Excluir</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 p-3 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Chegada Manaus</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{transportadora.inicio_ciclo}</p>
        </div>
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 p-3 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Saída Manaus</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{transportadora.proxima_saida}</p>
        </div>
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 p-3 shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">ETA Tabatinga</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{transportadora.proximo_eta}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 p-3 md:p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <CalendarRange className="w-4 h-4" /> Histórico de eventos logísticos
        </div>
        <div className="space-y-2">
          {transportadora.eventos.map((evento) => (
            <div key={evento.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white dark:bg-gray-800 px-3 py-2 shadow-sm">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{evento.titulo}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{evento.codigo} · {evento.data}</p>
              </div>
              <EventBadge status={evento.status} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 p-3 md:p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Waves className="w-4 h-4" /> Histórico de fretes
        </div>
        <div className="space-y-2">
          {transportadora.fretes.map((frete) => (
            <div key={frete.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-white dark:bg-gray-800 px-3 py-3 shadow-sm">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{frete.periodo}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{frete.valor}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <FreteBadge status={frete.status} />
                <Button variant="ghost" size="sm" className="rounded-2xl bg-gray-100 dark:bg-gray-700 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-600 gap-2">
                  <LinkIcon className="w-4 h-4" /> {frete.anexo}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {hasHistory && transportadora.status === 'ativa' && (
        <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 p-3 shadow-sm">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">Inativação com histórico</p>
          <p className="mt-1 text-xs text-red-600 dark:text-red-300/90">Ao inativar esta transportadora, os eventos vinculados a partir da data escolhida deixarão de existir.</p>
        </div>
      )}
    </div>
  );
}

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
          <BoatCard key={transportadora.id} transportadora={transportadora} />
        ))}
      </div>
    </div>
  );
}