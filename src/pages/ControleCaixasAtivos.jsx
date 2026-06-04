import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Eye,
  Printer,
  ChevronDown,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Banknote,
  Smartphone,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { printOrShareElementAsPdf } from '@/lib/mobilePrintAndShare';
import { buildSubstituicoesVendaCaixa } from '@/lib/substituicoesVendaCaixa';

export default function ControleCaixasAtivos() {
  const [caixas, setCaixas] = useState([]);
  const [caixaSelecionado, setCaixaSelecionado] = useState(null);
  const [movimentosCaixa, setMovimentosCaixa] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showEntradasDetails, setShowEntradasDetails] = useState(false);
  const [showSaidasDetails, setShowSaidasDetails] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState(null);
  const [showVendaDialog, setShowVendaDialog] = useState(false);

  useEffect(() => {
    loadCaixas();
  }, []);

  useEffect(() => {
    if (caixaSelecionado) {
      loadMovimentos();
    }
  }, [caixaSelecionado]);

  const loadCaixas = async () => {
    try {
      setLoading(true);
      const todasContas = await base44.entities.ContasFinanceiras.list();
      const caixasAtivos = todasContas.filter(c => 
        c.ativo && (c.tipo === 'Caixa Físico' || c.tipo === 'Caixa PDV')
      );
      setCaixas(caixasAtivos);
      
      if (caixasAtivos.length > 0) {
        setCaixaSelecionado(caixasAtivos[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar caixas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMovimentos = async () => {
    if (!caixaSelecionado) return;

    try {
      setLoading(true);
      const hoje = format(new Date(), 'yyyy-MM-dd');

      // Carregar movimentos de caixa (reforços e sangrias)
      const todosMovimentos = await base44.entities.MovimentosCaixa.list();
      const movimentosHoje = todosMovimentos.filter(m =>
        m.conta_id === caixaSelecionado.id &&
        m.created_date &&
        m.created_date.startsWith(hoje)
      );
      setMovimentosCaixa(movimentosHoje);

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
      setVendas(subCtx.vendasParaExibicao);
    } catch (error) {
      console.error('Erro ao carregar movimentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularResumo = () => {
    if (!caixaSelecionado) return {
      saldoInicial: 0,
      totalEntradas: 0,
      totalSaidas: 0,
      saldoAtual: 0
    };

    const saldoInicial = caixaSelecionado.saldo_inicial || 0;
    
    // Entradas: Vendas em dinheiro + Reforços
    const vendasDinheiro = vendas.reduce((sum, v) => {
      if (v.pagamentos && Array.isArray(v.pagamentos)) {
        return sum + v.pagamentos
          .filter(p => p.forma_pagamento === 'Dinheiro')
          .reduce((s, p) => s + (p.valor || 0), 0);
      }
      return sum;
    }, 0);

    const reforcos = movimentosCaixa
      .filter(m => m.tipo === 'Reforço')
      .reduce((sum, m) => sum + (m.valor || 0), 0);

    const totalEntradas = vendasDinheiro + reforcos;

    // Saídas: Sangrias
    const totalSaidas = movimentosCaixa
      .filter(m => m.tipo === 'Sangria')
      .reduce((sum, m) => sum + (m.valor || 0), 0);

    const saldoAtual = caixaSelecionado.saldo_atual || 0;

    return {
      saldoInicial,
      totalEntradas,
      totalSaidas,
      saldoAtual
    };
  };

  const calcularFormasPagamento = () => {
    const formas = {
      'Dinheiro': { entradas: 0, saidas: 0 },
      'PIX': { entradas: 0, saidas: 0 },
      'Cartão Crédito': { entradas: 0, saidas: 0 },
      'Cartão Débito': { entradas: 0, saidas: 0 }
    };

    // Processar vendas
    vendas.forEach(venda => {
      if (venda.pagamentos && Array.isArray(venda.pagamentos)) {
        venda.pagamentos.forEach(pag => {
          const forma = pag.forma_pagamento;
          if (formas[forma]) {
            formas[forma].entradas += pag.valor || 0;
          }
        });
      }
    });

    // Processar movimentos de caixa (reforços e sangrias são apenas em dinheiro)
    movimentosCaixa.forEach(mov => {
      if (mov.tipo === 'Reforço') {
        formas['Dinheiro'].entradas += mov.valor || 0;
      } else if (mov.tipo === 'Sangria') {
        formas['Dinheiro'].saidas += mov.valor || 0;
      }
    });

    return formas;
  };

  const getEntradasDetalhadas = () => {
    const entradas = [];

    // Vendas
    vendas.forEach(venda => {
      if (venda.pagamentos && Array.isArray(venda.pagamentos)) {
        venda.pagamentos.forEach(pag => {
          entradas.push({
            tipo: 'Venda',
            descricao: `${venda.numero || 'S/N'} - ${venda.cliente_nome || 'Cliente'}`,
            valor: pag.valor || 0,
            forma: pag.forma_pagamento,
            horario: venda.created_date,
            referencia: venda
          });
        });
      }
    });

    // Reforços
    movimentosCaixa
      .filter(m => m.tipo === 'Reforço')
      .forEach(mov => {
        entradas.push({
          tipo: 'Reforço',
          descricao: mov.observacao || 'Reforço de caixa',
          valor: mov.valor || 0,
          forma: 'Dinheiro',
          horario: mov.created_date,
          referencia: mov
        });
      });

    return entradas.sort((a, b) => new Date(b.horario) - new Date(a.horario));
  };

  const getSaidasDetalhadas = () => {
    const saidas = [];

    // Sangrias
    movimentosCaixa
      .filter(m => m.tipo === 'Sangria')
      .forEach(mov => {
        saidas.push({
          tipo: 'Sangria',
          descricao: mov.observacao || 'Sangria de caixa',
          valor: mov.valor || 0,
          forma: 'Dinheiro',
          horario: mov.created_date,
          referencia: mov
        });
      });

    return saidas.sort((a, b) => new Date(b.horario) - new Date(a.horario));
  };

  const formatValor = (valor) => {
    return `R$ ${(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatHora = (datetime) => {
    if (!datetime) return '--:--';
    return format(new Date(datetime), 'HH:mm');
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

  const handleVerDetalhesVenda = (venda) => {
    setVendaSelecionada(venda);
    setShowVendaDialog(true);
  };

  const handleImprimir = () => {
    void printOrShareElementAsPdf('controle-caixas-print-root', {
      formato: 'a4',
      fileBaseName: `caixas-${String(caixaSelecionado?.nome || 'ativos').replace(/\s+/g, '_')}-${format(new Date(), 'yyyy-MM-dd')}`,
      title: 'Controle de caixas',
      onDesktopPrint: () => window.print(),
    });
  };

  const resumo = calcularResumo();
  const formasPagamento = calcularFormasPagamento();
  const entradasDetalhadas = getEntradasDetalhadas();
  const saidasDetalhadas = getSaidasDetalhadas();

  if (loading && !caixaSelecionado) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-48 bg-muted dark:bg-muted rounded animate-pulse mb-6"></div>
          <div className="h-64 bg-card rounded-xl shadow-sm animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div id="controle-caixas-print-root" className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground dark:text-foreground font-glacial">
              Controle de Caixas Ativos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Análise detalhada dos movimentos de caixa
            </p>
          </div>
          <Button
            onClick={handleImprimir}
            variant="outline"
            className="gap-2 print:hidden border-border/40 no-pdf-capture">
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
        </div>

        {/* Seletor de Caixa */}
        <Card className="shadow-sm border-0 dark:bg-muted dark:border-border/40 print:shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">
                  Caixa Selecionado
                </label>
                <Select
                  value={caixaSelecionado?.id}
                  onValueChange={(id) => {
                    const caixa = caixas.find(c => c.id === id);
                    setCaixaSelecionado(caixa);
                  }}>
                  <SelectTrigger className="w-full md:w-64 border-0 bg-muted/40 dark:bg-muted dark:text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-muted dark:border-border/40">
                    {caixas.map(caixa => (
                      <SelectItem key={caixa.id} value={caixa.id} className="dark:hover:bg-primary/90">
                        {caixa.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna 1: Movimentos */}
          <div>
            <Card className="shadow-sm border-0 dark:bg-muted dark:border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground dark:text-foreground">
                  Movimentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Saldo Inicial */}
                <div className="flex items-center justify-between py-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40"></div>
                    <span className="text-sm text-muted-foreground">Saldo Inicial</span>
                  </div>
                  <span className="text-base font-semibold text-foreground">
                    {formatValor(resumo.saldoInicial)}
                  </span>
                </div>

                {/* Entradas */}
                <Collapsible open={showEntradasDetails} onOpenChange={setShowEntradasDetails}>
                  <div className="flex items-center justify-between py-2 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-sm text-muted-foreground">Entradas</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatValor(resumo.totalEntradas)}
                      </span>
                      <CollapsibleTrigger asChild>
                        <button className="p-1.5 hover:bg-muted rounded transition-colors">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent className="pt-3 space-y-2">
                    {entradasDetalhadas.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">Nenhuma entrada registrada</p>
                    ) : (
                      entradasDetalhadas.map((entrada, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-muted/40 dark:bg-muted/50 rounded text-xs">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getIconeFormaPagamento(entrada.forma)}
                              <span className="font-medium text-foreground">
                                {entrada.tipo}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">{formatHora(entrada.horario)}</span>
                            </div>
                            <div className="text-muted-foreground">{entrada.descricao}</div>
                            <div className="text-muted-foreground dark:text-muted-foreground">{entrada.forma}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatValor(entrada.valor)}
                            </span>
                            {entrada.tipo === 'Venda' && (
                              <button
                                onClick={() => handleVerDetalhesVenda(entrada.referencia)}
                                className="p-1 hover:bg-muted dark:hover:bg-muted rounded transition-colors">
                                <Eye className="w-3 h-3 text-muted-foreground" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Saídas */}
                <Collapsible open={showSaidasDetails} onOpenChange={setShowSaidasDetails}>
                  <div className="flex items-center justify-between py-2 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-sm text-muted-foreground">Saídas</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-semibold text-red-600 dark:text-red-400">
                        {formatValor(resumo.totalSaidas)}
                      </span>
                      <CollapsibleTrigger asChild>
                        <button className="p-1.5 hover:bg-muted rounded transition-colors">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent className="pt-3 space-y-2">
                    {saidasDetalhadas.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">Nenhuma saída registrada</p>
                    ) : (
                      saidasDetalhadas.map((saida, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-muted/40 dark:bg-muted/50 rounded text-xs">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getIconeFormaPagamento(saida.forma)}
                              <span className="font-medium text-foreground">
                                {saida.tipo}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">{formatHora(saida.horario)}</span>
                            </div>
                            <div className="text-muted-foreground">{saida.descricao}</div>
                            <div className="text-muted-foreground dark:text-muted-foreground">{saida.forma}</div>
                          </div>
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            {formatValor(saida.valor)}
                          </span>
                        </div>
                      ))
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Saldo */}
                <div className="flex items-center justify-between py-2 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-semibold text-foreground/90">Saldo</span>
                  </div>
                  <span className="text-lg font-bold text-foreground dark:text-foreground">
                    {formatValor(resumo.saldoAtual)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna 2: Formas de Pagamento e Saldo Total */}
          <div className="space-y-4">
            <Card className="shadow-sm border-0 dark:bg-muted dark:border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground dark:text-foreground">
                  Formas de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(formasPagamento).map(([forma, valores]) => {
                  const saldo = valores.entradas - valores.saidas;
                  return (
                    <div key={forma} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                      <div className="flex items-center gap-2">
                        {getIconeFormaPagamento(forma)}
                        <span className="text-sm text-muted-foreground">{forma}</span>
                      </div>
                      <span className="text-base font-semibold text-foreground">
                        {formatValor(saldo)}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0 dark:bg-muted dark:border-border/40">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-semibold text-foreground/90">Saldo</span>
                  </div>
                  <span className="text-lg font-bold text-foreground dark:text-foreground">
                    {formatValor(resumo.saldoAtual)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog de Detalhes da Venda */}
      <Dialog open={showVendaDialog} onOpenChange={setShowVendaDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-background dark:border-border/40">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-foreground">Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {vendaSelecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Pedido:</span>
                  <p className="font-semibold text-foreground">
                    {vendaSelecionada.numero || 'S/N'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Cliente:</span>
                  <p className="font-semibold text-foreground">
                    {vendaSelecionada.cliente_nome || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Vendedor:</span>
                  <p className="text-foreground/90">
                    {vendaSelecionada.vendedor_nome || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Horário:</span>
                  <p className="text-foreground/90">
                    {vendaSelecionada.created_date ? format(new Date(vendaSelecionada.created_date), 'HH:mm') : '--:--'}
                  </p>
                </div>
              </div>

              {/* Itens */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-foreground">Itens</h4>
                <div className="space-y-2">
                  {vendaSelecionada.itens?.map((item, idx) => (
                    <div key={idx} className="flex justify-between p-2 bg-muted/50 rounded text-sm">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.produto_nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantidade} × {formatValor(item.preco_unitario_praticado)}
                        </p>
                      </div>
                      <p className="font-semibold text-foreground">
                        {formatValor(item.total)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagamentos */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-foreground">Formas de Pagamento</h4>
                <div className="space-y-2">
                  {vendaSelecionada.pagamentos?.map((pag, idx) => (
                    <div key={idx} className="flex justify-between p-2 bg-muted/50 rounded text-sm">
                      <div className="flex items-center gap-2">
                        {getIconeFormaPagamento(pag.forma_pagamento)}
                        <span className="text-foreground/90">{pag.forma_pagamento}</span>
                      </div>
                      <p className="font-semibold text-foreground">
                        {formatValor(pag.valor)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-border/40 flex justify-between text-lg">
                <span className="font-semibold text-foreground/90">Total:</span>
                <span className="font-bold text-foreground dark:text-foreground">
                  {formatValor(vendaSelecionada.valor_total)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}