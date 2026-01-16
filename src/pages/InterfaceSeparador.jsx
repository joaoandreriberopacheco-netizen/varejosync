import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  QrCode, 
  CheckCircle, 
  Package, 
  User, 
  MapPin,
  Truck,
  AlertCircle,
  Clock
} from 'lucide-react';

export default function InterfaceSeparador() {
  const queryClient = useQueryClient();
  const [qrInput, setQrInput] = useState('');
  const [pedidoAtual, setPedidoAtual] = useState(null);
  const [clienteAtual, setClienteAtual] = useState(null);
  const [itensSeparados, setItensSeparados] = useState([]);
  const [erro, setErro] = useState('');

  const buscarPedidoMutation = useMutation({
    mutationFn: async (pedidoId) => {
      const pedido = await base44.entities.PedidoVenda.get(pedidoId);
      if (!pedido) throw new Error('Pedido não encontrado');
      
      if (pedido.cliente_id) {
        const cliente = await base44.entities.Terceiro.get(pedido.cliente_id);
        setClienteAtual(cliente);
      }
      
      return pedido;
    },
    onSuccess: (pedido) => {
      setPedidoAtual(pedido);
      setItensSeparados([]);
      setErro('');
      
      // Atualizar status para "Aprovado" (Em Separação)
      if (pedido.status !== 'Aprovado') {
        atualizarStatusMutation.mutate({ pedidoId: pedido.id, novoStatus: 'Aprovado' });
      }
    },
    onError: (error) => {
      setErro('Pedido não encontrado');
      setPedidoAtual(null);
      setClienteAtual(null);
    }
  });

  const atualizarStatusMutation = useMutation({
    mutationFn: async ({ pedidoId, novoStatus }) => {
      return await base44.entities.PedidoVenda.update(pedidoId, { status: novoStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-entrega'] });
    }
  });

  const handleScanQR = (e) => {
    e.preventDefault();
    if (qrInput.trim()) {
      buscarPedidoMutation.mutate(qrInput.trim());
      setQrInput('');
    }
  };

  const handleMarcarItem = (index) => {
    if (itensSeparados.includes(index)) {
      setItensSeparados(itensSeparados.filter(i => i !== index));
    } else {
      setItensSeparados([...itensSeparados, index]);
    }
  };

  const handleFinalizarSeparacao = async () => {
    if (itensSeparados.length !== pedidoAtual.itens.length) {
      setErro('Separe todos os itens antes de finalizar');
      return;
    }

    const novoStatus = pedidoAtual.metodo_entrega === 'Delivery' 
      ? 'Envio Agendado' // Em Rota de Entrega
      : 'Aguardando Retirada'; // Aguardando Retirada

    await atualizarStatusMutation.mutateAsync({ 
      pedidoId: pedidoAtual.id, 
      novoStatus 
    });

    setPedidoAtual(null);
    setClienteAtual(null);
    setItensSeparados([]);
    setErro('');
  };

  const formatValor = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };

  const progressoSeparacao = pedidoAtual 
    ? (itensSeparados.length / pedidoAtual.itens.length) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">SEPARAÇÃO DE PEDIDOS</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">ESCANEIE O QR CODE PARA INICIAR</p>
        </div>

        {/* Scanner QR */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleScanQR} className="space-y-4">
              <div className="flex items-center justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-gray-400" />
                </div>
              </div>
              
              <div className="relative">
                <Input
                  placeholder="DIGITE OU ESCANEIE O CÓDIGO DO PEDIDO"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  className="text-center text-lg h-14"
                  autoFocus
                />
              </div>

              {erro && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400">{erro}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-12" disabled={buscarPedidoMutation.isPending}>
                {buscarPedidoMutation.isPending ? 'BUSCANDO...' : 'INICIAR SEPARAÇÃO'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Pedido em Separação */}
        {pedidoAtual && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Info do Pedido */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                      {pedidoAtual.numero}
                    </h2>
                    {pedidoAtual.senha_atendimento && (
                      <p className="text-sm text-gray-500">SENHA: {pedidoAtual.senha_atendimento}</p>
                    )}
                  </div>
                  <Badge className={pedidoAtual.metodo_entrega === 'Delivery' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                    {pedidoAtual.metodo_entrega === 'Delivery' ? (
                      <>
                        <Truck className="w-3 h-3 mr-1" />
                        DELIVERY
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3 h-3 mr-1" />
                        RETIRADA
                      </>
                    )}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{pedidoAtual.cliente_nome}</span>
                  </div>
                  
                  {clienteAtual?.telefone && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span className="text-xs">📞</span>
                      <span>{clienteAtual.telefone}</span>
                    </div>
                  )}

                  {pedidoAtual.metodo_entrega === 'Delivery' && clienteAtual?.endereco && (
                    <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <div className="text-xs">
                        <p>{clienteAtual.endereco}</p>
                        <p>
                          {clienteAtual.bairro && `${clienteAtual.bairro} - `}
                          {clienteAtual.cidade && `${clienteAtual.cidade}`}
                          {clienteAtual.estado && `/${clienteAtual.estado}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Progresso */}
            <Card className="shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    PROGRESSO DA SEPARAÇÃO
                  </span>
                  <span className="text-sm font-bold text-gray-800 dark:text-white">
                    {itensSeparados.length}/{pedidoAtual.itens.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-green-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progressoSeparacao}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Lista de Itens */}
            <Card className="shadow-lg">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 mb-3">ITENS PARA SEPARAR</h3>
                <div className="space-y-2">
                  {pedidoAtual.itens.map((item, index) => {
                    const separado = itensSeparados.includes(index);
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleMarcarItem(index)}
                        className={`w-full p-4 rounded-lg transition-all ${
                          separado 
                            ? 'bg-green-50 dark:bg-green-900/20 shadow-sm' 
                            : 'bg-white dark:bg-gray-800 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              separado 
                                ? 'bg-green-500 text-white' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                            }`}>
                              {separado ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                <Package className="w-5 h-5" />
                              )}
                            </div>
                            <div className="text-left">
                              <p className={`font-medium ${separado ? 'line-through text-gray-500' : 'text-gray-800 dark:text-white'}`}>
                                {item.produto_nome}
                              </p>
                              <p className="text-xs text-gray-500">
                                QTD: {item.quantidade} • {formatValor(item.total)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Observações */}
            {pedidoAtual.observacoes && (
              <Card className="shadow-lg bg-yellow-50 dark:bg-yellow-900/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">ATENÇÃO</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">{pedidoAtual.observacoes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botão Finalizar */}
            <Button 
              onClick={handleFinalizarSeparacao}
              disabled={itensSeparados.length !== pedidoAtual.itens.length}
              className="w-full h-14 text-lg shadow-lg"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              {pedidoAtual.metodo_entrega === 'Delivery' 
                ? 'FINALIZAR E ENVIAR PARA ENTREGA' 
                : 'FINALIZAR - PRONTO PARA RETIRADA'}
            </Button>

            <Button 
              onClick={() => {
                setPedidoAtual(null);
                setClienteAtual(null);
                setItensSeparados([]);
                setErro('');
              }}
              variant="outline"
              className="w-full"
            >
              CANCELAR
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}