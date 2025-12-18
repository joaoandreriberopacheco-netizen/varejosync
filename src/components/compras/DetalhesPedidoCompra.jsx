import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from '@/api/base44Client';
import {
  ShoppingCart,
  User,
  Calendar,
  Clock,
  DollarSign,
  Package,
  FileText,
  Truck,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Ship,
  MapPin } from
'lucide-react';
import { format } from 'date-fns';

export default function DetalhesPedidoCompra({ pedido, isOpen, onClose }) {
  const [lancamentosFinanceiros, setLancamentosFinanceiros] = useState([]);
  const [movimentosEstoque, setMovimentosEstoque] = useState([]);
  const [eventoLogistico, setEventoLogistico] = useState(null);

  useEffect(() => {
    if (pedido && isOpen) {
      loadDadosAdicionais();
    }
  }, [pedido, isOpen]);

  const loadDadosAdicionais = async () => {
    try {
      // Buscar lançamentos financeiros relacionados
      const lancamentos = await base44.entities.LancamentoFinanceiro.filter({
        referencia_id: pedido.id,
        referencia_tipo: 'PedidoCompra'
      });
      setLancamentosFinanceiros(lancamentos);

      // Buscar movimentações de estoque relacionadas
      const movimentos = await base44.entities.MovimentacaoEstoque.filter({
        referencia_id: pedido.id,
        referencia_tipo: 'PedidoCompra'
      });
      setMovimentosEstoque(movimentos);

      // Buscar Evento Logístico
      if (pedido.evento_logistico_id) {
        const evento = await base44.entities.EventosLogisticos.get(pedido.evento_logistico_id);
        setEventoLogistico(evento);
      }
    } catch (error) {
      console.error('Erro ao carregar dados adicionais:', error);
    }
  };

  if (!pedido) return null;

  const formatValor = (valor) => {
    return `R$ ${(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'Rascunho': 'bg-gray-100 text-gray-800',
      'Enviado': 'bg-blue-100 text-blue-800',
      'Aguardando Recepção': 'bg-yellow-100 text-yellow-800',
      'Recebido Parcialmente': 'bg-orange-100 text-orange-800',
      'Recebido': 'bg-emerald-100 text-emerald-800',
      'Recebido com Discrepância': 'bg-red-100 text-red-800',
      'Cancelado': 'bg-red-100 text-red-800'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white p-6 z-50 grid w-full !max-w-[95vw] !w-[95vw] gap-4 border shadow-lg duration-200 sm:rounded-lg dark:bg-gray-900 max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShoppingCart className="w-6 h-6 text-teal-600" />
            Detalhes do Pedido de Compra
          </DialogTitle>
        </DialogHeader>

        {/* Cabeçalho Compacto */}
        <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200">
          <CardContent className="px-5 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500 mb-1">Número</div>
                <div className="font-bold text-lg text-teal-700">{pedido.numero}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Status</div>
                <Badge className={getStatusBadge(pedido.status)}>{pedido.status}</Badge>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Data Criação</div>
                <div className="font-semibold">
                  {pedido.created_date ? format(new Date(pedido.created_date), 'dd/MM/yyyy HH:mm') : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Valor Total</div>
                <div className="font-bold text-xl text-teal-600">{formatValor(pedido.valor_total)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Fornecedor</div>
                <div className="font-semibold">{pedido.fornecedor_nome || 'Não informado'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Previsão Entrega</div>
                <div className="font-semibold">
                  {pedido.data_prevista_entrega ? format(new Date(pedido.data_prevista_entrega), 'dd/MM/yyyy') : 'Não definida'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Criado por</div>
                <div className="font-semibold">{pedido.created_by || 'Sistema'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Abas de Conteúdo */}
        <Tabs defaultValue="detalhes" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100">
            <TabsTrigger value="detalhes" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Detalhes</span>
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="gap-2">
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Financeiro</span>
            </TabsTrigger>
            <TabsTrigger value="estoque" className="gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Estoque</span>
            </TabsTrigger>
            <TabsTrigger value="logistica" className="gap-2">
              <Ship className="w-4 h-4" />
              <span className="hidden sm:inline">Logística</span>
            </TabsTrigger>
          </TabsList>

          {/* ABA: DETALHES */}
          <TabsContent value="detalhes" className="space-y-4 mt-4">
            {/* Itens do Pedido */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-5 h-5 text-teal-600" />
                  Itens do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Custo Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pedido.itens && pedido.itens.length > 0 ?
                    pedido.itens.map((item, idx) =>
                    <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{item.produto_id || '-'}</TableCell>
                          <TableCell className="font-medium">{item.produto_nome}</TableCell>
                          <TableCell className="text-right">{item.quantidade}</TableCell>
                          <TableCell className="text-right">{formatValor(item.custo_unitario)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatValor(item.total)}</TableCell>
                        </TableRow>
                    ) :

                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500">
                          Nenhum item cadastrado
                        </TableCell>
                      </TableRow>
                    }
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Resumo Financeiro */}
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Valor Total:</span>
                  <span className="font-bold text-2xl text-teal-600">{formatValor(pedido.valor_total)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            {pedido.tags && pedido.tags.length > 0 &&
            <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {pedido.tags.map((tag, idx) =>
                  <Badge key={idx} variant="outline">{tag}</Badge>
                  )}
                  </div>
                </CardContent>
              </Card>
            }

            {/* Observações */}
            {pedido.observacoes &&
            <Card>
                <CardHeader>
                  <CardTitle className="text-base">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700">{pedido.observacoes}</p>
                </CardContent>
              </Card>
            }
          </TabsContent>

          {/* ABA: FINANCEIRO */}
          <TabsContent value="financeiro" className="space-y-4 mt-4">
            {/* Resumo Financeiro */}
            <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-8 h-8 text-yellow-600" />
                    <div>
                      <div className="text-sm text-gray-600">Valor Total do Pedido</div>
                      <div className="text-2xl font-bold text-yellow-700">{formatValor(pedido.valor_total)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lançamentos Financeiros (Contas a Pagar) */}
            {lancamentosFinanceiros.length > 0 ?
            <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-teal-600" />
                    Contas a Pagar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lancamentosFinanceiros.map((lanc) =>
                    <TableRow key={lanc.id}>
                          <TableCell className="font-medium">{lanc.descricao}</TableCell>
                          <TableCell>
                            {lanc.data_vencimento ? format(new Date(lanc.data_vencimento), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell>
                            {lanc.data_pagamento ? format(new Date(lanc.data_pagamento), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                        lanc.status === 'Pago' ? 'bg-green-100 text-green-800' :
                        lanc.status === 'Vencido' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                        }>
                              {lanc.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatValor(lanc.valor)}</TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card> :

            <Card>
                <CardContent className="py-12">
                  <div className="text-center text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Nenhum lançamento financeiro registrado</p>
                    <p className="text-sm mt-1">Os lançamentos serão criados quando o pedido for enviado</p>
                  </div>
                </CardContent>
              </Card>
            }
          </TabsContent>

          {/* ABA: LOGÍSTICA */}
          <TabsContent value="logistica" className="space-y-4 mt-4">
            {eventoLogistico ?
            <Card className="bg-blue-50 border-blue-100">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                    <Ship className="w-5 h-5" />
                    Evento Logístico Vinculado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-blue-600 uppercase mb-1">Viagem</div>
                      <div className="font-bold text-lg text-blue-900">{eventoLogistico.nome}</div>
                      <div className="text-sm text-blue-700">{eventoLogistico.transportadora}</div>
                    </div>
                    <div>
                      <div className="text-xs text-blue-600 uppercase mb-1">Previsão Chegada</div>
                      <div className="font-bold text-lg text-blue-900">
                        {eventoLogistico.data_previsao_chegada ? format(new Date(eventoLogistico.data_previsao_chegada), 'dd/MM/yyyy HH:mm') : '-'}
                      </div>
                      <Badge variant="outline" className="mt-1 bg-white text-blue-700 border-blue-200">
                        {eventoLogistico.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card> :

            <Card className="border-dashed">
                <CardContent className="py-8 text-center text-gray-500">
                  <Truck className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>Este pedido não está vinculado a nenhum evento logístico.</p>
                </CardContent>
              </Card>
            }

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Dados da Carga</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Volumes</div>
                      <div className="text-xl font-semibold">{pedido.qtd_volumes || 0} <span className="text-sm font-normal text-gray-500">{pedido.tipo_volume || 'Caixas'}</span></div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Peso Total</div>
                      <div className="text-xl font-semibold">{pedido.peso_total_kg || 0} <span className="text-sm font-normal text-gray-500">kg</span></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Checklist Documental</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Nota Fiscal Emitida</span>
                      {pedido.nfe_emitida ?
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Sim</Badge> :

                      <Badge variant="outline" className="text-gray-500">Pendente</Badge>
                      }
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Manifesto Conferido</span>
                      {pedido.manifesto_conferido ?
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Sim</Badge> :

                      <Badge variant="outline" className="text-gray-500">Pendente</Badge>
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ABA: ESTOQUE */}
          <TabsContent value="estoque" className="space-y-4 mt-4">
            {/* Status de Recebimento */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-5 h-5 text-teal-600" />
                  Status de Recebimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pedido.itens && pedido.itens.map((item, idx) =>
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.produto_nome}</div>
                        <div className="text-sm text-gray-500">Qtd Solicitada: {item.quantidade}</div>
                      </div>
                      <div className="text-right">
                        {pedido.status === 'Recebido' ?
                      <Badge className="bg-green-100 text-green-800 gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Recebido
                          </Badge> :
                      pedido.status === 'Recebido Parcialmente' ?
                      <Badge className="bg-orange-100 text-orange-800">
                            Parcial
                          </Badge> :
                      pedido.status === 'Aguardando Recepção' ?
                      <Badge className="bg-yellow-100 text-yellow-800">
                            Aguardando
                          </Badge> :

                      <Badge className="bg-gray-100 text-gray-800">
                            Pendente
                          </Badge>
                      }
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Movimentações de Estoque */}
            {movimentosEstoque.length > 0 ?
            <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-5 h-5 text-teal-600" />
                    Movimentações de Estoque
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Quantidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movimentosEstoque.map((mov) =>
                    <TableRow key={mov.id}>
                          <TableCell className="font-medium">{mov.produto_nome}</TableCell>
                          <TableCell>
                            <Badge className={mov.tipo === 'Entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {mov.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {mov.created_date ? format(new Date(mov.created_date), 'dd/MM/yyyy HH:mm') : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{mov.quantidade}</TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card> :

            <Card>
                <CardContent className="py-12">
                  <div className="text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">Nenhuma movimentação de estoque registrada</p>
                    <p className="text-sm mt-1">As movimentações serão criadas após a recepção</p>
                  </div>
                </CardContent>
              </Card>
            }
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>);

}