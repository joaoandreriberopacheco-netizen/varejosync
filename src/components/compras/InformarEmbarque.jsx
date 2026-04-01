import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Package, Calendar, X, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

function fmtNum(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '0';
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function calcularStatusEmbarque(itens, embarcadosMap) {
  let totalPedido = 0;
  let totalEmbarcado = 0;

  (itens || []).forEach((item) => {
    const pedida = item.quantidade || 0;
    totalPedido += pedida;
    totalEmbarcado += Math.min(embarcadosMap[item.produto_id] || 0, pedida);
  });

  if (totalEmbarcado <= 0) return 'Nenhum';
  if (totalEmbarcado >= totalPedido) return 'Total';
  return 'Parcial';
}

export default function InformarEmbarque({ pedido, isOpen, onClose, onSuccess, embarqueExistente }) {
  const isEdicao = !!embarqueExistente;
  const [loading, setLoading] = useState(false);
  const [eta, setEta] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [transportadora, setTransportadora] = useState('');
  const [itensSelecionados, setItensSelecionados] = useState({});
  const [qtdEmbarque, setQtdEmbarque] = useState({});

  const jaEmbarcadoSemEste = useMemo(() => {
    const map = {};
    (pedido?.embarques_registrados || []).forEach((emb) => {
      if (isEdicao && emb.id === embarqueExistente?.id) return;
      (emb.itens_embarcados || []).forEach((item) => {
        map[item.produto_id] = (map[item.produto_id] || 0) + (item.quantidade_embarcada || 0);
      });
    });
    return map;
  }, [pedido, isEdicao, embarqueExistente]);

  useEffect(() => {
    if (!isOpen || !pedido) return;

    if (isEdicao && embarqueExistente) {
      setEta(embarqueExistente.eta ? embarqueExistente.eta.slice(0, 16) : '');
      setObservacoes(embarqueExistente.observacoes || '');
      setTransportadora(embarqueExistente.transportadora_nome || '');

      const nextSel = {};
      const nextQtd = {};
      (pedido.itens || []).forEach((item) => {
        const existente = (embarqueExistente.itens_embarcados || []).find((emb) => emb.produto_id === item.produto_id);
        nextSel[item.produto_id] = !!existente;
        nextQtd[item.produto_id] = existente ? String(existente.quantidade_embarcada || 0) : '0';
      });
      setItensSelecionados(nextSel);
      setQtdEmbarque(nextQtd);
      return;
    }

    setEta('');
    setObservacoes('');
    setTransportadora('');

    const nextSel = {};
    const nextQtd = {};
    (pedido.itens || []).forEach((item) => {
      const disponivel = Math.max(0, (item.quantidade || 0) - (jaEmbarcadoSemEste[item.produto_id] || 0));
      nextSel[item.produto_id] = disponivel > 0;
      nextQtd[item.produto_id] = disponivel > 0 ? String(disponivel) : '0';
    });
    setItensSelecionados(nextSel);
    setQtdEmbarque(nextQtd);
  }, [isOpen, pedido?.id, embarqueExistente?.id, isEdicao, jaEmbarcadoSemEste]);

  const statusPreview = useMemo(() => {
    const map = {};
    (pedido?.itens || []).forEach((item) => {
      map[item.produto_id] = (jaEmbarcadoSemEste[item.produto_id] || 0) + (itensSelecionados[item.produto_id] ? (parseFloat(qtdEmbarque[item.produto_id]) || 0) : 0);
    });
    return calcularStatusEmbarque(pedido?.itens || [], map);
  }, [pedido, jaEmbarcadoSemEste, itensSelecionados, qtdEmbarque]);

  const handleToggleItem = (produtoId) => {
    if (loading) return;
    setItensSelecionados((prev) => ({ ...prev, [produtoId]: !prev[produtoId] }));
  };

  const handleSalvar = async () => {
    if (loading) return;

    if (!eta) {
      toast.error('Informe a ETA');
      return;
    }

    const itensEmbarcados = (pedido?.itens || [])
      .filter((item) => itensSelecionados[item.produto_id] && (parseFloat(qtdEmbarque[item.produto_id]) || 0) > 0)
      .map((item) => ({
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        quantidade_pedida: item.quantidade,
        quantidade_embarcada: parseFloat(qtdEmbarque[item.produto_id]) || 0,
        unidade_medida: item.unidade_medida,
      }));

    if (!itensEmbarcados.length) {
      toast.error('Selecione ao menos um item');
      return;
    }

    setLoading(true);
    try {
      const embarqueData = {
        id: isEdicao ? embarqueExistente.id : `emb_${Date.now()}`,
        data_embarque: new Date().toISOString(),
        eta: new Date(eta).toISOString(),
        transportadora_id: null,
        transportadora_nome: transportadora || '',
        volumes_lista: [],
        peso_kg: 0,
        observacoes,
        itens_embarcados: itensEmbarcados,
      };

      const embarquesAtualizados = isEdicao
        ? (pedido.embarques_registrados || []).map((emb) => emb.id === embarqueExistente.id ? embarqueData : emb)
        : [...(pedido.embarques_registrados || []), embarqueData];

      const totalMap = {};
      embarquesAtualizados.forEach((emb) => {
        (emb.itens_embarcados || []).forEach((item) => {
          totalMap[item.produto_id] = (totalMap[item.produto_id] || 0) + (item.quantidade_embarcada || 0);
        });
      });

      const novoStatus = calcularStatusEmbarque(pedido.itens || [], totalMap);

      await base44.entities.PedidoCompra.update(pedido.id, {
        status: 'Despachado',
        status_embarque: novoStatus,
        data_despacho: pedido.data_despacho || new Date().toISOString(),
        embarques_registrados: embarquesAtualizados,
      });

      toast.success(isEdicao ? 'Embarque atualizado' : 'Embarque registrado');
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error(error?.message || 'Erro ao registrar embarque');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !pedido) return null;

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 z-[400] bg-black/30" onClick={() => !loading && onClose?.()} />
      <div className="fixed inset-0 z-[401] flex items-center justify-center p-4">
        <div className="w-full max-w-xl max-h-[92vh] overflow-hidden rounded-3xl bg-white dark:bg-gray-900 shadow-2xl">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <Truck className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-quicksand font-semibold text-base text-gray-900 dark:text-white truncate">
                {isEdicao ? 'Editar Embarque' : 'Informar Embarque'} — {pedido.numero}
              </p>
            </div>
            <button
              type="button"
              onClick={() => !loading && onClose?.()}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(92vh-140px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 dark:text-gray-400">ETA *</Label>
                <Input
                  type="datetime-local"
                  value={eta}
                  disabled={loading}
                  onChange={(e) => setEta(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Transportadora</Label>
                <Input
                  value={transportadora}
                  disabled={loading}
                  onChange={(e) => setTransportadora(e.target.value)}
                  placeholder="Digite o nome da transportadora"
                  className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Itens do embarque</Label>
              <div className="space-y-2">
                {(pedido.itens || []).map((item) => {
                  const selecionado = !!itensSelecionados[item.produto_id];
                  const outrosEmb = jaEmbarcadoSemEste[item.produto_id] || 0;
                  const disponivel = Math.max(0, (item.quantidade || 0) - outrosEmb);
                  const excede = (parseFloat(qtdEmbarque[item.produto_id]) || 0) > disponivel;

                  return (
                    <div key={item.produto_id} className={`flex items-center gap-3 rounded-2xl bg-gray-50 dark:bg-gray-800/70 px-3 py-3 ${!selecionado ? 'opacity-50' : ''}`}>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleToggleItem(item.produto_id)}
                        className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center ${selecionado ? 'bg-teal-500 text-white' : 'bg-white dark:bg-gray-700 text-transparent'}`}
                      >
                        ✓
                      </button>

                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.produto_nome}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          Pedido: {fmtNum(item.quantidade)} {item.unidade_medida} · Disponível: {fmtNum(disponivel)}
                        </p>
                      </div>

                      <Input
                        type="text"
                        inputMode="decimal"
                        disabled={!selecionado || loading}
                        value={selecionado ? (qtdEmbarque[item.produto_id] ?? '') : '0'}
                        onChange={(e) => setQtdEmbarque((prev) => ({ ...prev, [item.produto_id]: e.target.value.replace(',', '.') }))}
                        className={`w-20 min-w-20 flex-shrink-0 text-right bg-white dark:bg-gray-700 border-0 shadow-sm ${excede ? 'ring-1 ring-rose-400' : ''}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-xs font-medium ${
              statusPreview === 'Total'
                ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                : statusPreview === 'Parcial'
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}>
              {statusPreview === 'Total' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
              {statusPreview === 'Parcial' && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              {statusPreview === 'Nenhum' && <Package className="w-4 h-4 flex-shrink-0" />}
              <span>
                {statusPreview === 'Total' && 'Embarque total'}
                {statusPreview === 'Parcial' && 'Embarque parcial'}
                {statusPreview === 'Nenhum' && 'Nenhum item selecionado'}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Observações</Label>
              <Input
                value={observacoes}
                disabled={loading}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações do embarque"
                className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" onClick={() => !loading && onClose?.()} disabled={loading} className="border-0 shadow-sm bg-gray-50 dark:bg-gray-800">
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={loading} className="min-w-[170px] bg-teal-600 hover:bg-teal-700 text-white border-0 shadow-sm">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</> : 'Registrar Embarque'}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}