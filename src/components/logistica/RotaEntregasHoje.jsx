import React, { useMemo } from 'react';
import { AgendaLogistica } from '@/entities/AgendaLogistica';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Truck, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";

export default function RotaEntregasHoje({ entregas, onUpdate }) {
  const { toast } = useToast();
  const hoje = format(new Date(), 'yyyy-MM-dd');

  const entregasHoje = useMemo(() => {
    return entregas.filter(e => e.data_agendada === hoje && e.status !== 'Cancelado');
  }, [entregas, hoje]);

  const handleIniciarRota = async (entrega) => {
    try {
      await AgendaLogistica.update(entrega.id, {
        ...entrega,
        status: 'Em Rota',
        data_hora_saida: new Date().toISOString()
      });
      
      toast({
        title: "Rota Iniciada!",
        description: `Entrega ${entrega.pedido_numero} marcada como em rota.`,
        className: "bg-blue-100 text-blue-800"
      });
      
      onUpdate();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleConfirmarEntrega = async (entrega) => {
    try {
      await AgendaLogistica.update(entrega.id, {
        ...entrega,
        status: 'Entregue',
        data_hora_entrega: new Date().toISOString()
      });
      
      toast({
        title: "Entrega Confirmada!",
        description: `Pedido ${entrega.pedido_numero} entregue com sucesso.`,
        className: "bg-green-100 text-green-800"
      });
      
      onUpdate();
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      "Agendado": { className: "bg-blue-100 text-blue-800", icon: Clock },
      "Em Rota": { className: "bg-purple-100 text-purple-800", icon: Truck },
      "Entregue": { className: "bg-green-100 text-green-800", icon: CheckCircle },
      "Entrega Frustrada": { className: "bg-red-100 text-red-800", icon: AlertCircle }
    };
    const config = variants[status] || variants["Agendado"];
    const Icon = config.icon;
    
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-purple-600" />
          Entregas de Hoje - {format(new Date(), "dd 'de' MMMM")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entregasHoje.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Truck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            Nenhuma entrega agendada para hoje
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entregasHoje.map(entrega => (
                <TableRow key={entrega.id}>
                  <TableCell className="font-medium">{entrega.pedido_numero}</TableCell>
                  <TableCell>
                    <div>{entrega.cliente_nome}</div>
                    <div className="text-xs text-gray-500">{entrega.telefone_contato}</div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="text-sm">{entrega.endereco_entrega}</div>
                      <div className="text-xs text-gray-500">
                        {entrega.bairro} - {entrega.cidade}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{entrega.turno_entrega}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(entrega.status)}</TableCell>
                  <TableCell className="text-right">
                    {entrega.status === 'Agendado' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleIniciarRota(entrega)}
                        className="text-blue-600"
                      >
                        <Truck className="w-4 h-4 mr-1" />
                        Iniciar Rota
                      </Button>
                    )}
                    {entrega.status === 'Em Rota' && (
                      <Button 
                        size="sm" 
                        onClick={() => handleConfirmarEntrega(entrega)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Confirmar Entrega
                      </Button>
                    )}
                    {entrega.status === 'Entregue' && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Concluída
                      </Badge>
                    )}
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