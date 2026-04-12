import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Ticket, Wallet, RefreshCw, CalendarClock } from 'lucide-react';
import { formatarDataHora, formatarSoData } from '@/components/utils/dateUtils';

const getStatusClass = (status) => {
  const variants = {
    'Ativo': 'text-emerald-600 dark:text-emerald-400',
    'Utilizado Parcialmente': 'text-amber-600 dark:text-amber-400',
    'Utilizado': 'text-gray-500 dark:text-gray-400',
    'Expirado': 'text-red-500 dark:text-red-400',
    'Cancelado': 'text-red-500 dark:text-red-400',
  };
  return variants[status] || 'text-gray-500 dark:text-gray-400';
};

export default function ValesTrocaTab({ searchTerm, statusFiltro, dataInicio, dataFim, activeTab }) {
  const [vales, setVales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab !== 'vales') return;
    loadVales();
  }, [activeTab]);

  const loadVales = async () => {
    setLoading(true);
    const data = await base44.entities.ValeCompra.list('-created_date');
    setVales(data);
    setLoading(false);
  };

  const filteredVales = useMemo(() => {
    let current = [...vales];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      current = current.filter((vale) =>
        vale.codigo?.toLowerCase().includes(term) ||
        vale.cliente_nome?.toLowerCase().includes(term) ||
        vale.pedido_origem_numero?.toLowerCase().includes(term)
      );
    }

    if (statusFiltro !== 'todos') {
      current = current.filter((vale) => vale.status === statusFiltro);
    }

    if (dataInicio || dataFim) {
      current = current.filter((vale) => {
        const chave = vale.created_date?.slice(0, 10);
        if (!chave) return false;
        if (dataInicio && chave < dataInicio) return false;
        if (dataFim && chave > dataFim) return false;
        return true;
      });
    }

    return current;
  }, [vales, searchTerm, statusFiltro, dataInicio, dataFim]);

  const subtotalDisponivel = filteredVales.reduce((acc, vale) => acc + (vale.valor_disponivel || 0), 0);

  const formatValor = (valor) => (parseFloat(valor) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex items-start justify-between gap-3 text-sm min-w-0">
        <span className="text-gray-500 dark:text-gray-400 min-w-0">{filteredVales.length} vale(s)</span>
        <span className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 text-right break-words leading-tight">R$ {formatValor(subtotalDisponivel)}</span>
      </div>

      {filteredVales.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Ticket className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-600 dark:text-gray-300">Nenhum vale troca encontrado</p>
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-2">
            {filteredVales.map((vale) => (
              <div key={vale.id} className="bg-white dark:bg-slate-900 rounded-[26px] p-4 shadow-sm overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center gap-2 mb-2 px-3 py-2 bg-gray-100 dark:bg-slate-800 rounded-2xl max-w-full">
                      <Ticket className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                      <span className="text-base font-bold text-gray-800 dark:text-gray-100 font-mono leading-none truncate">{vale.codigo}</span>
                    </div>
                    <div className="font-semibold text-gray-800 dark:text-gray-100 break-words leading-tight">
                      {vale.cliente_nome || 'Cliente não informado'}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                      <span className={`text-xs ${getStatusClass(vale.status)}`}>● {vale.status}</span>
                      <span className="text-xs text-gray-400 break-words">{vale.origem_tipo}</span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <div>Pedido: {vale.pedido_origem_numero || '-'}</div>
                      <div>Emitido: {formatarSoData(vale.created_date)}</div>
                      {vale.data_expiracao && <div>Expira: {formatarSoData(vale.data_expiracao)}</div>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0 max-w-[42%]">
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Disponível</div>
                      <div className="font-semibold text-gray-800 dark:text-gray-100">R$ {formatValor(vale.valor_disponivel)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Original</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">R$ {formatValor(vale.valor_original)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200 dark:border-gray-700">
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Expiração</TableHead>
                  <TableHead className="text-right">Disponível</TableHead>
                  <TableHead className="text-right">Original</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVales.map((vale) => (
                  <TableRow key={vale.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <TableCell>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <Ticket className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="font-mono font-semibold text-gray-800 dark:text-gray-100">{vale.codigo}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-800 dark:text-gray-200">{vale.cliente_nome || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs ${getStatusClass(vale.status)}`}>● {vale.status}</span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 dark:text-gray-400">{vale.origem_tipo}</TableCell>
                    <TableCell className="text-sm text-gray-500 dark:text-gray-400">{vale.pedido_origem_numero || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-500 dark:text-gray-400">{formatarDataHora(vale.created_date)}</TableCell>
                    <TableCell className="text-sm text-gray-500 dark:text-gray-400">{vale.data_expiracao ? formatarSoData(vale.data_expiracao) : '-'}</TableCell>
                    <TableCell className="text-right font-semibold text-gray-800 dark:text-gray-200">R$ {formatValor(vale.valor_disponivel)}</TableCell>
                    <TableCell className="text-right text-sm text-gray-500 dark:text-gray-400">R$ {formatValor(vale.valor_original)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}