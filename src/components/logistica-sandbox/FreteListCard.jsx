import React, { useMemo } from 'react';
import { ShipWheel } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

function getButtonBorderColor(temConta, status, estaAtrazo) {
  // Sem conta vinculada - cinza claro
  if (!temConta) {
    return 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500';
  }

  // Com atraso - flamingo (rosa coral)
  if (estaAtrazo) {
    return 'border-pink-400 text-pink-500 dark:border-pink-400 dark:text-pink-400';
  }

  // Pago - verde oliva
  if (status === 'Pago') {
    return 'border-amber-700 text-amber-700 dark:border-amber-600 dark:text-amber-600';
  }

  // Pendente - verde lima (vinculada mas não paga)
  return 'border-lime-400 text-lime-500 dark:border-lime-400 dark:text-lime-400';
}

export default function FreteListCard({ evento, onSelect }) {
  const { data: embarques = [] } = useQuery({
    queryKey: ['embarques-evento', evento.id],
    queryFn: () => base44.entities.Embarque.filter({ evento_logistico_id: evento.id }),
    initialData: []
  });

  const temContaFrete = !!evento.lancamento_financeiro_id;
  const statusConta = evento.lancamento_financeiro_status;
  const estaAtrasada = temContaFrete && 
    statusConta !== 'Pago' && 
    evento.lancamento_financeiro_data_vencimento && 
    new Date(evento.lancamento_financeiro_data_vencimento) < new Date();
  
  const borderColor = getButtonBorderColor(temContaFrete, statusConta, estaAtrasada);
  const valorFrete = evento.lancamento_financeiro_valor || 0;
  
  // Calcula total de carga real dos embarques
  const totalCargaReal = useMemo(() => {
    return embarques.reduce((sum, emb) => {
      return sum + ((emb.itens || []).reduce((itemSum, item) => {
        return itemSum + ((item.quantidade_embarcada || 0) * (item.custo_unitario_momento || 0));
      }, 0));
    }, 0);
  }, [embarques]);
  
  // Conta fornecedores únicos
  const fornecedoresUnicos = useMemo(() => {
    const set = new Set(embarques.map(e => e.fornecedor_id).filter(Boolean));
    return set.size;
  }, [embarques]);

  return (
    <button onClick={() => onSelect(evento)} className="w-full text-left bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm active:scale-[0.99] transition-transform">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <ShipWheel className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{evento.embarcacao_nome}</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{evento.codigo || 'Sem código'}</p>
          <div className="space-y-1 mt-2 text-[11px] text-gray-500 dark:text-gray-400">
            <div className="flex justify-between gap-4">
              <span>{embarques.length} embarques</span>
              <span>{totalCargaReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>{fornecedoresUnicos} fornecedores</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {valorFrete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(evento);
            }}
            className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-xl transition-colors hover:opacity-80 ${borderColor}`}
          >
            $
          </button>
        </div>
      </div>
    </button>
  );
}