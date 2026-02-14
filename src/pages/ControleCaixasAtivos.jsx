import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Eye, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Wallet,
  CreditCard,
  Banknote,
  Smartphone,
  Clock,
  ShoppingCart,
  Plus,
  Minus,
  ChevronDown,
  Receipt
} from 'lucide-react';
import { format } from 'date-fns';

export default function ControleCaixasAtivosPage() {
  const [caixas, setCaixas] = useState([]);
  const [caixaSelecionado, setCaixaSelecionado] = useState(null);
  const [movimentos, setMovimentos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detalhesVenda, setDetalhesVenda] = useState(null);
  const [showDetalhesDialog, setShowDetalhesDialog] = useState(false);

  const [resumo, setResumo] = useState({
    saldoInicial: 0,
    totalEntradas: 0,
    totalSaidas: 0,
    saldoAtual: 0
  });

  const [formasPagamento, setFormasPagamento] = useState({
    dinheiro: { entradas: 0, saidas: 0, saldo: 0 },
    pix: { entradas: 0, saidas: 0, saldo: 0 },
    cartaoDebito: { entradas: 0, saidas: 0, saldo: 0 },
    cartaoCredito: { entradas: 0, saidas: 0, saldo: 0 }
  });

  const [entradasDetalhadas, setEntradasDetalhadas] = useState([]);
  const [saidasDetalhadas, setSaidasDetalhadas] = useState([]);

  useEffect(() => {
    carregarCaixas();
  }, []);

  useEffect(() => {
    if (caixaSelecionado) {
      carregarDadosCaixa(caixaSelecionado);
    }
  }, [caixaSelecionado]);

  const carregarCaixas = async () => {
    try {
      const todasContas = await base44.entities.ContasFinanceiras.list();
      const caixasAtivos = todasContas.filter(c => 
        c.ativo && (c.tipo === 'Caixa Físico' || c.tipo === 'Caixa PDV')
      );
      setCaixas(caixasAtivos);
      if (caixasAtivos.length > 0) {
        setCaixaSelecionado(caixasAtivos[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar caixas:', error);
    }
  };

  const carregarDadosCaixa = async (caixaId) => {
    setLoading(true);
    try {
      const hoje = format(new Date(), 'yyyy-MM-dd');
      
      // Buscar conta selecionada
      const conta = caixas.find(c => c.id === caixaId);
      if (!conta) return;

      // Buscar movimentos do dia
      const todosMovimentos = await base44.entities.MovimentosCaixa.list();
      const movimentosDia = todosMovimentos.filter(m => 
        m.conta_id === caixaId && 
        m.created_date?.startsWith(hoje)
      );

      // Buscar vendas do dia
      const todasVendas = await base44.entities.PedidoVenda.list();
      const vendasDia = todasVendas.filter(v => 
        v.created_date?.startsWith(hoje) &&
        (v.status === 'Financeiro OK' || v.status === 'Finalizado')
      );

      setMovimentos(movimentosDia);
      setVendas(vendasDia);

      // Calcular resumo
      const reforcos = movimentosDia.filter(m => m.tipo === 'Reforço');
      const sangrias = movimentosDia.filter(m => m.tipo === 'Sangria');

      const totalReforcos = reforcos.reduce((sum, m) => sum + (m.valor || 0), 0);
      const totalSangrias = sangrias.reduce((sum, m) => sum + (m.valor || 0), 0);

      // Calcular total de vendas por forma de pagamento
      let totalVendasDinheiro = 0;
      let totalVendasPix = 0;
      let totalVendasDebito = 0;
      let totalVendasCredito = 0;

      vendasDia.forEach(venda => {
        if (venda.pagamentos && Array.isArray(venda.pagamentos)) {
          venda.pagamentos.forEach(pag => {
            if (pag.forma_pagamento === 'Dinheiro') {
              totalVendasDinheiro += pag.valor || 0;
            } else if (pag.forma_pagamento === 'PIX') {
              totalVendasPix += pag.valor || 0;
            } else if (pag.forma_pagamento?.includes('Débito')) {
              totalVendasDebito += pag.valor || 0;
            } else if (pag.forma_pagamento?.includes('Crédito')) {
              totalVendasCredito += pag.valor || 0;
            }
          });
        }
      });

      const totalEntradas = totalVendasDinheiro + totalVendasPix + totalVendasDebito + totalVendasCredito + totalReforcos;
      const totalSaidas = totalSangrias;

      setResumo({
        saldoInicial: conta.saldo_inicial || 0,
        totalEntradas,
        totalSaidas,
        saldoAtual: conta.saldo_atual || 0
      });

      // Calcular por forma de pagamento (considerando apenas dinheiro para sangrias/reforços)
      setFormasPagamento({
        dinheiro: {
          entradas: totalVendasDinheiro + totalReforcos,
          saidas: totalSangrias,
          saldo: totalVendasDinheiro + totalReforcos - totalSangrias
        },
        pix: {
          entradas: totalVendasPix,
          saidas: 0,
          saldo: totalVendasPix
        },
        cartaoDebito: {
          entradas: totalVendasDebito,
          saidas: 0,
          saldo: totalVendasDebito
        },
        cartaoCredito: {
          entradas: totalVendasCredito,
          saidas: 0,
          saldo: totalVendasCredito
        }
      });

      // Preparar lista detalhada de entradas
      const entradas = [];
      
      // Adicionar vendas
      vendasDia.forEach(venda => {
        if (venda.pagamentos && Array.isArray(venda.pagamentos)) {
          venda.pagamentos.forEach(pag => {
            entradas.push({
              tipo: 'Venda',
              hora: format(new Date(venda.created_date), 'HH:mm'),
              formaPagamento: pag.forma_pagamento || 'N/A',
              valor: pag.valor || 0,
              referencia: venda.numero || 'S/N',
              detalhes: venda
            });
          });
        }
      });

      // Adicionar reforços
      reforcos.forEach(ref => {
        entradas.push({
          tipo: 'Reforço',
          hora: format(new Date(ref.created_date), 'HH:mm'),
          formaPagamento: 'Dinheiro',
          valor: ref.valor || 0,
          referencia: ref.numero || 'S/N',
          detalhes: ref
        });
      });

      // Ordenar por hora
      entradas.sort((a, b) => a.hora.localeCompare(b.hora));
      setEntradasDetalhadas(entradas);

      // Preparar lista detalhada de saídas
      const saidas = [];
      sangrias.forEach(sang => {
        saidas.push({
          tipo: 'Sangria',
          hora: format(new Date(sang.created_date), 'HH:mm'),
          formaPagamento: 'Dinheiro',
          valor: sang.valor || 0,
          referencia: sang.numero || 'S/N',
          detalhes: sang
        });
      });
      saidas.sort((a, b) => a.hora.localeCompare(b.hora));
      setSaidasDetalhadas(saidas);

    } catch (error) {
      console.error('Erro ao carregar dados do caixa:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalhesVenda = (venda) => {
    setDetalhesVenda(venda);
    setShowDetalhesDialog(true);
  };

  const formatValor = (valor) => {
    return `R$ ${(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleImprimir = () => {
    window.print();
  };

  const caixaAtual = caixas.find(c => c.id === caixaSelecionado);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white font-glacial">
              Controle de Caixas Ativos
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Análise detalhada dos movimentos do dia
            </p>
          </div>
          <Button 
            onClick={handleImprimir}
            variant="outline"
            className="gap-2 border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">
            <Printer className="w-4 h-4" />
            Imprimir Relatório
          </Button>
        </div>

        {/* Seletor de Caixa */}
        <Card className="shadow-sm border-0 dark:bg-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
                  Selecione o Caixa
                </label>
                <Select value={caixaSelecionado} onValueChange={setCaixaSelecionado}>
                  <SelectTrigger className="h-12 border-0 bg-gray-50 dark:bg-gray-900">
                    <SelectValue placeholder="Selecione um caixa" />
                  </SelectTrigger>
                  <SelectContent>
                    {caixas.map(caixa => (
                      <SelectItem key={caixa.id} value={caixa.id}>
                        {caixa.nome} - {formatValor(caixa.saldo_atual)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {caixaAtual && !loading && (
          <>
            {/* Grid Principal: Movimentos e Formas de Pagamento */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Coluna Esquerda: Movimentos */}
              <div className="space-y-4">
                {/* Saldo Inicial */}
                <Card className="shadow-sm border-0 dark:bg-gray-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                          Saldo Inicial
                        </span>
                      </div>
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatValor(resumo.saldoInicial)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Entradas */}
                <Collapsible>
                  <Card className="shadow-sm border-0 dark:bg-gray-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <CollapsibleTrigger asChild>
                            <button className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors">
                              <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            </button>
                          </CollapsibleTrigger>
                          <span className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            Entradas
                          </span>
                        </div>
                        <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                          {formatValor(resumo.totalEntradas)}
                        </span>
                      </div>

                      <CollapsibleContent className="mt-4">
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {entradasDetalhadas.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">
                              Nenhuma entrada registrada
                            </p>
                          ) : (
                            entradasDetalhadas.map((entrada, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <div className="flex items-center gap-3 flex-1">
                                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {entrada.hora} - {entrada.tipo}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {entrada.formaPagamento} • {entrada.referencia}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                    {formatValor(entrada.valor)}
                                  </span>
                                  {entrada.tipo === 'Venda' && (
                                    <button
                                      onClick={() => handleVerDetalhesVenda(entrada.detalhes)}
                                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                                      <Eye className="w-4 h-4 text-gray-400" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </CollapsibleContent>
                    </CardContent>
                  </Card>
                </Collapsible>

                {/* Saídas */}
                <Collapsible>
                  <Card className="shadow-sm border-0 dark:bg-gray-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <CollapsibleTrigger asChild>
                            <button className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors">
                              <Eye className="w-4 h-4 text-red-600 dark:text-red-400" />
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            </button>
                          </CollapsibleTrigger>
                          <span className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            Saídas
                          </span>
                        </div>
                        <span className="text-xl font-bold text-red-600 dark:text-red-400">
                          {formatValor(resumo.totalSaidas)}
                        </span>
                      </div>

                      <CollapsibleContent className="mt-4">
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {saidasDetalhadas.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">
                              Nenhuma saída registrada
                            </p>
                          ) : (
                            saidasDetalhadas.map((saida, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <div className="flex items-center gap-3 flex-1">
                                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {saida.hora} - {saida.tipo}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {saida.formaPagamento} • {saida.referencia}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                  {formatValor(saida.valor)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </CollapsibleContent>
                    </CardContent>
                  </Card>
                </Collapsible>

                {/* Saldo Atual */}
                <Card className="shadow-sm border-0 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wide font-semibold">
                          Saldo Atual
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatValor(resumo.saldoAtual)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Coluna Direita: Formas de Pagamento */}
              <div className="space-y-4">
                <Card className="shadow-sm border-0 dark:bg-gray-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-gray-400" />
                      Resumo por Forma de Pagamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Dinheiro */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Banknote className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wide">
                          Dinheiro
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Entradas:</span>
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            +{formatValor(formasPagamento.dinheiro.entradas)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Saídas:</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            -{formatValor(formasPagamento.dinheiro.saidas)}
                          </span>
                        </div>
                        <div className="flex justify-between text-base pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span className="font-semibold text-gray-900 dark:text-white">Saldo:</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {formatValor(formasPagamento.dinheiro.saldo)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* PIX */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wide">
                          PIX
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Entradas:</span>
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            +{formatValor(formasPagamento.pix.entradas)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Saídas:</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            -{formatValor(formasPagamento.pix.saidas)}
                          </span>
                        </div>
                        <div className="flex justify-between text-base pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span className="font-semibold text-gray-900 dark:text-white">Saldo:</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {formatValor(formasPagamento.pix.saldo)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cartão Débito */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wide">
                          Cartão Débito
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Entradas:</span>
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            +{formatValor(formasPagamento.cartaoDebito.entradas)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Saídas:</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            -{formatValor(formasPagamento.cartaoDebito.saidas)}
                          </span>
                        </div>
                        <div className="flex justify-between text-base pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span className="font-semibold text-gray-900 dark:text-white">Saldo:</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {formatValor(formasPagamento.cartaoDebito.saldo)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cartão Crédito */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wide">
                          Cartão Crédito
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Entradas:</span>
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            +{formatValor(formasPagamento.cartaoCredito.entradas)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Saídas:</span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            -{formatValor(formasPagamento.cartaoCredito.saidas)}
                          </span>
                        </div>
                        <div className="flex justify-between text-base pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span className="font-semibold text-gray-900 dark:text-white">Saldo:</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {formatValor(formasPagamento.cartaoCredito.saldo)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Carregando dados...</p>
            </div>
          </div>
        )}
      </div>

      {/* Dialog de Detalhes da Venda */}
      <Dialog open={showDetalhesDialog} onOpenChange={setShowDetalhesDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg text-gray-900 dark:text-white">
              Detalhes da Venda
            </DialogTitle>
          </DialogHeader>
          {detalhesVenda && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Pedido</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{detalhesVenda.numero || 'S/N'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Cliente</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{detalhesVenda.cliente_nome || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Vendedor</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">{detalhesVenda.vendedor_nome || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Total</div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatValor(detalhesVenda.valor_total)}
                    </div>
                  </div>
                </div>
              </div>

              {detalhesVenda.itens && detalhesVenda.itens.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">
                    Produtos
                  </h4>
                  <div className="space-y-2">
                    {detalhesVenda.itens.map((item, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.produto_nome}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {item.quantidade} × {formatValor(item.preco_unitario_praticado)}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatValor(item.total)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detalhesVenda.pagamentos && detalhesVenda.pagamentos.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">
                    Formas de Pagamento
                  </h4>
                  <div className="space-y-2">
                    {detalhesVenda.pagamentos.map((pag, idx) => (
                      <div key={idx} className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {pag.forma_pagamento}
                          {pag.parcelas > 1 && ` (${pag.parcelas}x)`}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatValor(pag.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}