import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Ticket, Wallet, RefreshCw, CalendarClock } from 'lucide-react';
import { formatarDataHora, formatarSoData } from '@/components/utils/dateUtils';

const getStatusClass = (status) => {
  const variants = {
    'Ativo': 'text-[#4A5D23] dark:text-[#a4ce33]',
    'Utilizado Parcialmente': 'text-amber-600 dark:text-amber-400',
    'Utilizado': 'text-muted-foreground',
    'Expirado': 'text-red-500 dark:text-red-400',
    'Cancelado': 'text-red-500 dark:text-red-400',
  };
  return variants[status] || 'text-muted-foreground';
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
        <span className="text-muted-foreground min-w-0">{filteredVales.length} vale(s)</span>
        <span className="text-base sm:text-lg font-semibold text-foreground text-right break-words leading-tight">R$ {formatValor(subtotalDisponivel)}</span>
      </div>

      {filteredVales.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Ticket className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum vale troca encontrado</p>
        </div>
      ) : (
        <>
          <P38MobileLineList className="md:hidden">
            {filteredVales.map((vale, index) => {
              const tone = p38StatusTone(vale.status);
              return (
                <P38MobileLine
                  key={vale.id}
                  striped={index % 2 === 1}
                  accent={p38AccentKeyFromTone(tone)}
                  title={
                    <span className="inline-flex items-center gap-1.5 font-mono">
                      <Ticket className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                      {vale.codigo}
                    </span>
                  }
                  subtitle={vale.cliente_nome || 'Cliente não informado'}
                  meta={
                    <>
                      <P38StatusLabel tone={tone}>{vale.status}</P38StatusLabel>
                      <span>{vale.origem_tipo}</span>
                      <span>Pedido {vale.pedido_origem_numero || '-'}</span>
                      <span>Emitido {formatarSoData(vale.created_date)}</span>
                      {vale.data_expiracao && <span>Expira {formatarSoData(vale.data_expiracao)}</span>}
                    </>
                  }
                  value={`R$ ${formatValor(vale.valor_disponivel)}`}
                  valueSub={`Orig. R$ ${formatValor(vale.valor_original)}`}
                />
              );
            })}
          </P38MobileLineList>

          <P38TableShell className="hidden md:block min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                {filteredVales.map((vale) => {
                  const tone = p38StatusTone(vale.status);
                  return (
                    <TableRow key={vale.id}>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 font-mono font-semibold">
                          <Ticket className="w-4 h-4 text-muted-foreground" />
                          {vale.codigo}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{vale.cliente_nome || '-'}</TableCell>
                      <TableCell>
                        <P38StatusLabel tone={tone}>{vale.status}</P38StatusLabel>
                      </TableCell>
                      <TableCell>{vale.origem_tipo}</TableCell>
                      <TableCell>{vale.pedido_origem_numero || '-'}</TableCell>
                      <TableCell>{formatarDataHora(vale.created_date)}</TableCell>
                      <TableCell>{vale.data_expiracao ? formatarSoData(vale.data_expiracao) : '-'}</TableCell>
                      <TableCell className="text-right font-semibold">R$ {formatValor(vale.valor_disponivel)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">R$ {formatValor(vale.valor_original)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </P38TableShell>
        </>
      )}
    </div>
  );
}