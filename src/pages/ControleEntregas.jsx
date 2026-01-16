import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  Search,
  Filter,
  Calendar,
  User,
  MapPin,
  Phone,
  DollarSign,
  QrCode,
  ChevronRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LiberacaoEntrega from '@/components/vendas/LiberacaoEntrega';

export default function ControleEntregas() {
  const queryClient = useQueryClient();
  const [filtros, setFiltros] = useState({
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: new Date().toISOString().split('T')[0],
    status: 'todos',
    cliente: '',
    metodo_entrega: 'todos'
  });

  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [mostrarLiberacao, setMostrarLiberacao] = useState(false);
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);

  // Buscar pedidos
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos-entrega', filtros],
    queryFn: async () => {
      const dataInicio = new Date(filtros.data_inicio);
      dataInicio.setHours(0, 0, 0, 0);
      
      const dataFim = new Date(filtros.data_fim);
      dataFim.setHours(23, 59, 59, 999);

      const query = {
        created_date: {
          $gte: dataInicio.toISOString(),
          $lte: dataFim.toISOString()
        },
        status: {
          $in: ['Aguardando Caixa', 'Aguardando Pagamento', 'Aprovado', 'Aguardando Retirada', 'Envio Agendado', 'Finalizado']
        }
      };

      if (filtros.status !== 'todos') {
        query.status = filtros.status;
      }

      if (filtros.metodo_entrega !== 'todos') {
        query.metodo_entrega = filtros.metodo_entrega;
      }

      if (filtros.cliente) {
        query.cliente_nome = { $regex: filtros.cliente, $options: 'i' };
      }

      const resultado = await base44.entities.PedidoVenda.filter(query, '-created_date', 200);
      return resultado;
    }
  });

  // Mutation para atualizar status
  const atualizarStatusMutation = useMutation({
    mutationFn: async ({ pedidoId, novoStatus }) => {
      return await base44.entities.PedidoVenda.update(pedidoId, { status: novoStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-entrega'] });
    }
  });

  const getStatusConfig = (status) => {
    const configs = {
      'Aguardando Caixa': { cor: 'bg-yellow-100 text-yellow-800', icone: Clock, label: 'AGUARDANDO CAIXA' },
      'Aguardando Pagamento': { cor: 'bg-orange-100 text-orange-800', icone: DollarSign, label: 'AGUARDANDO PAGAMENTO' },
      'Aprovado': { cor: 'bg-blue-100 text-blue-800', icone: Package, label: 'EM SEPARAÇÃO' },
      'Aguardando Retirada': { cor: 'bg-purple-100 text-purple-800', icone: MapPin, label: 'AGUARDANDO RETIRADA' },
      'Envio Agendado': { cor: 'bg-indigo-100 text-indigo-800', icone: Truck, label: 'EM ROTA DE ENTREGA' },
      'Finalizado': { cor: 'bg-green-100 text-green-800', icone: CheckCircle, label: 'CONCLUÍDO' }
    };
    return configs[status] || { cor: 'bg-gray-100 text-gray-800', icone: Clock, label: status };
  };

  const handleAbrirDetalhes = async (pedido) => {
    setPedidoSelecionado(pedido);
    
    // Buscar dados do cliente
    if (pedido.cliente_id) {
      const cliente = await base44.entities.Terceiro.get(pedido.cliente_id);
      setClienteSelecionado(cliente);
    }
    
    setMostrarDetalhes(true);
  };

  const handleMostrarLiberacao = async (pedido) => {
    setPedidoSelecionado(pedido);
    
    // Buscar dados do cliente
    if (pedido.cliente_id) {
      const cliente = await base44.entities.Terceiro.get(pedido.cliente_id);
      setClienteSelecionado(cliente);
    }
    
    setMostrarLiberacao(true);
  };

  const handleAtualizarStatus = async (pedidoId, novoStatus) => {
    await atualizarStatusMutation.mutateAsync({ pedidoId, novoStatus });
  };

  const formatValor = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };

  // Estatísticas
  const stats = {
    total: pedidos.length,
    emSeparacao: pedidos.filter(p => p.status === 'Aprovado').length,
    emRota: pedidos.filter(p => p.status === 'Envio Agendado').length,
    concluidos: pedidos.filter(p => p.status === 'Finalizado').length,
    valorTotal: pedidos.reduce((sum, p) => sum + (p.valor_total || 0), 0)
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">CONTROLE DE ENTREGAS E SEPARAÇÃO</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">ACOMPANHE O STATUS DOS PEDIDOS EM TEMPO REAL</p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</div>
            <div className="text-xs text-gray-500">TOTAL PEDIDOS</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.emSeparacao}</div>
            <div className="text-xs text-gray-500">EM SEPARAÇÃO</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-600">{stats.emRota}</div>
            <div className="text-xs text-gray-500">EM ROTA</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.concluidos}</div>
            <div className="text-xs text-gray-500">CONCLUÍDOS</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-lg font-bold text-gray-800 dark:text-white">{formatValor(stats.valorTotal)}</div>
            <div className="text-xs text-gray-500">VALOR TOTAL</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">FILTROS</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">DATA INÍCIO</label>
              <Input
                type="date"
                value={filtros.data_inicio}
                onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">DATA FIM</label>
              <Input
                type="date"
                value={filtros.data_fim}
                onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">STATUS</label>
              <Select value={filtros.status} onValueChange={(value) => setFiltros({ ...filtros, status: value })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">TODOS</SelectItem>
                  <SelectItem value="Aprovado">EM SEPARAÇÃO</SelectItem>
                  <SelectItem value="Aguardando Retirada">AGUARDANDO RETIRADA</SelectItem>
                  <SelectItem value="Envio Agendado">EM ROTA DE ENTREGA</SelectItem>
                  <SelectItem value="Finalizado">CONCLUÍDO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">ENTREGA</label>
              <Select value={filtros.metodo_entrega} onValueChange={(value) => setFiltros({ ...filtros, metodo_entrega: value })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">TODOS</SelectItem>
                  <SelectItem value="Delivery">DELIVERY</SelectItem>
                  <SelectItem value="Retirada">RETIRADA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">CLIENTE</label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="BUSCAR..."
                  value={filtros.cliente}
                  onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}
                  className="h-9 pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pedidos */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">CARREGANDO PEDIDOS...</div>
        ) : pedidos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">NENHUM PEDIDO ENCONTRADO</div>
        ) : (
          pedidos.map((pedido) => {
            const statusConfig = getStatusConfig(pedido.status);
            const StatusIcon = statusConfig.icone;
            
            return (
              <Card key={pedido.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      {/* Linha 1: Identificação */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-lg font-bold text-gray-800 dark:text-white">
                          {pedido.numero}
                        </span>
                        {pedido.senha_atendimento && (
                          <Badge variant="outline" className="text-sm font-mono">
                            SENHA: {pedido.senha_atendimento}
                          </Badge>
                        )}
                        <Badge className={statusConfig.cor}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        {pedido.metodo_entrega === 'Delivery' && (
                          <Badge variant="outline" className="text-xs">
                            <Truck className="w-3 h-3 mr-1" />
                            DELIVERY
                          </Badge>
                        )}
                      </div>

                      {/* Linha 2: Cliente e Valor */}
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{pedido.cliente_nome}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(pedido.created_date).toLocaleDateString('pt-BR')}</span>
                          <span className="text-xs">
                            {new Date(pedido.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-semibold text-gray-800 dark:text-white">
                          <DollarSign className="w-4 h-4" />
                          <span>{formatValor(pedido.valor_total)}</span>
                        </div>
                      </div>

                      {/* Linha 3: Itens */}
                      <div className="text-xs text-gray-500">
                        {pedido.itens?.length} {pedido.itens?.length === 1 ? 'ITEM' : 'ITENS'} • {' '}
                        {pedido.itens?.slice(0, 2).map(i => i.produto_nome).join(', ')}
                        {pedido.itens?.length > 2 && '...'}
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMostrarLiberacao(pedido)}
                        className="text-xs"
                      >
                        <QrCode className="w-4 h-4 mr-1" />
                        QR CODE
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAbrirDetalhes(pedido)}
                        className="text-xs"
                      >
                        DETALHES
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialog de Detalhes */}
      <Dialog open={mostrarDetalhes} onOpenChange={setMostrarDetalhes}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>DETALHES DO PEDIDO {pedidoSelecionado?.numero}</DialogTitle>
          </DialogHeader>
          
          {pedidoSelecionado && (
            <div className="space-y-4">
              {/* Informações do Cliente */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">CLIENTE</h3>
                  <p className="font-semibold">{pedidoSelecionado.cliente_nome}</p>
                  {clienteSelecionado && (
                    <div className="text-sm text-gray-600 space-y-1 mt-2">
                      {clienteSelecionado.telefone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span>{clienteSelecionado.telefone}</span>
                        </div>
                      )}
                      {clienteSelecionado.endereco && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5" />
                          <div>
                            <p>{clienteSelecionado.endereco}</p>
                            <p>
                              {clienteSelecionado.bairro && `${clienteSelecionado.bairro} - `}
                              {clienteSelecionado.cidade && `${clienteSelecionado.cidade}`}
                              {clienteSelecionado.estado && `/${clienteSelecionado.estado}`}
                              {clienteSelecionado.cep && ` - CEP: ${clienteSelecionado.cep}`}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Itens do Pedido */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">ITENS</h3>
                  <div className="space-y-2">
                    {pedidoSelecionado.itens?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.quantidade}x {item.produto_nome}</span>
                        <span className="font-semibold">{formatValor(item.total)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Ações de Status */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">ALTERAR STATUS</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {pedidoSelecionado.status !== 'Aprovado' && (
                      <Button
                        onClick={() => handleAtualizarStatus(pedidoSelecionado.id, 'Aprovado')}
                        size="sm"
                        variant="outline"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        EM SEPARAÇÃO
                      </Button>
                    )}
                    {pedidoSelecionado.metodo_entrega === 'Retirada' && pedidoSelecionado.status !== 'Aguardando Retirada' && (
                      <Button
                        onClick={() => handleAtualizarStatus(pedidoSelecionado.id, 'Aguardando Retirada')}
                        size="sm"
                        variant="outline"
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        AGUARDANDO RETIRADA
                      </Button>
                    )}
                    {pedidoSelecionado.metodo_entrega === 'Delivery' && pedidoSelecionado.status !== 'Envio Agendado' && (
                      <Button
                        onClick={() => handleAtualizarStatus(pedidoSelecionado.id, 'Envio Agendado')}
                        size="sm"
                        variant="outline"
                      >
                        <Truck className="w-4 h-4 mr-2" />
                        EM ROTA
                      </Button>
                    )}
                    {pedidoSelecionado.status !== 'Finalizado' && (
                      <Button
                        onClick={() => handleAtualizarStatus(pedidoSelecionado.id, 'Finalizado')}
                        size="sm"
                        variant="outline"
                        className="col-span-2"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        MARCAR COMO CONCLUÍDO
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Liberação para Entrega */}
      {mostrarLiberacao && (
        <LiberacaoEntrega
          open={mostrarLiberacao}
          onClose={() => setMostrarLiberacao(false)}
          pedido={pedidoSelecionado}
          cliente={clienteSelecionado}
        />
      )}
    </div>
  );
}