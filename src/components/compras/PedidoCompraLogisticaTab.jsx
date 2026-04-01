import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Truck, ChevronDown, ChevronUp, Edit3, Plus, Layers, Package, AlertTriangle, CheckCircle2, Clock, Handshake } from 'lucide-react';
import AcordoFinanceiroOrfaoDialog from './AcordoFinanceiroOrfaoDialog';
import InformarEmbarque from './InformarEmbarque';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Calcula total embarcado por produto em TODOS os embarques
function calcularTotalEmbarcado(embarques) {
  const map = {};
  (embarques || []).forEach((emb) => {
    (emb.itens_embarcados || []).forEach((item) => {
      map[item.produto_id] = (map[item.produto_id] || 0) + (item.quantidade_embarcada || 0);
    });
  });
  return map;
}

function EmbarqueCard({ embarque, nivel, pedido, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const dataEmb = embarque.data_embarque ? new Date(embarque.data_embarque) : null;
  const eta = embarque.eta ? new Date(embarque.eta) : null;
  const totalItens = (embarque.itens_embarcados || []).reduce((s, i) => s + (i.quantidade_embarcada || 0), 0);

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      {/* Header do card */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
          <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">N{nivel}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
            {embarque.transportadora_nome || 'Transportadora não informada'}
          </p>
          <p className="text-[10px] text-gray-400 flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
            {dataEmb && <span>Emb: {format(dataEmb, 'dd/MM/yy')}</span>}
            {eta && <span className="text-teal-500">ETA: {format(eta, 'dd/MM/yy HH:mm', { locale: ptBR })}</span>}
            {embarque.volumes && <span>{embarque.volumes}</span>}
            {embarque.peso_kg > 0 && <span>{embarque.peso_kg} kg</span>}
            <span className="text-gray-500">{totalItens} un. embarcadas</span>
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(embarque)}>
            <Edit3 className="w-3.5 h-3.5 text-gray-400" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
          </Button>
        </div>
      </div>

      {/* Itens expandidos */}
      {expanded &&
      <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2 space-y-1.5">
          {(embarque.itens_embarcados || []).map((item) =>
        <div key={item.produto_id} className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1 mr-2">{item.produto_nome}</span>
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                {item.quantidade_embarcada} / {item.quantidade_pedida} {item.unidade_medida}
              </span>
            </div>
        )}
          {embarque.observacoes &&
        <p className="text-[10px] text-gray-400 italic mt-1 pt-1 border-t border-gray-100 dark:border-gray-700">{embarque.observacoes}</p>
        }
        </div>
      }
    </div>);

}

function ItensOrfaos({ itens, onAcordo }) {
  if (!itens.length) return null;
  return (
    <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Itens aguardando despacho</span>
        <span className="ml-auto text-xs text-gray-400">{itens.length} produto(s)</span>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        {itens.map((item) =>
        <div key={item.produto_id} className="flex items-start justify-between gap-3">
            <span className="text-sm text-gray-800 dark:text-gray-200 flex-1 leading-tight">{item.produto_nome}</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap flex-shrink-0">
              {item.qtd_pendente} <span className="text-gray-400 font-normal">{item.unidade_medida}</span> <span className="text-xs text-gray-400">pend.</span>
            </span>
          </div>
        )}
      </div>
      {onAcordo &&
      <div className="px-4 pb-3">
          <Button variant="ghost" size="sm" onClick={onAcordo}
        className="w-full h-9 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-dashed border-gray-200 dark:border-gray-600 rounded-xl">
            <Handshake className="w-4 h-4 mr-2" /> Registrar Acordo Financeiro
          </Button>
        </div>
      }
    </div>);

}

