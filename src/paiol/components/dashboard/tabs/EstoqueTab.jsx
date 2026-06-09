import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from "@/components/ui/skeleton";
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/components/utils';
import { format } from 'date-fns';
import { TrendingUp, AlertTriangle, ClipboardList, ChevronRight } from 'lucide-react';

export default function EstoqueTab() {
  const [data, setData] = useState({
    valorEstoque: 0,
    itensAbaixoMinimo: 0,
    itensSemGiro: 0,
    acuracidadeEstoque: 100,
    top5ProdutosPorValor: [],
    itensVencendo: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEstoqueData = async () => {
      setIsLoading(true);
      try {
        const produtos = await base44.entities.Produto.list();
        
        const valorEstoque = produtos.reduce((sum, p) => 
          sum + ((p.estoque_atual || 0) * (p.preco_custo_calculado || 0)), 0
        );
        
        const itensAbaixoMinimo = produtos.filter(p => 
          p.ativo && (p.estoque_atual || 0) <= (p.estoque_minimo || 0)
        ).length;
        
        const itensSemGiro = produtos.filter(p => 
          p.ativo && (p.estoque_atual || 0) > 0 && !p.ultima_movimentacao
        ).length;
        
        const top5ProdutosPorValor = produtos
          .map(p => ({
            nome: p.nome,
            valor: (p.estoque_atual || 0) * (p.preco_custo_calculado || 0)
          }))
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 5);
        
        const itensVencendo = [];
        
        setData({
          valorEstoque,
          itensAbaixoMinimo,
          itensSemGiro,
          acuracidadeEstoque: 100,
          top5ProdutosPorValor,
          itensVencendo
        });
      } catch (error) {
        console.error("Erro ao carregar dados de estoque:", error);
      }
      setIsLoading(false);
    };

    loadEstoqueData();
  }, []);

  const formatCurrency = (value) => `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
  const formatDate = (date) => format(new Date(date), 'dd/MM/yyyy');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to={createPageUrl('ContagemExpress')}
        className="flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10 dark:border-primary/30"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Contagem Express</h3>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            Contagem rápida no estilo PDV — carrinho, diferenças e lançamento com PIN.
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </Link>

      {/* KPIs - SEM BORDAS */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-4">Visão Geral</h3>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Valor Estoque</div>
            <div className="text-xl font-semibold text-foreground dark:text-foreground">
              {formatCurrency(data.valorEstoque)}
            </div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Abaixo Mínimo</div>
            <div className="text-xl font-semibold text-red-600 dark:text-red-500">
              {data.itensAbaixoMinimo}
            </div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Sem Giro</div>
            <div className="text-xl font-semibold text-foreground dark:text-foreground">
              {data.itensSemGiro}
            </div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Acurácia</div>
            <div className="text-xl font-semibold text-green-600 dark:text-green-500">
              {data.acuracidadeEstoque}%
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 e Vencimentos - SEM BORDAS */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">Top 5 por Valor</h3>
          </div>
          <div className="space-y-2">
            {data.top5ProdutosPorValor.map((produto, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0 mr-2">{produto.nome}</span>
                <span className="text-sm font-semibold text-foreground dark:text-foreground">{formatCurrency(produto.valor)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">Próximos Vencimentos</h3>
          </div>
          {data.itensVencendo.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum item vencendo</p>
          ) : (
            <div className="space-y-2">
              {data.itensVencendo.map((item, index) => (
                <div key={index} className="py-2 border-b last:border-0 border-border/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{item.nome}</div>
                      <div className="text-xs text-muted-foreground">Lote: {item.lote}</div>
                    </div>
                    <div className="text-xs text-foreground/90 whitespace-nowrap">
                      {formatDate(item.validade)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Contagem - SEM BORDAS */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-4">Última Contagem</h3>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-3xl font-bold text-foreground dark:text-foreground mb-1">0</div>
            <div className="text-xs text-muted-foreground">Discrepâncias</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-3xl font-bold text-foreground dark:text-foreground mb-1">{formatCurrency(0)}</div>
            <div className="text-xs text-muted-foreground">Excesso/Falta</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-500 mb-1">100%</div>
            <div className="text-xs text-muted-foreground">Acuracidade</div>
          </div>
        </div>
      </div>
    </div>
  );
}