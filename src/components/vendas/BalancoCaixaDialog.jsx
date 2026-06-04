import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Eye,
  ChevronDown,
  Receipt,
  Banknote,
  CreditCard,
  Smartphone,
  ArrowUpCircle,
  ArrowDownCircle,
  ShoppingBag,
  DollarSign,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { buildSubstituicoesVendaCaixa } from '@/lib/substituicoesVendaCaixa';

export default function BalancoCaixaDialog({ open, onOpenChange, contaCaixa }) {
  const [loading, setLoading] = useState(true);
  const [vendas, setVendas] = useState([]);
  const [substituicoesCtx, setSubstituicoesCtx] = useState(null);
  const [movimentos, setMovimentos] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [showPedidoDialog, setShowPedidoDialog] = useState(false);

  useEffect(() => {
    if (open && contaCaixa) {
      loadDados();
    }
  }, [open, contaCaixa]);

  const loadDados = async () => {
    try {
      setLoading(true);
      const hoje = format(new Date(), 'yyyy-MM-dd');

      const [todasVendas, todosVales, todasDevolucoes] = await Promise.all([
        base44.entities.PedidoVenda.list(),
        base44.entities.ValeCompra.list(),
        base44.entities.DevolucaoTroca.list(),
      ]);
      const vendasHoje = todasVendas.filter(v =>
        v.created_date &&
        v.created_date.startsWith(hoje) &&
        (v.status === 'Financeiro OK' || v.status === 'Finalizado' || v.status === 'Pedido Concluído')
      );
      const subCtx = buildSubstituicoesVendaCaixa({
        vendas: vendasHoje,
        vales: todosVales,
        devolucoes: todasDevolucoes,
      });
      setSubstituicoesCtx(subCtx);
      setVendas(subCtx.vendasParaExibicao);

      // Carregar movimentos de caixa (reforços e sangrias)
      const todosMovimentos = await base44.entities.MovimentosCaixa.list();
      const movimentosHoje = todosMovimentos.filter(m =>
        m.conta_id === contaCaixa.id &&
        m.created_date &&
        m.created_date.startsWith(hoje)
      );
      setMovimentos(movimentosHoje);

      // Carregar despesas do dia vinculadas ao caixa
      const todasDespesas = await base44.entities.LancamentoFinanceiro.list();
      const despesasHoje = todasDespesas.filter(d =>
        d.tipo === 'Despesa' &&
        d.created_date &&
        d.created_date.startsWith(hoje) &&
        d.referencia_tipo === 'ContaCaixa' &&
        d.referencia_id === contaCaixa.id
      );
      setDespesas(despesasHoje);
    } catch (error) {
      console.error('Erro ao carregar dados do balanço:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularComposicaoSaldo = () => {
    if (!contaCaixa) return { 'Dinheiro': 0, 'PIX': 0, 'Cartão Crédito': 0, 'Cartão Débito': 0 };
    
    const composicao = {
      'Dinheiro': 0,
      'PIX': 0,
      'Cartão Crédito': 0,
      'Cartão Débito': 0
    };

    // Somar vendas por forma de pagamento
    vendas.forEach(venda => {
      if (venda.pagamentos && Array.isArray(venda.pagamentos)) {
        venda.pagamentos.forEach(pag => {
          if (composicao[pag.forma_pagamento] !== undefined) {
            composicao[pag.forma_pagamento] += pag.valor || 0;
          }
        });
      }
    });

    // Adicionar reforços (sempre em dinheiro)
    movimentos
      .filter(m => m.tipo === 'Reforço')
      .forEach(m => {
        composicao['Dinheiro'] += m.valor || 0;
      });

    // Subtrair sangrias (sempre em dinheiro)
    movimentos
      .filter(m => m.tipo === 'Sangria')
      .forEach(m => {
        composicao['Dinheiro'] -= m.valor || 0;
      });

    // Subtrair despesas (sempre em dinheiro)
    despesas.forEach(d => {
      composicao['Dinheiro'] -= d.valor || 0;
    });

    return composicao;
  };

  const calcularTotalVendas = () => {
    if (substituicoesCtx) return substituicoesCtx.totalVendasUtil;
    return vendas.reduce((sum, v) => sum + (v.valor_total || 0), 0);
  };

  const gerarExtratoTurno = () => {
    if (!contaCaixa) return [];
    
    const extrato = [];

    // Adicionar saldo inicial
    extrato.push({
      tipo: 'Saldo Inicial',
      descricao: 'Abertura do Caixa',
      valor: contaCaixa.saldo_inicial || 0,
      horario: null,
      icone: Wallet,
      cor: 'text-muted-foreground'
    });

    // Adicionar reforços
    movimentos
      .filter(m => m.tipo === 'Reforço')
      .forEach(m => {
        extrato.push({
          tipo: 'Reforço',
          descricao: m.observacao || 'Reforço de Caixa',
          valor: m.valor || 0,
          horario: m.created_date,
          icone: ArrowUpCircle,
          cor: 'text-emerald-500',
          sinal: '+'
        });
      });

    // Adicionar vendas
    vendas.forEach(v => {
      const valorDinheiro = v.pagamentos?.filter(p => p.forma_pagamento === 'Dinheiro')
        .reduce((sum, p) => sum + (p.valor || 0), 0) || 0;

      if (valorDinheiro > 0) {
        extrato.push({
          tipo: 'Venda',
          descricao: `Pedido ${v.numero || 'S/N'} - ${v.cliente_nome || 'Cliente'}`,
          valor: valorDinheiro,
          horario: v.created_date,
          icone: ShoppingBag,
          cor: 'text-emerald-500',
          sinal: '+',
          referencia: v
        });
      }
    });

    // Adicionar sangrias
    movimentos
      .filter(m => m.tipo === 'Sangria')
      .forEach(m => {
        extrato.push({
          tipo: 'Retirada de Caixa',
          descricao: m.observacao || 'Transferência para Caixa Maior',
          valor: m.valor || 0,
          horario: m.created_date,
          icone: ArrowDownCircle,
          cor: 'text-amber-500',
          sinal: '-'
        });
      });

    // Adicionar despesas
    despesas.forEach(d => {
      extrato.push({
        tipo: 'Despesa',
        descricao: d.descricao || 'Despesa',
        valor: d.valor || 0,
        horario: d.created_date,
        icone: Receipt,
        cor: 'text-red-500',
        sinal: '-'
      });
    });

    // Ordenar por horário
    extrato.sort((a, b) => {
      if (!a.horario) return -1;
      if (!b.horario) return 1;
      return new Date(a.horario) - new Date(b.horario);
    });

    // Calcular saldo acumulado
    let saldoAcumulado = contaCaixa.saldo_inicial || 0;
    extrato.forEach(item => {
      if (item.tipo !== 'Saldo Inicial') {
        if (item.sinal === '+') {
          saldoAcumulado += item.valor;
        } else {
          saldoAcumulado -= item.valor;
        }
      }
      item.saldoAcumulado = saldoAcumulado;
    });

    return extrato;
  };

  const getIconeFormaPagamento = (forma) => {
    switch (forma) {
      case 'Dinheiro':
        return <Banknote className="w-4 h-4" />;
      case 'PIX':
        return <Smartphone className="w-4 h-4" />;
      case 'Cartão Crédito':
      case 'Cartão Débito':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const formatValor = (valor) => {
    return `R$ ${(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatHora = (datetime) => {
    if (!datetime) return '--:--';
    return format(new Date(datetime), 'HH:mm');
  };

  const composicaoSaldo = calcularComposicaoSaldo();
  const totalVendas = calcularTotalVendas();
  const extratoTurno = gerarExtratoTurno();
  const saldoAtual = contaCaixa?.saldo_atual || 0;

  if (!contaCaixa) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden p-0 gap-0 bg-background">
          <DialogHeader className="p-6 pb-4 bg-card shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-foreground dark:text-gray-100 font-glacial">
                  Balanço do Caixa
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {contaCaixa.nome} - {format(new Date(), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-border/40 border-t-emerald-500 rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {/* Saldo Atual */}
                <Card className="shadow-sm border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Saldo Atual</p>
                      <p className="text-4xl font-bold text-foreground dark:text-gray-100 font-glacial">
                        {formatValor(saldoAtual)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Layout Responsivo: Mobile = Stacked, Desktop = Duas Colunas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Coluna Direita - Recebimentos do Turno */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground/90 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Recebimentos do Turno
                    </h3>
                    <Card className="shadow-sm border-0 bg-card overflow-hidden">
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {Object.entries(composicaoSaldo).map(([forma, valor]) => {
                          const Icon = getIconeFormaPagamento(forma);
                          return (
                            <div key={forma} className="p-4 hover:bg-muted/30 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                  {Icon}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-foreground dark:text-gray-100">
                                    {forma}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-base font-semibold text-foreground dark:text-gray-100">
                                    {formatValor(valor)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Total de Vendas */}
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center">
                              <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-foreground dark:text-gray-100">
                                Total Vendas
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {vendas.length} pedidos
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                {formatValor(totalVendas)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Coluna Esquerda - Movimentações do Turno */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground/90 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Movimentações do Turno
                    </h3>
                    <Card className="shadow-sm border-0 bg-card overflow-hidden">
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {extratoTurno.map((item, idx) => {
                          const Icon = item.icone;
                          return (
                            <div key={idx} className="p-4 hover:bg-muted/30 transition-colors">
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${item.cor}`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-foreground dark:text-gray-100">
                                      {item.tipo}
                                    </span>
                                    {item.horario && (
                                      <>
                                        <span className="text-gray-300">•</span>
                                        <span className="text-xs text-muted-foreground">
                                          {formatHora(item.horario)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {item.descricao}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className={`text-sm font-semibold ${item.sinal === '+' ? 'text-emerald-600 dark:text-emerald-400' : item.sinal === '-' ? 'text-red-600 dark:text-red-400' : 'text-foreground dark:text-gray-100'}`}>
                                    {item.sinal && item.sinal} {formatValor(item.valor)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Saldo: {formatValor(item.saldoAcumulado)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}