import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function HistoricoEntregas({ entregas }) {
  const [searchTerm, setSearchTerm] = useState('');

  const entregasFinalizadas = useMemo(() => {
    return entregas
      .filter(e => ['Entregue', 'Entrega Frustrada', 'Cancelado'].includes(e.status))
      .filter(e => 
        e.pedido_numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.data_agendada) - new Date(a.data_agendada));
  }, [entregas, searchTerm]);

  const getStatusBadge = (status) => {
    const variants = {
      "Entregue": "bg-green-100 text-green-800",
      "Entrega Frustrada": "bg-red-100 text-red-800",
      "Cancelado": "bg-gray-200 text-gray-800"
    };
    return variants[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-600" />
            Histórico de Entregas
          </CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Buscar por pedido ou cliente..." 
              className="pl-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {entregasFinalizadas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            Nenhuma entrega finalizada encontrada
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recebedor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entregasFinalizadas.map(entrega => (
                <TableRow key={entrega.id}>
                  <TableCell className="font-medium">
                    {format(new Date(entrega.data_agendada), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>{entrega.pedido_numero}</TableCell>
                  <TableCell>{entrega.cliente_nome}</TableCell>
                  <TableCell>
                    <div className="text-sm max-w-xs">
                      {entrega.bairro} - {entrega.cidade}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(entrega.status)}>
                      {entrega.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {entrega.nome_recebedor || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}