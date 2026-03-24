import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, Receipt, Edit, Eye, X, Package } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function ProcessarVendasView({ rascunhosAguardando = [], onBack, onRefresh, onAbrirPedido, formatarValorExibicao }) {
  const [rascunhoDetalhes, setRascunhoDetalhes] = useState(null);
  return (
    <>
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" style={{ minWidth: '44px', minHeight: '44px' }}>
          <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
        <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">Processar Vendas</h2>
        <button onClick={onRefresh} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" style={{ minWidth: '44px', minHeight: '44px' }} title="Atualizar (F7)">
          <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Aguardando</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">
              {rascunhosAguardando.length} {rascunhosAguardando.length === 1 ? 'Venda' : 'Vendas'}
            </div>
          </div>
          {rascunhosAguardando.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Receipt className="w-10 h-10 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-base font-medium text-gray-600 dark:text-gray-400">Nenhuma venda aguardando</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">As vendas aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rascunhosAguardando.map((rascunho) => (
                <div key={rascunho.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onAbrirPedido(rascunho)}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    {rascunho.senha_atendimento && (
                      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-xl">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Senha</div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white font-mono">{rascunho.senha_atendimento.slice(-4)}</div>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-medium text-gray-900 dark:text-white truncate">{rascunho.cliente_nome}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{rascunho.vendedor_nome}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">R$ {formatarValorExibicao(rascunho.valor_total)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{rascunho.itens?.length || 0} {rascunho.itens?.length === 1 ? 'item' : 'itens'}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setRascunhoDetalhes(rascunho); }}
                      className="h-12 px-4 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2" style={{ minHeight: '48px' }}>
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); window.open(createPageUrl('PDV') + `?mode=vendedor&rascunho_id=${rascunho.id}`, '_blank'); }}
                      className="flex-1 h-12 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2" style={{ minHeight: '48px' }}>
                      <Edit className="w-4 h-4" /><span>Editar</span>
                    </button>
                    <button onClick={() => onAbrirPedido(rascunho)}
                      className="flex-1 h-12 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:shadow-md transition-shadow" style={{ minHeight: '48px' }}>
                      Confirmar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    {/* Modal de Detalhes */}
    {rascunhoDetalhes && (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider">Senha</div>
              <div className="text-3xl font-bold font-mono text-gray-900 dark:text-white">{rascunhoDetalhes.senha_atendimento?.slice(-4)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">{rascunhoDetalhes.cliente_nome || 'Avulso'}</div>
              <div className="text-xs text-gray-400">{rascunhoDetalhes.vendedor_nome}</div>
            </div>
            <button onClick={() => setRascunhoDetalhes(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-5 space-y-3">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Itens</div>
            {(rascunhoDetalhes.itens || []).map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white leading-snug">{item.produto_nome}</div>
                  <div className="text-xs text-gray-400 mt-0.5">R$ {(item.preco_unitario_praticado || 0).toFixed(2)} × {item.quantidade}</div>
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">R$ {formatarValorExibicao(item.total || 0)}</div>
              </div>
            ))}
            {rascunhoDetalhes.valor_desconto > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Desconto</span><span>-R$ {formatarValorExibicao(rascunhoDetalhes.valor_desconto)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-800">
              <span>Total</span><span>R$ {formatarValorExibicao(rascunhoDetalhes.valor_total || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}