import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { DollarSign, TrendingUp, TrendingDown, Wallet, RefreshCw, ChevronRight } from 'lucide-react';
import { getTenantId } from '@/components/utils/tenant';

export default function CaixasAtivosPage() {
  const [caixas, setCaixas] = useState([]);
  const [caixaDetalhes, setCaixaDetalhes] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    
    const tenantId = getTenantId();

    // Buscar todos os caixas físicos ativos
    const todasContas = await base44.entities.ContasFinanceiras.filter({ empresa_id: tenantId });
    const caixasFisicos = todasContas.filter(c => c.tipo === 'Caixa Físico' && c.ativo);
    
    setCaixas(caixasFisicos);

    // Para cada caixa, buscar detalhes
    const detalhes = {};
    const hoje = new Date();
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
    
    // Carregar dados em paralelo para performance
    const [todosLancamentos, todosMovimentos, todosPedidos] = await Promise.all([
      base44.entities.LancamentoFinanceiro.filter({ empresa_id: tenantId }),
      base44.entities.MovimentosCaixa.filter({ empresa_id: tenantId }),
      base44.entities.PedidoVenda.filter({ empresa_id: tenantId })
    ]);

    for (const caixa of caixasFisicos) {
      // Buscar recebimentos (LancamentoFinanceiro tipo Receita)
      const recebimentosHoje = todosLancamentos.filter(l => 
        l.tipo === 'Receita' && 
        new Date(l.created_date) >= inicioDia &&
        l.referencia_id // Tem referência a um pedido
      );

      // Buscar recolhimentos (MovimentosCaixa tipo Sangria)
      const recolhimentosHoje = todosMovimentos.filter(m => 
        m.tipo === 'Sangria' && 
        m.conta_id === caixa.id &&
        new Date(m.created_date) >= inicioDia
      );

      // Buscar reforços
      const reforcosHoje = todosMovimentos.filter(m => 
        m.tipo === 'Reforço' && 
        m.conta_id === caixa.id &&
        new Date(m.created_date) >= inicioDia
      );

      const totalRecebimentos = recebimentosHoje.reduce((sum, l) => sum + (l.valor || 0), 0);
      const totalRecolhimentos = recolhimentosHoje.reduce((sum, m) => sum + (m.valor || 0), 0);
      const totalReforcos = reforcosHoje.reduce((sum, m) => sum + (m.valor || 0), 0);

      // Buscar pedidos de venda para detalhar formas de pagamento
      const pedidosHoje = todosPedidos.filter(p => {
        const pedidoData = new Date(p.created_date);
        return pedidoData >= inicioDia && p.status === 'Finalizado';
      });

      // Inicializar formas de pagamento padrão do PDV
      const formasPagamento = {
        'Dinheiro': 0,
        'PIX': 0,
        'Cartão Débito': 0,
        'Cartão Crédito': 0
      };
      
      // Consolidar valores dos pedidos
      pedidosHoje.forEach(pedido => {
        if (pedido.pagamentos && Array.isArray(pedido.pagamentos)) {
          pedido.pagamentos.forEach(pag => {
            const forma = pag.forma_pagamento || 'Não Especificado';
            if (!formasPagamento[forma]) {
              formasPagamento[forma] = 0;
            }
            formasPagamento[forma] += pag.valor || 0;
          });
        }
      });

      detalhes[caixa.id] = {
        totalRecebimentos,
        totalRecolhimentos,
        totalReforcos,
        formasPagamento,
        quantidadeRecebimentos: recebimentosHoje.length,
        quantidadeRecolhimentos: recolhimentosHoje.length
      };
    }

    setCaixaDetalhes(detalhes);
    setIsLoading(false);
  };



  const formatarMoeda = (valor) => {
    if (!valor) return '0,00';
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Calcular totais consolidados
  const totalSaldoConsolidado = caixas.reduce((sum, c) => sum + (c.saldo_atual || 0), 0);
  const totalRecebimentosConsolidado = Object.values(caixaDetalhes).reduce((sum, d) => sum + (d.totalRecebimentos || 0), 0);
  const totalRecolhimentosConsolidado = Object.values(caixaDetalhes).reduce((sum, d) => sum + (d.totalRecolhimentos || 0), 0);
  const totalReforcosConsolidado = Object.values(caixaDetalhes).reduce((sum, d) => sum + (d.totalReforcos || 0), 0);

  // Consolidar formas de pagamento de todos os caixas
  const formasPagamentoConsolidadas = {};
  Object.values(caixaDetalhes).forEach(detalhes => {
    if (detalhes.formasPagamento) {
      Object.entries(detalhes.formasPagamento).forEach(([forma, valor]) => {
        if (!formasPagamentoConsolidadas[forma]) {
          formasPagamentoConsolidadas[forma] = 0;
        }
        formasPagamentoConsolidadas[forma] += valor;
      });
    }
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse"></div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-medium text-gray-800 dark:text-gray-200">Caixas Ativos</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Monitoramento em tempo real dos caixas operacionais</p>
          </div>
          <Button onClick={loadData} variant="outline" size="sm" className="dark:bg-gray-800 dark:border-gray-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* KPIs Consolidados */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-600 dark:text-gray-400">Caixas Abertos</div>
              <Wallet className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">{caixas.length}</div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-600 dark:text-gray-400">Saldo Total</div>
              <DollarSign className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              R$ {formatarMoeda(totalSaldoConsolidado)}
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-600 dark:text-gray-400">Recebimentos Hoje</div>
              <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              R$ {formatarMoeda(totalRecebimentosConsolidado)}
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-600 dark:text-gray-400">Recolhimentos Hoje</div>
              <TrendingDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              R$ {formatarMoeda(totalRecolhimentosConsolidado)}
            </div>
          </div>
        </div>

        {/* Lista de Caixas */}
        {caixas.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Wallet className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Nenhum caixa ativo no momento</p>
          </div>
        ) : (
          <>
            {/* Resumo Consolidado de Formas de Pagamento */}
            {Object.keys(formasPagamentoConsolidadas).length > 0 && (
              <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-4">
                  Recebimentos por Forma de Pagamento (Hoje)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {Object.entries(formasPagamentoConsolidadas).map(([forma, valor]) => (
                    <div key={forma}>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{forma}</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        R$ {formatarMoeda(valor)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lista Simples de Caixas */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {caixas.map(caixa => (
                <Link 
                  key={caixa.id}
                  to={createPageUrl(`FinanceiroModulo`)}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {caixa.nome}
                    </h3>
                    {caixa.observacoes && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{caixa.observacoes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-gray-600 dark:text-gray-400">Saldo Disponível</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        R$ {formatarMoeda(caixa.saldo_atual || 0)}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}