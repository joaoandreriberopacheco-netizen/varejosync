import React, { useState, useEffect } from 'react';
import { PedidoVenda } from '@/entities/PedidoVenda';
import { ProtocoloEntrega } from '@/entities/ProtocoloEntrega';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, CheckCircle, Truck, Eye } from 'lucide-react';
import ConfirmarEntrega from '../components/vendas/ConfirmarEntrega';
import { useToast } from "@/components/ui/use-toast";

export default function ExpedicaoPage() {
  const [pedidosProntos, setPedidosProntos] = useState([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPedidos();
  }, []);

  const loadPedidos = async () => {
    const pedidos = await PedidoVenda.filter({ 
      status: 'Pronto para Expedição'
    });
    setPedidosProntos(pedidos);
  };

  const handleConfirmarEntrega = (pedido) => {
    setPedidoSelecionado(pedido);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    loadPedidos();
    toast({
      title: "Entrega confirmada!",
      description: "Pedido finalizado com sucesso.",
      className: "bg-green-100 text-green-800"
    });
  };

  const formatValor = (valor) => {
    const num = parseFloat(valor) || 0;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Expedição e Entrega</h1>
        <p className="text-gray-600 mb-8">Confirme a entrega dos pedidos separados.</p>

        {/* Lista Mobile */}
        <div className="lg:hidden space-y-3">
          {pedidosProntos.map(pedido => (
            <div key={pedido.id} className="bg-white border-l-4 border-l-green-600 rounded-lg p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-bold text-base">{pedido.numero}</p>
                  <p className="text-sm text-gray-600">{pedido.cliente_nome}</p>
                </div>
                <Badge variant="outline" className="gap-1">
                  {pedido.metodo_entrega === 'Delivery' ? (
                    <><Truck className="w-3 h-3" /> Delivery</>
                  ) : (
                    <><Package className="w-3 h-3" /> Retirada</>
                  )}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">Valor:</span>
                <span className="text-lg font-bold text-green-600">R$ {formatValor(pedido.valor_total)}</span>
              </div>

              <Button 
                onClick={() => handleConfirmarEntrega(pedido)}
                className="w-full bg-green-600 hover:bg-green-700 h-11 gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Confirmar Entrega
              </Button>
            </div>
          ))}

          {pedidosProntos.length === 0 && (
            <div className="bg-white rounded-lg p-8 text-center">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">Nenhum pedido pronto para expedição</p>
            </div>
          )}
        </div>

        {/* Tabela Desktop */}
        <Card className="hidden lg:block">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              Pedidos Prontos para Expedição
            </CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Método de Entrega</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidosProntos.map(pedido => (
                  <TableRow key={pedido.id}>
                    <TableCell className="font-medium">{pedido.numero}</TableCell>
                    <TableCell>{pedido.cliente_nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {pedido.metodo_entrega === 'Delivery' ? (
                          <><Truck className="w-3 h-3" /> Delivery</>
                        ) : (
                          <><Package className="w-3 h-3" /> Retirada</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>R$ {formatValor(pedido.valor_total)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        onClick={() => handleConfirmarEntrega(pedido)}
                        className="bg-green-600 hover:bg-green-700 gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Confirmar Entrega
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {pedidosProntos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      Nenhum pedido pronto para expedição no momento.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ConfirmarEntrega
        pedido={pedidoSelecionado}
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}