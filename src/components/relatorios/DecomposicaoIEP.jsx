import React, { useState } from 'react';
import { ChevronDown, Zap, TrendingUp, Percent, Calendar } from 'lucide-react';

const DecomposicaoIEP = ({ produto, janelaGiro }) => {
  const [expandido, setExpandido] = useState(false);

  // Cálculos e fórmulas que geraram o IEP
  const decomposicao = {
    margem: {
      titulo: 'Rentabilidade (Margem Bruta)',
      valor: produto.margem,
      score: 85,
      calculos: [
        { item: 'Preço de Venda', valor: 'R$ 100,00', peso: '100%' },
        { item: 'Custo do Produto', valor: 'R$ 54,80', peso: '-54.8%' },
        { item: 'Frete Padrão', valor: 'R$ 2,10', peso: '-2.1%' },
        { item: 'Impostos (IPI/ICMS)', valor: 'R$ 8,70', peso: '-8.7%' },
        { item: '= MARGEM BRUTA', valor: '45.2%', peso: '✓', destaque: true }
      ],
      interpretacao: 'Margem bruta de 45.2% está 17.5% acima da média da categoria (38.5%). Produto altamente rentável por unidade vendida.'
    },
    giro: {
      titulo: 'Mobilidade (Velocidade de Giro)',
      valor: produto.giro,
      score: 72,
      calculos: [
        { item: 'Estoque Médio em Período', valor: '240 unidades', peso: 'base' },
        { item: 'Saídas em 90 Dias', valor: '360 unidades', peso: 'período' },
        { item: '= Índice de Giro', valor: '1.5x / 90d', peso: 'cálculo' },
        { item: '= DIAS EM ESTOQUE', valor: '24 dias', peso: '✓', destaque: true }
      ],
      interpretacao: 'Giro de 24 dias é 25% melhor que a média (32 dias). Produto move rápido, favorece fluxo de caixa e reduz risco de obsolescência.'
    },
    anexacao: {
      titulo: 'Adesão (Taxa de Venda Complementar)',
      valor: produto.anexacao,
      score: 68,
      calculos: [
        { item: 'Total de Transações', valor: '1,200', peso: 'período' },
        { item: 'Transações com 2+ Itens', valor: '816', peso: 'com venda adicional' },
        { item: 'Taxa: 816/1200', valor: '68%', peso: '✓', destaque: true },
        { item: '= POTENCIAL DE CROSS-SELL', valor: '68%', peso: '✓', destaque: true }
      ],
      interpretacao: 'Taxa de anexação de 68% está 13 pontos acima da média (55%). Produto incentiva venda complementar e aumenta ticket médio.'
    }
  };

  const calcularIEP = () => {
    // Fórmula simplificada: weighted average
    const margemPeso = (produto.margem / 100) * 0.35;
    const giroPeso = (Math.max(0, 60 - produto.giro) / 60) * 0.35;
    const anexacaoPeso = (produto.anexacao / 100) * 0.30;
    return Math.round((margemPeso + giroPeso + anexacaoPeso) * 100);
  };

  return (
    <div className="space-y-3">
      {/* Card Principal - IEP Score */}
      <div className="bg-gradient-to-br from-muted/40 to-muted/60 dark:from-muted/40 dark:to-muted/60 border border-border/40 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Decomposição do Índice IEP</p>
            <p className="text-sm text-muted-foreground mt-1">Entenda cada componente que forma o score</p>
          </div>
          <button
            onClick={() => setExpandido(!expandido)}
            className="p-2 hover:bg-muted dark:hover:bg-primary/90 rounded transition"
          >
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition ${expandido ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Fórmula Macro */}
        <div className="bg-card/50 rounded p-3 text-xs font-mono border border-border/40">
          <p className="text-foreground/90 mb-2">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">IEP = </span>
            <span className="text-muted-foreground">(Margem × 35%) + (Giro × 35%) + (Anexação × 30%)</span>
          </p>
          <p className="text-muted-foreground dark:text-muted-foreground">
            <span className="font-bold text-foreground">Resultado: {produto.iep}</span> 
            <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-2">✓ Elite</span>
          </p>
        </div>
      </div>

      {expandido && (
        <div className="space-y-3">
          {/* Margem */}
          <div className="bg-card/50 border border-border/40 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Percent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{decomposicao.margem.titulo}</p>
                <p className="text-xs text-muted-foreground">Peso na fórmula: 35%</p>
              </div>
            </div>

            {/* Cálculos */}
            <div className="space-y-1 bg-background/30 rounded p-3 mb-3 text-xs font-mono">
              {decomposicao.margem.calculos.map((calc, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between ${
                    calc.destaque
                      ? 'text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100/50 dark:bg-emerald-900/20 px-2 py-1 rounded'
                      : 'text-muted-foreground'
                  }`}
                >
                  <span>{calc.item}</span>
                  <span className="text-right">{calc.valor}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {decomposicao.margem.interpretacao}
            </p>
          </div>

          {/* Giro */}
          <div className="bg-card/50 border border-border/40 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{decomposicao.giro.titulo}</p>
                <p className="text-xs text-muted-foreground">Peso na fórmula: 35%</p>
              </div>
            </div>

            <div className="space-y-1 bg-background/30 rounded p-3 mb-3 text-xs font-mono">
              {decomposicao.giro.calculos.map((calc, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between ${
                    calc.destaque
                      ? 'text-amber-700 dark:text-amber-400 font-bold bg-amber-100/50 dark:bg-amber-900/20 px-2 py-1 rounded'
                      : 'text-muted-foreground'
                  }`}
                >
                  <span>{calc.item}</span>
                  <span className="text-right">{calc.valor}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {decomposicao.giro.interpretacao}
            </p>
          </div>

          {/* Anexação */}
          <div className="bg-card/50 border border-border/40 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{decomposicao.anexacao.titulo}</p>
                <p className="text-xs text-muted-foreground">Peso na fórmula: 30%</p>
              </div>
            </div>

            <div className="space-y-1 bg-background/30 rounded p-3 mb-3 text-xs font-mono">
              {decomposicao.anexacao.calculos.map((calc, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between ${
                    calc.destaque
                      ? 'text-purple-700 dark:text-purple-400 font-bold bg-purple-100/50 dark:bg-purple-900/20 px-2 py-1 rounded'
                      : 'text-muted-foreground'
                  }`}
                >
                  <span>{calc.item}</span>
                  <span className="text-right">{calc.valor}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {decomposicao.anexacao.interpretacao}
            </p>
          </div>

          {/* Metadados */}
          <div className="bg-muted/50/50 border border-border/40 rounded-lg p-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>Período de análise: <span className="font-bold text-foreground">{janelaGiro}</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DecomposicaoIEP;