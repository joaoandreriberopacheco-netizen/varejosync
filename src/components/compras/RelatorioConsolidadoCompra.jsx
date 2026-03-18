import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, Package, Loader2 } from 'lucide-react';
import { formatarDataHora } from '@/components/utils/dateUtils';

const fmtR = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const VariacaoIndicador = ({ valor }) => {
  if (valor === 0 || valor === null || valor === undefined) return null;
  const isPositivo = valor > 0;
  return (
    <span className={`text-[10px] font-medium flex items-center gap-0.5 whitespace-nowrap ${
      isPositivo ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'
    }`}>
      {isPositivo ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {Math.abs(valor).toFixed(1)}%
    </span>
  );
};

export default function RelatorioConsolidadoCompra({ pedidoId }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!pedidoId) return;
    const gerarRelatorio = async () => {
      setLoading(true);
      const resultado = await base44.functions.invoke('gerarRelatorioConsolidadoCompra', { pedido_id: pedidoId });
      setDados(resultado);
      setError(null);
      setLoading(false);
    };
    gerarRelatorio().catch(err => { setError(err.message); setLoading(false); });
  }, [pedidoId]);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>;
  if (error)   return <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">Erro: {error}</div>;
  if (!dados)  return null;

  const { pedido, itens_consolidados } = dados;

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white font-glacial">{pedido.numero}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{pedido.fornecedor_nome} · {formatarDataHora(pedido.created_date)}</p>
          </div>
          <span className="text-[10px] px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full font-medium whitespace-nowrap">
            {pedido.status}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Data Prevista</p>
            <p className="text-xs font-medium text-gray-800 dark:text-gray-100">
              {pedido.data_prevista_entrega ? new Date(pedido.data_prevista_entrega).toLocaleDateString('pt-BR') : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Total do Pedido</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">R$ {fmtR(pedido.valor_total)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Itens</p>
            <p className="text-xs font-medium text-gray-800 dark:text-gray-100">{itens_consolidados.length} produto(s)</p>
          </div>
        </div>
      </div>

      {/* Itens — cards mobile-first, sem tabela horizontal */}
      <div className="space-y-2">
        {itens_consolidados.map((item, idx) => (
          <div key={idx} className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            {/* Nome do produto */}
            <div className="px-4 pt-3 pb-2 border-b border-gray-50 dark:border-gray-700/50">
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 uppercase">{item.nome_produto}</p>
              </div>
            </div>

            {/* Linha de valores principais */}
            <div className="grid grid-cols-3 gap-0 divide-x divide-gray-50 dark:divide-gray-700/50 px-0">
              <div className="px-4 py-2.5">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Qtd</p>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-200 tabular-nums">{item.quantidade}</p>
              </div>
              <div className="px-4 py-2.5">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">V. Unit.</p>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-200 tabular-nums">R$ {fmtR(item.valor_unitario_compra)}</p>
              </div>
              <div className="px-4 py-2.5">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Total</p>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-100 tabular-nums">R$ {fmtR(item.valor_total_item)}</p>
              </div>
            </div>

            {/* Custo e Preço de Venda */}
            <div className="grid grid-cols-2 gap-0 divide-x divide-gray-50 dark:divide-gray-700/50 border-t border-gray-50 dark:border-gray-700/50">
              <div className="px-4 py-2.5">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Custo Calculado</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-200 tabular-nums">R$ {fmtR(item.custo_calculado)}</p>
                  <VariacaoIndicador valor={item.variacao_custo_pct} />
                </div>
              </div>
              <div className="px-4 py-2.5">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Preço de Venda</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-200 tabular-nums">R$ {fmtR(item.preco_venda_atual)}</p>
                  <VariacaoIndicador valor={item.variacao_preco_venda_pct} />
                </div>
              </div>
            </div>

            {/* Detalhes de custos (expansível) */}
            <details className="group">
              <summary className="px-4 py-2 text-[10px] text-gray-400 dark:text-gray-500 cursor-pointer select-none border-t border-gray-50 dark:border-gray-700/50 list-none flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-300">
                <span className="group-open:hidden">▸</span>
                <span className="hidden group-open:inline">▾</span>
                Ver composição de custos
              </summary>
              <div className="px-4 pb-3 space-y-1.5">
                {[
                  { label: item.nome_custo1, val: item.custo_imposto1 },
                  { label: item.nome_custo2, val: item.custo_imposto2 },
                  { label: item.nome_custo3, val: item.custo_outros },
                ].filter(r => r.val > 0).map((r, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{r.label}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-200 tabular-nums">R$ {fmtR(r.val)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-gray-100 dark:border-gray-700 text-xs">
                  <span className="font-semibold text-gray-700 dark:text-gray-200">Custo Total</span>
                  <span className="font-bold text-gray-900 dark:text-white tabular-nums">R$ {fmtR(item.custo_calculado)}</span>
                </div>
              </div>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}