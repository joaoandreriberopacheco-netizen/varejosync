import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Receipt, Edit, ShoppingCart } from 'lucide-react';
import { createPageUrl } from '@/components/utils';

export default function ProcessarVendasPage() {
  const [rascunhos, setRascunhos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRascunhos();
    
    const unsubscribe = base44.entities.RascunhoPedidoVenda.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        loadRascunhos();
      }
    });
    
    return unsubscribe;
  }, []);

  const loadRascunhos = async () => {
    try {
      const allRascunhos = await base44.entities.RascunhoPedidoVenda.list();
      const aguardando = allRascunhos.filter(r => r.status === 'Aguardando Caixa');
      setRascunhos(aguardando);
    } catch (error) {
      console.error('Erro ao carregar rascunhos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatarValor = (valor) => {
    return (valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white font-glacial">
            Processar Vendas
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {rascunhos.length} {rascunhos.length === 1 ? 'venda aguardando' : 'vendas aguardando'}
          </p>
        </div>

        {/* Lista de Vendas */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 dark:border-gray-700 dark:border-t-white rounded-full animate-spin"></div>
          </div>
        ) : rascunhos.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-base font-medium text-gray-600 dark:text-gray-400">
              Nenhuma venda aguardando
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              As vendas aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rascunhos.map((rascunho) => (
              <div
                key={rascunho.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  {rascunho.senha_atendimento && (
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Senha</div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-white font-mono">
                        {rascunho.senha_atendimento.slice(-4)}
                      </div>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-medium text-gray-900 dark:text-white truncate">
                      {rascunho.cliente_nome}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {rascunho.vendedor_nome}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">
                      R$ {formatarValor(rascunho.valor_total)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {rascunho.itens?.length || 0} {rascunho.itens?.length === 1 ? 'item' : 'itens'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => window.open(createPageUrl('PDV') + `?mode=vendedor&rascunho_id=${rascunho.id}`, '_blank')}
                    className="flex-1 h-12 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => {
                      // Aqui será implementado o dialog de confirmação de pagamento
                      console.log('Confirmar venda:', rascunho.id);
                    }}
                    className="flex-1 h-12 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:shadow-md transition-shadow"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}