export default function PedidoCompraLogisticaTab({ pedido, onPedidoUpdated }) {
  const [embarqueOpen, setEmbarqueOpen] = useState(false);
  const [embarqueEditando, setEmbarqueEditando] = useState(null);
  const [acordoOpen, setAcordoOpen] = useState(false);

  const embarques = pedido?.embarques_registrados || [];
  const totalEmbarcado = useMemo(() => calcularTotalEmbarcado(embarques), [embarques]);

  // Itens órfãos: qty pedida - qty embarcada em todos os embarques
  const itensOrfaos = useMemo(() => {
    return (pedido?.itens || []).
    map((item) => ({
      ...item,
      qtd_pendente: Math.max(0, (item.quantidade || 0) - (totalEmbarcado[item.produto_id] || 0))
    })).
    filter((item) => item.qtd_pendente > 0);
  }, [pedido, totalEmbarcado]);

  const temOrfaos = itensOrfaos.length > 0;
  const semEmbarques = embarques.length === 0;

  const handleNovoEmbarque = () => {
    setEmbarqueEditando(null);
    setEmbarqueOpen(true);
  };

  const handleEditarEmbarque = (embarque) => {
    setEmbarqueEditando(embarque);
    setEmbarqueOpen(true);
  };

  const handleSuccess = () => {
    setEmbarqueOpen(false);
    setEmbarqueEditando(null);
    onPedidoUpdated?.();
  };

  return (
    <div className="space-y-4">
      {/* Header da aba com status e botões de ação */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 font-quicksand">
            Despachos
          </span>
          {embarques.length > 0 &&
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              {embarques.length} nível(is)
            </span>
          }
          {/* LED âmbar se houver órfãos */}
          {temOrfaos &&
          <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
          }
          {!temOrfaos && embarques.length > 0 &&
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
          }
        </div>

        <div className="flex items-center gap-2">
          {/* Nível Multimodal — sempre que já há embarques */}
          {!semEmbarques && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleNovoEmbarque}
              className="h-8 text-xs border-0 shadow-sm bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100">
              <Layers className="w-3.5 h-3.5 mr-1" />
              + Nível Multimodal
            </Button>
          )}
          {/* Novo Despacho — quando há órfãos */}
          {temOrfaos && (
            <Button
              size="sm"
              onClick={handleNovoEmbarque}
              className="h-8 text-xs bg-gray-800 hover:bg-gray-900 dark:bg-white dark:text-gray-900 text-white border-0 shadow-sm">
              <Plus className="w-3.5 h-3.5 mr-1" />
              + Novo Despacho
            </Button>
          )}
          {/* Primeiro Embarque */}
          {semEmbarques && (
            <Button
              size="sm"
              onClick={handleNovoEmbarque}
              className="h-8 text-xs bg-gray-800 hover:bg-gray-900 dark:bg-white dark:text-gray-900 text-white border-0 shadow-sm">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Informar Embarque
            </Button>
          )}
        </div>
      </div>

      {/* Estado vazio */}
      {semEmbarques &&
      <div className="flex flex-col items-center justify-center py-10 rounded-2xl bg-gray-50 dark:bg-gray-800/50 text-center space-y-2">
          <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum despacho registrado</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Use o botão acima para registrar o primeiro embarque</p>
        </div>
      }

      {/* Cards de embarques por nível */}
      {embarques.map((emb, idx) =>
      <EmbarqueCard
        key={emb.id}
        embarque={emb}
        nivel={idx + 1}
        pedido={pedido}
        onEdit={handleEditarEmbarque} />

      )}

      {/* Itens órfãos — exibidos abaixo dos cards */}
      {!semEmbarques && <ItensOrfaos itens={itensOrfaos} onAcordo={temOrfaos ? () => setAcordoOpen(true) : undefined} />}

      {/* Todos despachados */}
      {!semEmbarques && !temOrfaos &&
      <div className="flex items-center gap-2 rounded-2xl px-4 py-3 bg-teal-50 dark:bg-teal-900/20">
          <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
          <span className="text-xs font-medium text-teal-700 dark:text-teal-300">
            Todos os itens estão cobertos pelos embarques registrados.
          </span>
        </div>
      }

      <InformarEmbarque
        pedido={pedido}
        isOpen={embarqueOpen}
        onClose={() => {setEmbarqueOpen(false);setEmbarqueEditando(null);}}
        onSuccess={handleSuccess}
        embarqueExistente={embarqueEditando} />
      

      <AcordoFinanceiroOrfaoDialog
        isOpen={acordoOpen}
        onClose={() => setAcordoOpen(false)}
        pedido={pedido}
        itensOrfaos={itensOrfaos}
        onSuccess={() => {setAcordoOpen(false);onPedidoUpdated?.();}} />
      
    </div>);

}