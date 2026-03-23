import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from '@/api/base44Client';
import { 
  Receipt, 
  User, 
  Calendar, 
  DollarSign, 
  CreditCard,
  Package,
  Truck,
  FileText,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Hash,
  Clock,
  ShoppingBag,
  Banknote,
  ArrowLeft,
  MoreVertical,
  Share2
} from 'lucide-react';
const TZ = 'America/Rio_Branco';
const fmtDtHora = (d) => d ? new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) : 'N/A';
const fmtData = (d) => !d ? '-' : new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(typeof d === 'string' && d.length === 10 ? new Date(d + 'T12:00:00') : new Date(d));
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ComprovantePreVenda from '@/components/vendas/ComprovantePreVenda';
import ComprovanteCompra from '@/components/vendas/ComprovanteCompra';

export default function DetalhesPedidoVenda({ pedido, isOpen, onClose }) {
  const [lancamentosFinanceiros, setLancamentosFinanceiros] = useState([]);
  const [movimentosEstoque, setMovimentosEstoque] = useState([]);
  const [showComprovante, setShowComprovante] = useState(false);

  useEffect(() => {
    if (pedido && isOpen) {
      loadDadosAdicionais();
    }
  }, [pedido, isOpen]);

  const loadDadosAdicionais = async () => {
    try {
      const lancamentos = await base44.entities.LancamentoFinanceiro.filter({
        referencia_id: pedido.id,
        referencia_tipo: 'PedidoVenda'
      });
      setLancamentosFinanceiros(lancamentos);

      const movimentos = await base44.entities.MovimentacaoEstoque.filter({
        referencia_id: pedido.id,
        referencia_tipo: 'PedidoVenda'
      });
      setMovimentosEstoque(movimentos);
    } catch (error) {
      console.error('Erro ao carregar dados adicionais:', error);
    }
  };

  if (!pedido) return null;

  const formatValor = (valor) => {
    return `R$ ${(Math.round((valor || 0) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'Orçamento': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      'Aguardando Aprovação': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      'Aguardando Pagamento': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      'Aguardando Caixa': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'Aprovado': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      'Aguardando Retirada': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'Envio Agendado': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      'Finalizado': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      'Cancelado': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-700';
  };

  const handleCompartilhar = () => {
    setShowComprovante(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-50 dark:bg-gray-900 border-0 p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 p-4 md:p-6 border-b border-gray-100 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-lg font-medium text-gray-800 dark:text-gray-200">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <span>Detalhes do Pedido</span>
                  <p className="text-sm font-normal text-gray-500 dark:text-gray-400">{pedido.numero}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pedido.status === 'Pedido Concluído' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-11 h-11 md:w-9 md:h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="dark:bg-gray-800">
                      <DropdownMenuItem onClick={handleCompartilhar}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Compartilhar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <button
                  onClick={onClose}
                  className="w-11 h-11 md:w-9 md:h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-4 md:p-6 space-y-6">
          {/* Cabeçalho Info - Grid Responsivo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                <Hash className="w-3 h-3" />
                Número
              </div>
              <div className="text-base md:text-lg font-semibold text-gray-800 dark:text-gray-200">{pedido.numero}</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                <Clock className="w-3 h-3" />
                Status
              </div>
              <Badge className={`${getStatusBadge(pedido.status)} text-xs font-medium`}>
                {pedido.status}
              </Badge>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                <Calendar className="w-3 h-3" />
                Data/Hora
              </div>
              <div className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-300">
                {fmtDtHora(pedido.created_date)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                <DollarSign className="w-3 h-3" />
                Valor Total
              </div>
              <div className="text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-200">{formatValor(pedido.valor_total)}</div>
            </div>
          </div>

          {/* Segunda linha de info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                <User className="w-3 h-3" />
                Cliente
              </div>
              <div className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-300">{pedido.cliente_nome || 'Não informado'}</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                <User className="w-3 h-3" />
                Vendedor
              </div>
              <div className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-300">{pedido.vendedor_nome || 'Não informado'}</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                <ShoppingBag className="w-3 h-3" />
                Tipo
              </div>
              <div className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-300">{pedido.tipo || 'PDV'}</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                <Truck className="w-3 h-3" />
                Entrega
              </div>
              <div className="text-sm md:text-base font-medium text-gray-700 dark:text-gray-300">{pedido.metodo_entrega || 'N/A'}</div>
            </div>
          </div>

          {/* Abas */}
          <Tabs defaultValue="detalhes" className="w-full">
            <TabsList className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 rounded-none h-auto p-0 mb-6">
              <div className="flex w-full">
                <TabsTrigger 
                  value="detalhes" 
                  className="flex-1 flex items-center justify-center gap-2 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-4 md:py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none min-h-[48px]"
                >
                  <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="hidden md:inline text-sm font-normal text-gray-600 dark:text-gray-400">Detalhes</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="financeiro"
                  className="flex-1 flex items-center justify-center gap-2 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-4 md:py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none min-h-[48px]"
                >
                  <Wallet className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="hidden md:inline text-sm font-normal text-gray-600 dark:text-gray-400">Financeiro</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="estoque"
                  className="flex-1 flex items-center justify-center gap-2 border-b-2 border-transparent data-[state=active]:border-gray-700 dark:data-[state=active]:border-gray-400 rounded-none py-4 md:py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none min-h-[48px]"
                >
                  <Package className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="hidden md:inline text-sm font-normal text-gray-600 dark:text-gray-400">Estoque</span>
                </TabsTrigger>
              </div>
            </TabsList>

            {/* ABA: DETALHES */}
            <TabsContent value="detalhes" className="space-y-6 mt-0">
              {/* Itens do Pedido */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Itens do Pedido</h3>
                </div>
                
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                          <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide p-4">Produto</th>
                          <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide p-4">Qtd</th>
                          <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide p-4">Preço Unit.</th>
                          <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide p-4">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pedido.itens && pedido.itens.length > 0 ? (
                          pedido.itens.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                              <td className="p-4">
                                <div className="font-medium text-gray-800 dark:text-gray-200">{item.produto_nome}</div>
                                <div className="text-xs text-gray-400 font-mono">{item.produto_id?.substring(0, 8) || '-'}</div>
                              </td>
                              <td className="p-4 text-right text-gray-700 dark:text-gray-300">{item.quantidade}</td>
                              <td className="p-4 text-right text-gray-700 dark:text-gray-300">{formatValor(item.preco_unitario_praticado)}</td>
                              <td className="p-4 text-right font-semibold text-gray-800 dark:text-gray-200">{formatValor(item.total)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-gray-500">
                              Nenhum item cadastrado
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile List */}
                <div className="md:hidden space-y-3">
                  {pedido.itens && pedido.itens.length > 0 ? (
                    pedido.itens.map((item, idx) => (
                      <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 dark:text-gray-200">{item.produto_nome}</div>
                            <div className="text-xs text-gray-400 font-mono">{item.produto_id?.substring(0, 8) || '-'}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-800 dark:text-gray-200">{formatValor(item.total)}</div>
                          </div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>{item.quantidade} un × {formatValor(item.preco_unitario_praticado)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-xl">
                      Nenhum item cadastrado
                    </div>
                  )}
                </div>
              </div>

              {/* Resumo de Valores */}
              <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-sm md:text-base">
                  <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{formatValor(pedido.subtotal || pedido.valor_total)}</span>
                </div>
                {pedido.valor_desconto > 0 && (
                  <div className="flex justify-between items-center text-sm md:text-base">
                    <span className="text-red-600 dark:text-red-400">Desconto</span>
                    <span className="font-medium text-red-600 dark:text-red-400">-{formatValor(pedido.valor_desconto)}</span>
                  </div>
                )}
                {pedido.valor_frete > 0 && (
                  <div className="flex justify-between items-center text-sm md:text-base">
                    <span className="text-gray-500 dark:text-gray-400">Frete</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{formatValor(pedido.valor_frete)}</span>
                  </div>
                )}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between items-center">
                  <span className="font-medium text-gray-800 dark:text-gray-200">Total</span>
                  <span className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-gray-200">{formatValor(pedido.valor_total)}</span>
                </div>
              </div>

              {/* Observações */}
              {pedido.observacoes && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Observações</h3>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{pedido.observacoes}</p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ABA: FINANCEIRO */}
            <TabsContent value="financeiro" className="space-y-6 mt-0">
              {/* Formas de Pagamento */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Formas de Pagamento</h3>
                </div>
                
                {pedido.pagamentos && pedido.pagamentos.length > 0 ? (
                  <div className="space-y-3">
                    {pedido.pagamentos.map((pag, idx) => (
                      <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            {pag.forma_pagamento?.includes('Cartão') ? (
                              <CreditCard className="w-5 h-5 text-gray-500" />
                            ) : pag.forma_pagamento === 'PIX' ? (
                              <DollarSign className="w-5 h-5 text-gray-500" />
                            ) : (
                              <Banknote className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 dark:text-gray-200">{pag.forma_pagamento}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {pag.parcelas > 1 ? `${pag.parcelas}x` : 'À vista'}
                              {pag.taxa_pagamento ? ` • Taxa: ${pag.taxa_pagamento}%` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-800 dark:text-gray-200">{formatValor(pag.valor)}</div>
                          {pag.valor_liquido_recebido && pag.valor_liquido_recebido !== pag.valor && (
                            <div className="text-xs text-gray-500">Líq: {formatValor(pag.valor_liquido_recebido)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center bg-white dark:bg-gray-800 rounded-xl">
                    <CreditCard className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-gray-500 dark:text-gray-400">Nenhuma forma de pagamento registrada</p>
                  </div>
                )}
              </div>

              {/* Lançamentos Financeiros */}
              {lancamentosFinanceiros.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Lançamentos Financeiros</h3>
                  </div>
                  <div className="space-y-3">
                    {lancamentosFinanceiros.map((lanc) => (
                      <div key={lanc.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">{lanc.descricao}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Venc: {fmtData(lanc.data_vencimento)}
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <Badge className={lanc.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                            {lanc.status}
                          </Badge>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{formatValor(lanc.valor)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {lancamentosFinanceiros.length === 0 && (!pedido.pagamentos || pedido.pagamentos.length === 0) && (
                <div className="py-12 text-center">
                  <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400">Nenhuma informação financeira disponível</p>
                </div>
              )}
            </TabsContent>

            {/* ABA: ESTOQUE */}
            <TabsContent value="estoque" className="space-y-6 mt-0">
              {/* Status de Entrega */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Status de Entrega</h3>
                </div>
                <div className="space-y-3">
                  {pedido.itens && pedido.itens.map((item, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 p-4 md:p-4 rounded-xl flex items-center justify-between min-h-[64px]">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 dark:text-gray-200">{item.produto_nome}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Qtd: {item.quantidade}</div>
                    </div>
                    {pedido.status === 'Finalizado' ? (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1 px-3 py-1.5">
                        <CheckCircle2 className="w-3 h-3" />
                        Entregue
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1.5">
                        Pendente
                      </Badge>
                    )}
                  </div>
                  ))}
                </div>
              </div>

              {/* Movimentações de Estoque */}
              {movimentosEstoque.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Movimentações de Estoque</h3>
                  </div>
                  <div className="space-y-3">
                    {movimentosEstoque.map((mov) => (
                      <div key={mov.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">{mov.produto_nome}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {fmtDtHora(mov.created_date)}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={mov.tipo === 'Saída' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}>
                            {mov.tipo}
                          </Badge>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{mov.quantidade}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {movimentosEstoque.length === 0 && (
                <div className="py-12 text-center bg-white dark:bg-gray-800 rounded-xl">
                  <Package className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400">Nenhuma movimentação de estoque registrada</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>

      {/* Dialog de Impressão */}
      {showComprovante && (
        pedido.tipo === 'Pedido' ? (
          <ComprovantePreVenda
            preVenda={pedido}
            open={showComprovante}
            onClose={() => setShowComprovante(false)}
          />
        ) : (
          <ComprovanteCompra
            pedido={pedido}
            open={showComprovante}
            onClose={() => setShowComprovante(false)}
          />
        )
      )}
    </Dialog>
  );
}