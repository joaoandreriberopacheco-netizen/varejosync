import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, ShoppingCart, FileText, ChevronRight, Package, Clock } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fmtR = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function OrcamentosRecentesSheet({ isOpen, onClose, currentUser, tabelaPreco, onCarregarOrcamento }) {
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (isOpen) loadOrcamentos();
  }, [isOpen]);

  const loadOrcamentos = async () => {
    setLoading(true);
    try {
      const todos = await base44.entities.PedidoVenda.filter({ tipo: 'Orçamento' }, '-created_date', 50);
      const limite = subDays(new Date(), 2);
      const recentes = todos.filter(o => new Date(o.created_date) >= limite);
      setOrcamentos(recentes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCarregar = (orcamento) => {
    const itensCarrinho = (orcamento.itens || []).map(item => ({
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      codigo_interno: item.codigo_interno || '001',
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario_praticado,
      preco_unitario_praticado: item.preco_unitario_praticado,
      custo_unitario_momento: item.custo_unitario_momento || 0,
      total: item.total,
      estoque_disponivel: 999
    }));
    onCarregarOrcamento(itensCarrinho, orcamento);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <button
          onClick={onClose}
          className="p-2 -ml-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white font-glacial">Orçamentos Recentes</h2>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">Últimos 2 dias</p>
        </div>
        <Clock className="w-4 h-4 text-gray-400" />
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
          </div>
        ) : orcamentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FileText className="w-12 h-12 mb-3 text-gray-200 dark:text-gray-700" />
            <p className="text-sm font-medium">Nenhum orçamento nos últimos 2 dias</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {orcamentos.map(orc => {
              const isExpanded = expandedId === orc.id;
              const dataCriacao = new Date(orc.created_date);
              return (
                <div key={orc.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : orc.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 active:bg-gray-100 transition-colors"
                  >
                    {/* Ícone */}
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                        {orc.cliente_nome || 'Sem cliente'} · {(orc.itens || []).length} item(s)
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {format(dataCriacao, "dd/MM · HH'h'mm", { locale: ptBR })} · {orc.vendedor_nome || '—'}
                      </p>
                    </div>
                    {/* Total + chevron */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                        R$ {fmtR(orc.valor_total)}
                      </span>
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {/* Detalhe expandido */}
                  {isExpanded && (
                    <div className="bg-gray-50 dark:bg-gray-800/40 px-4 pb-4 pt-2 space-y-2">
                      {/* Itens */}
                      <div className="space-y-1">
                        {(orc.itens || []).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <Package className="w-3 h-3 text-gray-400" />
                              </div>
                              <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{item.produto_nome}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                              <span className="text-[11px] text-gray-400">{item.quantidade}x</span>
                              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
                                R$ {fmtR(item.total)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Botão carregar */}
                      <button
                        onClick={() => handleCarregar(orc)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-sm font-semibold active:scale-[0.98] transition-all"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Carregar no PDV
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}