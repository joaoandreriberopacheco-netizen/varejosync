import React, { useState, useEffect } from 'react';
import { DollarSign, LinkIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AnexosPanel from '@/components/anexos/AnexosPanel';

function getContaStatusStyle(temConta, status, estaAtrasada) {
  if (!temConta) return { bgClass: 'bg-gray-50 dark:bg-gray-800', strokeColor: '#d1d5db', label: 'Sem vinculação' };
  if (estaAtrasada) return { bgClass: 'bg-red-50 dark:bg-red-900/20', strokeColor: '#ff5a7f', label: 'Atrasada' };
  if (status === 'Pago') return { bgClass: 'bg-green-50 dark:bg-green-900/20', strokeColor: '#7c8a0f', label: 'Paga' };
  return { bgClass: 'bg-lime-50 dark:bg-lime-900/20', strokeColor: '#84cc16', label: 'Vinculada' };
}

export default function FreteDetailPanel({ evento, embarques, onBack }) {
  const [contaAtualizada, setContaAtualizada] = useState(evento.conta_frete);
  const [temConta, setTemConta] = useState(evento.tem_conta_frete);

  const calcularValorTotalEmbarques = () => {
    if (!embarques || embarques.length === 0) return 0;
    return embarques.reduce((total, emb) => {
      const valorEmbarque = (emb.itens || []).reduce((sum, item) => {
        return sum + ((item.quantidade_embarcada || 0) * (item.custo_unitario_momento || 0));
      }, 0);
      return total + valorEmbarque;
    }, 0);
  };

  useEffect(() => {
    if (!contaAtualizada?.id) return;

    const unsubscribe = base44.entities.LancamentoFinanceiro.subscribe((event) => {
      if (event.id === contaAtualizada.id) {
        if (event.type === 'delete' || event.data?.status === 'Cancelado') {
          setContaAtualizada(null);
          setTemConta(false);
        } else if (event.type === 'update') {
          setContaAtualizada(event.data);
        }
      }
    });

    return unsubscribe;
  }, [contaAtualizada?.id]);

  const handleCreateContaFrete = () => {
    const eta = evento.data_previsao_chegada ? ` ETA ${new Date(evento.data_previsao_chegada).toLocaleDateString('pt-BR')}` : '';
    const descricao = `Frete - ${evento.embarcacao_nome} ${evento.codigo}${eta}`;
    const valor = evento.valor_total_frete || calcularValorTotalEmbarques() || 0;
    
    const encodedDesc = encodeURIComponent(descricao);
    const encodedRef = encodeURIComponent(evento.id);
    
    window.location.href = `/FluxoCaixa?tipo=Despesa&descricao=${encodedDesc}&valor=${valor}&referencia_id=${encodedRef}&referencia_tipo=EventosLogisticos`;
  };

  const statusConta = contaAtualizada?.status;
  const estaAtrasada = temConta && statusConta !== 'Pago' && contaAtualizada?.data_vencimento && new Date(contaAtualizada.data_vencimento) < new Date();
  const { bgClass, strokeColor, label } = getContaStatusStyle(temConta, statusConta, estaAtrasada);

  return (
    <div className="space-y-4 pb-4">
      <button
        onClick={onBack}
        className="text-sm text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-300"
      >
        ← Voltar
      </button>

      {/* Cabeçalho com Status */}
      <div className="rounded-3xl bg-white dark:bg-gray-800 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{evento.embarcacao_nome}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{evento.codigo}</p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${bgClass}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 6v12" />
              <path d="M9 9h6a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-6" />
            </svg>
          </div>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">{label}</div>
      </div>

      {/* Informações da Conta ou CTA para criar */}
      {temConta && contaAtualizada ? (
        <div className="rounded-3xl bg-gray-50 dark:bg-gray-800 p-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Valor:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {(contaAtualizada.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Status:</span>
            <span className="font-semibold text-gray-900 dark:text-white">{statusConta}</span>
          </div>
          {contaAtualizada.data_vencimento && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Vencimento:</span>
              <span className={`font-semibold ${estaAtrasada ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {new Date(contaAtualizada.data_vencimento).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={handleCreateContaFrete}
          className="w-full rounded-3xl bg-lime-100 dark:bg-lime-900/20 px-4 py-3 flex items-center justify-between text-sm font-medium text-lime-700 dark:text-lime-300 hover:bg-lime-200 dark:hover:bg-lime-900/30 transition-colors"
        >
          <span>Criar Conta a Pagar</span>
          <LinkIcon className="w-4 h-4" />
        </button>
      )
      }

      {/* Valor Total do Frete */}
      <div className="rounded-3xl bg-gray-50 dark:bg-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Valor total do frete</span>
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {(evento.valor_total_frete || evento.valor_total_carga || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>

      {/* Resumo de Embarques */}
      <div className="rounded-3xl bg-gray-50 dark:bg-gray-800 p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-900 dark:text-white mb-2">Embarques vinculados</p>
        <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
          <div className="flex justify-between">
            <span>Total de embarques:</span>
            <span className="font-medium text-gray-900 dark:text-white">{embarques?.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Valor total:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {(evento.valor_total_carga || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Fornecedores:</span>
            <span className="font-medium text-gray-900 dark:text-white">{evento.total_fornecedores_relacionados || 0}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700">
            <span className="font-semibold">Valor carga:</span>
            <span className="font-bold text-gray-900 dark:text-white">
              {calcularValorTotalEmbarques().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          </div>
          </div>

      {/* Seção de Anexos */}
      {contaAtualizada?.id && (
        <AnexosPanel
          referencia_id={contaAtualizada.id}
          referencia_tipo="LancamentoFinanceiro"
          titulo="Documentos"
        />
      )}
      {!contaAtualizada?.id && (
        <div className="rounded-3xl bg-gray-50 dark:bg-gray-800 p-4 text-center text-xs text-gray-500 dark:text-gray-400">
          Crie uma conta a pagar para adicionar documentos
        </div>
      )}
    </div>
  );
}