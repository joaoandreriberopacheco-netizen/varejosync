import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, Package, Loader2 } from 'lucide-react';
import { formatarDataHora } from '@/components/utils/dateUtils';

const VariacaoIndicador = ({ valor }) => {
  const isPositivo = valor > 0;
  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${
      isPositivo ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
    }`}>
      {isPositivo ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      <span>{Math.abs(valor).toFixed(1)}%</span>
    </div>
  );
};

export default function RelatorioConsolidadoCompra({ pedidoId }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!pedidoId) return;
    
    const gerarRelatorio = async () => {
      try {
        setLoading(true);
        const resultado = await base44.functions.invoke('gerarRelatorioConsolidadoCompra', {
          pedido_id: pedidoId
        });
        setDados(resultado);
        setError(null);
      } catch (err) {
        console.error('Erro ao gerar relatório:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    gerarRelatorio();
  }, [pedidoId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-2xl">
        Erro ao gerar relatório: {error}
      </div>
    );
  }

  if (!dados) {
    return null;
  }

  const { pedido, itens_consolidados } = dados;

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Relatório */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-glacial mb-1">
              {pedido.numero}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pedido.fornecedor_nome} · {formatarDataHora(pedido.created_date)}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">
              {pedido.status}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Data Prevista</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {new Date(pedido.data_prevista_entrega).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total do Pedido</p>
            <p className="font-bold text-gray-900 dark:text-white text-lg">
              R$ {pedido.valor_total.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Itens</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {itens_consolidados.length} produto(s)
            </p>
          </div>
        </div>
      </div>

      {/* Tabela de Itens Consolidados */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Produto</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qtd</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">V. Unit.</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Desc.</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Custo Calc.</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">P. Venda</th>
              </tr>
            </thead>
            <tbody>
              {itens_consolidados.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.nome_produto}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.id_produto}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900 dark:text-white">{item.quantidade}</td>
                  <td className="px-6 py-4 text-right text-gray-900 dark:text-white font-medium">
                    R$ {item.valor_unitario_compra.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900 dark:text-white">
                    R$ {item.desconto_compra.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900 dark:text-white font-bold">
                    R$ {item.valor_total_item.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-end justify-end gap-2">
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          R$ {item.custo_calculado.toFixed(2)}
                        </p>
                      </div>
                      <VariacaoIndicador valor={item.variacao_custo_pct} />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-end justify-end gap-2">
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          R$ {item.preco_venda_atual.toFixed(2)}
                        </p>
                      </div>
                      <VariacaoIndicador valor={item.variacao_preco_venda_pct} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalhes de Custos */}
      <div className="grid md:grid-cols-2 gap-6">
        {itens_consolidados.map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              {item.nome_produto}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{item.nome_custo1}</span>
                <span className="font-medium text-gray-900 dark:text-white">R$ {item.custo_imposto1.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{item.nome_custo2}</span>
                <span className="font-medium text-gray-900 dark:text-white">R$ {item.custo_imposto2.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{item.nome_custo3}</span>
                <span className="font-medium text-gray-900 dark:text-white">R$ {item.custo_outros.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between">
                <span className="font-semibold text-gray-900 dark:text-white">Custo Total</span>
                <span className="font-bold text-gray-900 dark:text-white">R$ {item.custo_calculado.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}