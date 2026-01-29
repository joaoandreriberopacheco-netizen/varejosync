import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Clock, AlertCircle, FileText, Eye, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import OperacaoAuthenticator from '@/components/auth/OperacaoAuthenticator';
import PedidoCompraForm from '@/components/compras/PedidoCompraForm';
import AprovacaoPedidoMobile from '@/components/compras/AprovacaoPedidoMobile';

export default function FinanceiroAprovacoesPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [contas, setContas] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [contaSelecionada, setContaSelecionada] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [showPedidoDetails, setShowPedidoDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('pendentes');
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [solicitacoesEdicao, setSolicitacoesEdicao] = useState([]);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState(null);
  const [isAprovacaoEdicaoAuthOpen, setIsAprovacaoEdicaoAuthOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    
    let pedidoStatusFilter;
    if (activeTab === 'pendentes') {
      pedidoStatusFilter = 'Aguardando Aprovação Financeira';
    } else if (activeTab === 'aprovados') {
      pedidoStatusFilter = 'Aprovado Financeiramente';
    } else if (activeTab === 'rejeitados') {
      pedidoStatusFilter = 'Rejeitado Financeiramente';
    }

    const [pedidosData, contasData, solicitacoesData] = await Promise.all([
      base44.entities.PedidoCompra.filter({ 
        status_aprovacao_financeira: pedidoStatusFilter
      }),
      base44.entities.ContasFinanceiras.filter({ ativo: true }),
      base44.entities.PedidoCompra.filter({
        status_aprovacao_financeira: 'Solicitação de Edição Pendente'
      })
    ]);

    // Para cada pedido, buscar os lançamentos financeiros associados
    const transactionsData = await Promise.all(
      pedidosData.map(async (pedido) => {
        const lancamentos = await base44.entities.LancamentoFinanceiro.filter({
          referencia_id: pedido.id,
          referencia_tipo: 'PedidoCompra'
        });
        return {
          ...pedido,
          lancamentos_financeiros: lancamentos,
          valor_total_lancamentos: lancamentos.reduce((sum, l) => sum + (l.valor || 0), 0)
        };
      })
    );

    setPendingTransactions(transactionsData);
    setContas(contasData);
    setSolicitacoesEdicao(solicitacoesData);
    setIsLoading(false);
  };

  const handleApprove = (pedido) => {
    setSelectedTransaction(pedido);
    setContaSelecionada('');
  };

  const handleReject = (pedido) => {
    setSelectedTransaction(pedido);
    setIsRejectDialogOpen(true);
  };



  const handleInitiateApproval = () => {
    if (!contaSelecionada) {
      toast({
        title: "Conta obrigatória",
        description: "Selecione uma conta para realizar o pagamento.",
        variant: "destructive"
      });
      return;
    }
    setActionType('approve');
    setIsAuthOpen(true);
  };



  const handleConfirmReject = () => {
    if (!motivoRejeicao.trim()) {
      toast({
        title: 'Motivação obrigatória',
        description: 'Informe o motivo da rejeição para feedback ao setor de compras.',
        variant: 'destructive'
      });
      return;
    }
    setIsRejectDialogOpen(false);
    setActionType('reject');
    setIsAuthOpen(true);
  };

  const handleAuthSuccess = async (authData) => {
    try {
      if (actionType === 'approve') {
        const pedido = selectedTransaction;
        const authNote = `\n[Aprovado Financeiramente: ${authData.intervenienteName} | Ref: ${authData.operationCode} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}]`;
        
        // Atualizar pedido
        await base44.entities.PedidoCompra.update(pedido.id, {
          status: 'Aguardando Recepção',
          status_aprovacao_financeira: 'Aprovado Financeiramente',
          data_aprovacao_financeira: new Date().toISOString(),
          conta_pagamento_id: contaSelecionada,
          historico: (pedido.historico || '') + authNote
        });

        // Atualizar todos os lançamentos financeiros associados
        const lancamentos = await base44.entities.LancamentoFinanceiro.filter({
          referencia_id: pedido.id,
          referencia_tipo: 'PedidoCompra'
        });

        await Promise.all(
          lancamentos.map(lancamento =>
            base44.entities.LancamentoFinanceiro.update(lancamento.id, {
              status: 'Em Aberto',
              conta_pagamento_id: contaSelecionada
            })
          )
        );

        toast({
          title: "✓ Pagamento aprovado",
          description: "Pedido aprovado. Logística liberada.",
          className: "bg-gray-100 text-gray-800"
        });
      } else if (actionType === 'reject') {
        const pedido = selectedTransaction;

        // Atualizar pedido
        await base44.entities.PedidoCompra.update(pedido.id, {
          status: 'Cancelado',
          status_aprovacao_financeira: 'Rejeitado Financeiramente',
          motivo_rejeicao_financeira: motivoRejeicao,
          data_rejeicao_financeira: new Date().toISOString(),
          historico: (pedido.historico || '') + `\n[Rejeitado Financeiramente: ${motivoRejeicao} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}]`
        });

        // Cancelar todos os lançamentos financeiros associados
        const lancamentos = await base44.entities.LancamentoFinanceiro.filter({
          referencia_id: pedido.id,
          referencia_tipo: 'PedidoCompra'
        });

        await Promise.all(
          lancamentos.map(lancamento =>
            base44.entities.LancamentoFinanceiro.update(lancamento.id, {
              status: 'Cancelado'
            })
          )
        );

        toast({
          title: "Pedido rejeitado",
          description: "Feedback registrado para o setor de compras.",
          variant: "destructive"
        });
      }

      loadData();
      setSelectedTransaction(null);
      setIsAuthOpen(false);
      setMotivoRejeicao('');
      setContaSelecionada('');
    } catch (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (value) => {
    return `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };



  const filteredPedidos = pendingTransactions.filter(pedido => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      pedido.numero?.toLowerCase().includes(search) ||
      pedido.fornecedor_nome?.toLowerCase().includes(search) ||
      pedido.observacoes?.toLowerCase().includes(search)
    );
  });

  const totalPendente = pendingTransactions.reduce((sum, p) => sum + (p.valor_total || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-medium text-gray-800 dark:text-gray-200 mb-1">Aprovações Financeiras</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie pagamentos e histórico de aprovações</p>
      </div>

      <div className="grid grid-cols-2 gap-6 pb-6 border-b border-gray-200 dark:border-gray-700">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total {activeTab === 'pendentes' ? 'Pendente' : activeTab === 'aprovados' ? 'Aprovado' : 'Rejeitado'}</div>
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">{formatCurrency(totalPendente)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pedidos</div>
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">{pendingTransactions.length}</div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <TabsTrigger value="pendentes" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
              <Clock className="w-4 h-4 mr-2" />
              Pendentes
            </TabsTrigger>
            <TabsTrigger value="aprovados" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Aprovados
            </TabsTrigger>
            <TabsTrigger value="rejeitados" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
              <XCircle className="w-4 h-4 mr-2" />
              Rejeitados
            </TabsTrigger>
          </TabsList>

          {solicitacoesEdicao.length > 0 && (
            <Badge className="bg-orange-100 text-orange-800 border-0 shadow-sm">
              <AlertCircle className="w-3 h-3 mr-1" />
              {solicitacoesEdicao.length} {solicitacoesEdicao.length === 1 ? 'solicitação' : 'solicitações'} de edição
            </Badge>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input 
            placeholder="Buscar por pedido, fornecedor ou descrição..."
            className="pl-11 bg-gray-50 dark:bg-gray-800 border-0 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <TabsContent value={activeTab} className="mt-0">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3 animate-spin" />
              <p>Carregando...</p>
            </div>
          ) : filteredPedidos.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                {searchTerm ? 'Nenhum resultado encontrado' : `Nenhum pedido ${activeTab === 'pendentes' ? 'pendente' : activeTab === 'aprovados' ? 'aprovado' : 'rejeitado'}`}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Tente outro termo de busca' : `Não há pedidos ${activeTab} no momento`}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block border-0 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-gray-800">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-900/80">
                    <TableRow className="border-0">
                      <TableHead className="text-gray-700 dark:text-gray-300">Pedido</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300">Fornecedor</TableHead>
                      <TableHead className="text-center text-gray-700 dark:text-gray-300">Itens</TableHead>
                      <TableHead className="text-right text-gray-700 dark:text-gray-300">Valor Total</TableHead>
                      {activeTab === 'aprovados' && (
                        <TableHead className="text-gray-700 dark:text-gray-300">Data Aprovação</TableHead>
                      )}
                      {activeTab === 'rejeitados' && (
                        <TableHead className="text-gray-700 dark:text-gray-300">Motivo</TableHead>
                      )}
                      <TableHead className="text-right text-gray-700 dark:text-gray-300">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPedidos.map((pedido) => {
                      return (
                        <TableRow key={pedido.id} className={`border-0 hover:bg-gray-50 dark:hover:bg-gray-900/50 ${
                          activeTab === 'aprovados' ? 'bg-green-50/50 dark:bg-green-900/10' :
                          activeTab === 'rejeitados' ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                        }`}>
                          <TableCell className="font-medium text-gray-800 dark:text-gray-200">
                            {pedido.numero}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400">
                            {pedido.fornecedor_nome}
                          </TableCell>
                          <TableCell className="text-center text-gray-600 dark:text-gray-400">
                            {pedido.itens?.length || 0}
                          </TableCell>
                          <TableCell className="text-right font-bold text-gray-800 dark:text-gray-200">
                            {formatCurrency(pedido.valor_total)}
                          </TableCell>
                          {activeTab === 'aprovados' && (
                            <TableCell className="text-gray-600 dark:text-gray-400 text-xs">
                              {pedido.data_aprovacao_financeira ? format(new Date(pedido.data_aprovacao_financeira), 'dd/MM/yyyy HH:mm') : '-'}
                            </TableCell>
                          )}
                          {activeTab === 'rejeitados' && (
                            <TableCell className="text-gray-600 dark:text-gray-400 max-w-xs truncate text-xs">
                              {pedido.motivo_rejeicao_financeira || 'Sem motivo'}
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={async () => {
                                  const pedidos = await base44.entities.PedidoCompra.filter({ id: pedido.id });
                                  setSelectedPedido(pedidos[0]);
                                  setShowPedidoDetails(true);
                                }}
                                title="Ver Detalhes"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {activeTab === 'pendentes' && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleReject(pedido)}
                                    title="Rejeitar"
                                  >
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  </Button>
                                  <Button 
                                    size="icon"
                                    className="bg-gray-700 hover:bg-gray-600"
                                    onClick={() => handleApprove(pedido)}
                                    title="Aprovar"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-4">
                {filteredPedidos.map((pedido) => {
                  return (
                    <Card key={pedido.id} className={`p-6 hover:shadow-lg transition-shadow border-0 shadow-sm ${
                      activeTab === 'aprovados' ? 'bg-green-50 dark:bg-green-900/20' :
                      activeTab === 'rejeitados' ? 'bg-red-50 dark:bg-red-900/20' :
                      'bg-white dark:bg-gray-800'
                    }`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                              {pedido.numero}
                            </h3>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <p><span className="font-medium">Fornecedor:</span> {pedido.fornecedor_nome}</p>
                            <p><span className="font-medium">Itens:</span> {pedido.itens?.length || 0}</p>
                            {activeTab === 'aprovados' && pedido.data_aprovacao_financeira && (
                              <p className="text-green-600 dark:text-green-400">
                                <span className="font-medium">Aprovado em:</span> {format(new Date(pedido.data_aprovacao_financeira), 'dd/MM/yyyy HH:mm')}
                              </p>
                            )}
                            {activeTab === 'rejeitados' && (
                              <p className="text-red-600 dark:text-red-400">
                                <span className="font-medium">Motivo:</span> {pedido.motivo_rejeicao_financeira || 'Sem motivo'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Valor Total</div>
                          <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">{formatCurrency(pedido.valor_total)}</div>
                        </div>
                      </div>

                      <div className="flex gap-3 justify-end">
                        <Button 
                          variant="outline" 
                          className="gap-2 border-0 shadow-sm"
                          onClick={async () => {
                            const pedidos = await base44.entities.PedidoCompra.filter({ id: pedido.id });
                            setSelectedPedido(pedidos[0]);
                            setShowPedidoDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                          Ver
                        </Button>
                        {activeTab === 'pendentes' && (
                          <>
                            <Button 
                              variant="outline" 
                              className="gap-2 border-0 shadow-sm"
                              onClick={() => handleReject(pedido)}
                            >
                              <XCircle className="w-4 h-4" />
                              Rejeitar
                            </Button>
                            <Button 
                              className="gap-2 bg-gray-700 hover:bg-gray-600"
                              onClick={() => handleApprove(pedido)}
                            >
                              <CheckCircle className="w-4 h-4" />
                              Aprovar
                            </Button>
                          </>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedTransaction && !isAuthOpen && !isRejectDialogOpen} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent className="dark:bg-gray-800 border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-gray-200">
              Aprovar Pagamento
            </DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-6 py-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
                      {selectedTransaction.numero}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Pedido de compra com {selectedTransaction.itens?.length || 0} itens
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fornecedor</div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {selectedTransaction.fornecedor_nome}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Criado em</div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {selectedTransaction.created_date ? format(new Date(selectedTransaction.created_date), 'dd/MM/yyyy') : '-'}
                  </div>
                </div>
              </div>

              <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Valor Total</div>
                <div className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                  {formatCurrency(selectedTransaction.valor_total)}
                </div>
              </div>

              <div>
                <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
                  Conta de Pagamento *
                </Label>
                <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-0 shadow-sm">
                    <SelectValue placeholder="Selecione a conta..." />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 border-0 shadow-lg">
                    {contas.map(conta => (
                      <SelectItem key={conta.id} value={conta.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{conta.nome}</span>
                          <span className="text-xs text-gray-500 ml-3">
                            {formatCurrency(conta.saldo_atual)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSelectedTransaction(null)}
              className="border-0 shadow-sm"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleInitiateApproval}
              className="bg-gray-700 hover:bg-gray-600"
              disabled={!contaSelecionada}
            >
              Autenticar e Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="dark:bg-gray-800 border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-gray-200">
              Rejeitar Pagamento
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
                    Feedback para o setor de compras
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Informe o motivo da rejeição para futuras reuniões de alinhamento
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
                Motivo da Rejeição *
              </Label>
              <Textarea 
                placeholder="Ex: Orçamento ultrapassado, fornecedor não homologado, prazo incompatível..."
                className="bg-gray-50 dark:bg-gray-700 border-0 shadow-sm resize-none"
                rows={4}
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsRejectDialogOpen(false);
                setMotivoRejeicao('');
              }}
              className="border-0 shadow-sm"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmReject}
              variant="destructive"
              disabled={!motivoRejeicao.trim()}
            >
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OperacaoAuthenticator 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
        operationName={`${actionType === 'approve' ? 'Aprovar' : 'Rejeitar'} Pagamento ${selectedTransaction?.numero || ''}`}
      />

      {isMobile && selectedPedido && showPedidoDetails && activeTab === 'pendentes' ? (
        <AprovacaoPedidoMobile
          pedido={selectedPedido}
          contas={contas}
          onApprove={(pedido, contaId) => {
            setSelectedTransaction(pedido);
            setContaSelecionada(contaId);
            setShowPedidoDetails(false);
            setActionType('approve');
            setIsAuthOpen(true);
          }}
          onReject={(pedido, motivo) => {
            setSelectedTransaction(pedido);
            setMotivoRejeicao(motivo);
            setShowPedidoDetails(false);
            setActionType('reject');
            setIsAuthOpen(true);
          }}
          onClose={() => {
            setShowPedidoDetails(false);
            setSelectedPedido(null);
          }}
        />
      ) : showPedidoDetails && selectedPedido ? (
        <Dialog open={showPedidoDetails} onOpenChange={setShowPedidoDetails}>
          <PedidoCompraForm 
            pedido={selectedPedido}
            onClose={() => {
              setShowPedidoDetails(false);
              setSelectedPedido(null);
            }}
            onSave={async () => {
              setShowPedidoDetails(false);
              setSelectedPedido(null);
            }}
          />
        </Dialog>
      ) : null}

      {/* Solicitações de Edição */}
      {solicitacoesEdicao.length > 0 && (
        <div className="mt-8 pt-8 border-t-2 border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            <h2 className="text-xl font-medium text-gray-800 dark:text-gray-200">Solicitações de Edição</h2>
          </div>

          <div className="space-y-4">
            {solicitacoesEdicao.map(pedido => (
              <Card key={pedido.id} className="p-6 border-0 shadow-sm bg-orange-50 dark:bg-orange-900/20">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                      {pedido.numero}
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Solicitante:</span> {pedido.solicitacao_edicao_solicitante}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Data:</span> {pedido.solicitacao_edicao_data ? format(new Date(pedido.solicitacao_edicao_data), 'dd/MM/yyyy HH:mm') : '-'}
                      </p>
                      <p className="text-orange-700 dark:text-orange-300 font-medium">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Motivo:</span> {pedido.solicitacao_edicao_motivo}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const pedidos = await base44.entities.PedidoCompra.filter({ id: pedido.id });
                        setSelectedPedido(pedidos[0]);
                        setShowPedidoDetails(true);
                      }}
                      className="border-0 shadow-sm"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSolicitacao(pedido);
                        setIsAprovacaoEdicaoAuthOpen(true);
                      }}
                      className="bg-gray-700 text-white hover:bg-gray-600 border-0"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Liberar Edição
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dialog de Autenticação para Liberar Edição */}
      <OperacaoAuthenticator 
        isOpen={isAprovacaoEdicaoAuthOpen}
        onClose={() => setIsAprovacaoEdicaoAuthOpen(false)}
        onSuccess={async (authData) => {
          try {
            await base44.entities.PedidoCompra.update(selectedSolicitacao.id, {
              status_aprovacao_financeira: 'Pendente',
              status: 'Rascunho',
              historico: (selectedSolicitacao.historico || '') + 
                `\n[Liberado para Edição: ${authData.intervenienteName} | Ref: ${authData.operationCode} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}]`
            });

            toast({
              title: "Edição liberada",
              description: "O pedido foi liberado para edição pelo setor de compras.",
              className: "bg-gray-100 text-gray-800"
            });

            loadData();
            setIsAprovacaoEdicaoAuthOpen(false);
            setSelectedSolicitacao(null);
          } catch (error) {
            toast({
              title: "Erro",
              description: error.message,
              variant: "destructive"
            });
          }
        }}
        operationName={`Liberar Edição - ${selectedSolicitacao?.numero}`}
      />
    </div>
  );
}