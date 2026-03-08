import React, { useState } from 'react';
import { ChevronDown, Zap, TrendingUp, Percent, Calendar } from 'lucide-react';

const DecomposicaoIEP = ({ produto, janelaGiro }) => {
  const [expandido, setExpandido] = useState(false);

  // Mock de cálculos e fórmulas que geraram o IEP
  const decomposicao = {
    margem: {
      titulo: 'Potencial (Margem Bruta)',
      valor: produto.margem,
      score: 85,
      calculos: [
        { item: 'Preço Venda', valor: 'R$ 100,00', peso: '100%' },
        { item: 'Custo Direto', valor: 'R$ 54,80', peso: '-54.8%' },
        { item: 'Frete Padrão', valor: 'R$ 2,10', peso: '-2.1%' },
        { item: 'IPI/ICMS (ST)', valor: 'R$ 8,70', peso: '-8.7%' },
        { item: '= MARGEM BRUTA', valor: '45.2%', peso: '✓', destaque: true }
      ],
      interpretacao: 'Margem bruta 45.2% está 17.5% acima da média da categoria (38.5%). Produto altamente rentável por unidade.'
    },
    giro: {
      titulo: 'Cinética (Frequência de Giro)',
      valor: produto.giro,
      score: 72,
      calculos: [
        { item: 'Estoque Médio', valor: '240 unidades', peso: 'base' },
        { item: 'Saídas em 90d', valor: '360 unidades', peso: 'período' },
        { item: '= Taxa de Giro', valor: '1.5x / 90d', peso: 'cálculo' },
        { item: '= DIAS PADRÃO', valor: '24 dias', peso: '✓', destaque: true }
      ],
      interpretacao: 'Giro de 24 dias é 25% melhor que a média (32 dias). Produto move rápido, bom para fluxo de caixa e menor risco de obsolescência.'
    },
    anexacao: {
      titulo: 'Magnética (Taxa de Anexação)',
      valor: produto.anexacao,
      score: 68,
      calculos: [
        { item: 'Transações com Produto', valor: '1,200', peso: 'período' },
        { item: 'Transações + 2+ itens', valor: '816', peso: 'com anexo' },
        { item: 'Taxa: 816/1200', valor: '68%', peso: '✓', destaque: true },
        { item: '= PODER DE CROSS-SELL', valor: '68%', peso: '✓', destaque: true }
      ],
      interpretacao: '68% de anexação está 13 pontos acima da média (55%). Produto é ímã para venda adicional, aumenta ticket médio.'
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
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Decomposição do Índice IEP</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Entenda cada componente que forma o score</p>
          </div>
          <button
            onClick={() => setExpandido(!expandido)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition"
          >
            <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition ${expandido ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Fórmula Macro */}
        <div className="bg-white dark:bg-gray-900/50 rounded p-3 text-xs font-mono border border-gray-200 dark:border-gray-700">
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">IEP = </span>
            <span className="text-gray-600 dark:text-gray-400">(Margem × 35%) + (Giro × 35%) + (Anexação × 30%)</span>
          </p>
          <p className="text-gray-600 dark:text-gray-500">
            <span className="font-bold text-gray-900 dark:text-white">Resultado: {produto.iep}</span> 
            <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-2">✓ Elite</span>
          </p>
        </div>
      </div>

      {expandido && (
        <div className="space-y-3">
          {/* Margem */}
          <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Percent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{decomposicao.margem.titulo}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Peso na fórmula: 35%</p>
              </div>
            </div>

            {/* Cálculos */}
            <div className="space-y-1 bg-gray-50 dark:bg-gray-900/30 rounded p-3 mb-3 text-xs font-mono">
              {decomposicao.margem.calculos.map((calc, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between ${
                    calc.destaque
                      ? 'text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100/50 dark:bg-emerald-900/20 px-2 py-1 rounded'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span>{calc.item}</span>
                  <span className="text-right">{calc.valor}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {decomposicao.margem.interpretacao}
            </p>
          </div>

          {/* Giro */}
          <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{decomposicao.giro.titulo}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Peso na fórmula: 35%</p>
              </div>
            </div>

            <div className="space-y-1 bg-gray-50 dark:bg-gray-900/30 rounded p-3 mb-3 text-xs font-mono">
              {decomposicao.giro.calculos.map((calc, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between ${
                    calc.destaque
                      ? 'text-amber-700 dark:text-amber-400 font-bold bg-amber-100/50 dark:bg-amber-900/20 px-2 py-1 rounded'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span>{calc.item}</span>
                  <span className="text-right">{calc.valor}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {decomposicao.giro.interpretacao}
            </p>
          </div>

          {/* Anexação */}
          <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{decomposicao.anexacao.titulo}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Peso na fórmula: 30%</p>
              </div>
            </div>

            <div className="space-y-1 bg-gray-50 dark:bg-gray-900/30 rounded p-3 mb-3 text-xs font-mono">
              {decomposicao.anexacao.calculos.map((calc, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between ${
                    calc.destaque
                      ? 'text-purple-700 dark:text-purple-400 font-bold bg-purple-100/50 dark:bg-purple-900/20 px-2 py-1 rounded'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span>{calc.item}</span>
                  <span className="text-right">{calc.valor}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {decomposicao.anexacao.interpretacao}
            </p>
          </div>

          {/* Metadados */}
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-xs">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>Período de análise: <span className="font-bold text-gray-900 dark:text-white">{janelaGiro}</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DecomposicaoIEP;