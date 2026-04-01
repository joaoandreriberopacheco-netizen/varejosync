import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Package, Calendar, PlusCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

// Calcula quanto já foi embarcado por produto em embarques anteriores
function calcularJaEmbarcado(pedido) {
  const map = {};
  (pedido?.embarques_registrados || []).forEach((emb) => {
    (emb.itens_embarcados || []).forEach((item) => {
      map[item.produto_id] = (map[item.produto_id] || 0) + (item.quantidade_embarcada || 0);
    });
  });
  return map;
}

// Retorna status_embarque calculado
function calcularStatusEmbarque(itens, jaEmbarcado, novasQtds) {
  let totalPedido = 0;
  let totalEmbarcado = 0;
  itens.forEach((item) => {
    const pedida = item.quantidade || 0;
    const anterior = jaEmbarcado[item.produto_id] || 0;
    const nova = parseFloat(novasQtds[item.produto_id]) || 0;
    totalPedido += pedida;
    totalEmbarcado += Math.min(anterior + nova, pedida);
  });
  if (totalEmbarcado <= 0) return 'Nenhum';
  if (totalEmbarcado >= totalPedido) return 'Total';
  return 'Parcial';
}

export default function InformarEmbarque({ pedido, isOpen, onClose, onSuccess, embarqueExistente }) {
  const isEdicao = !!embarqueExistente;
  const [transportadoras, setTransportadoras] = useState([]);
  const [transportadoraId, setTransportadoraId] = useState('');
  const [eta, setEta] = useState('');
  const [volumes, setVolumes] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showItens, setShowItens] = useState(true);
  const [qtdEmbarque, setQtdEmbarque] = useState({});

  // jaEmbarcado exclui o embarque sendo editado
  const jaEmbarcado = useMemo(() => {
    const map = {};
    (pedido?.embarques_registrados || []).forEach((emb) => {
      if (isEdicao && emb.id === embarqueExistente.id) return; // exclui o atual na edição
      (emb.itens_embarcados || []).forEach((item) => {
        map[item.produto_id] = (map[item.produto_id] || 0) + (item.quantidade_embarcada || 0);
      });
    });
    return map;
  }, [pedido, embarqueExistente]);

  useEffect(() => {
    if (isOpen && pedido) {
      loadTransportadoras();
      if (isEdicao) {
        // Pré-preenche com os dados do embarque existente
        setTransportadoraId(embarqueExistente.transportadora_id || '');
        // Converte data ISO para datetime-local
        const etaVal = embarqueExistente.eta
          ? new Date(embarqueExistente.eta).toISOString().slice(0, 16)
          : '';
        setEta(etaVal);
        setVolumes(embarqueExistente.volumes || '');
        setPesoKg(embarqueExistente.peso_kg ? String(embarqueExistente.peso_kg) : '');
        setObservacoes(embarqueExistente.observacoes || '');
        const initial = {};
        (pedido.itens || []).forEach((item) => {
          const embItem = (embarqueExistente.itens_embarcados || []).find(i => i.produto_id === item.produto_id);
          initial[item.produto_id] = embItem ? String(embItem.quantidade_embarcada) : '0';
        });
        setQtdEmbarque(initial);
      } else {
        setTransportadoraId('');
        setEta('');
        setVolumes('');
        setPesoKg('');
        setObservacoes('');
        const initial = {};
        (pedido.itens || []).forEach((item) => {
          const pendente = (item.quantidade || 0) - (jaEmbarcado[item.produto_id] || 0);
          initial[item.produto_id] = pendente > 0 ? String(pendente) : '0';
        });
        setQtdEmbarque(initial);
      }
    }
  }, [isOpen, pedido, embarqueExistente]);

  const loadTransportadoras = async () => {
    try {
      const data = await base44.entities.Terceiro.filter({ tipo: { $in: ['Fornecedor', 'Ambos'] }, ativo: true });
      setTransportadoras(data || []);
    } catch {
      toast.error('Erro ao carregar transportadoras');
    }
  };

  const statusEmbarquePreview = useMemo(() =>
  calcularStatusEmbarque(pedido?.itens || [], jaEmbarcado, qtdEmbarque),
  [pedido, jaEmbarcado, qtdEmbarque]
  );

  const handleSalvar = async () => {
    if (!transportadoraId) return toast.error('Selecione a transportadora');
    if (!eta) return toast.error('Informe a ETA (chegada prevista)');

    const algumEmbarcado = Object.values(qtdEmbarque).some((v) => parseFloat(v) > 0);
    if (!algumEmbarcado) return toast.error('Informe a quantidade embarcada de ao menos um item');

    setLoading(true);
    try {
      const transportadora = transportadoras.find((t) => t.id === transportadoraId);
      const itensEmbarcados = (pedido.itens || [])
        .filter((item) => parseFloat(qtdEmbarque[item.produto_id]) > 0)
        .map((item) => ({
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          quantidade_pedida: item.quantidade,
          quantidade_embarcada: parseFloat(qtdEmbarque[item.produto_id]) || 0,
          unidade_medida: item.unidade_medida
        }));

      let embarcadosAtualizados;
      if (isEdicao) {
        // Atualiza o embarque existente mantendo id e data original
        embarcadosAtualizados = (pedido.embarques_registrados || []).map((emb) =>
          emb.id === embarqueExistente.id
            ? { ...emb, eta, transportadora_id: transportadoraId, transportadora_nome: transportadora?.nome || '', volumes, peso_kg: parseFloat(pesoKg) || 0, observacoes, itens_embarcados: itensEmbarcados }
            : emb
        );
      } else {
        const novoEmbarque = {
          id: `emb_${Date.now()}`,
          data_embarque: new Date().toISOString(),
          eta,
          transportadora_id: transportadoraId,
          transportadora_nome: transportadora?.nome || '',
          volumes,
          peso_kg: parseFloat(pesoKg) || 0,
          observacoes,
          itens_embarcados: itensEmbarcados
        };
        embarcadosAtualizados = [...(pedido.embarques_registrados || []), novoEmbarque];
      }

      const todosJaEmbarcado = calcularJaEmbarcado({ embarques_registrados: embarcadosAtualizados });
      const novoStatusEmbarque = calcularStatusEmbarque(pedido.itens || [], todosJaEmbarcado, {});

      await base44.entities.PedidoCompra.update(pedido.id, {
        status: 'Despachado',
        data_despacho: pedido.data_despacho || new Date().toISOString(),
        status_embarque: novoStatusEmbarque,
        embarques_registrados: embarcadosAtualizados
      });

      toast.success(isEdicao ? 'Embarque atualizado com sucesso!' : novoStatusEmbarque === 'Total' ? 'Embarque total registrado!' : 'Embarque parcial registrado.');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error('Erro ao salvar embarque: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !pedido) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 font-quicksand">
              {isEdicao ? 'Editar Embarque' : 'Informar Embarque'} <span className="text-gray-400 font-normal">— {pedido.numero}</span>
            </h2>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto">

          {/* ETA + Transportadora */}
          <div className="space-y-1.5">
            <label className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> ETA — Chegada Prevista <span className="text-gray-400">*</span>
            </label>
            <Input
              type="datetime-local"
              value={eta}
              onChange={(e) => setEta(e.target.value)}
              className="h-12 rounded-xl border-0 bg-gray-50 dark:bg-gray-800 shadow-sm text-sm text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-gray-500 dark:text-gray-400">Transportadora <span className="text-gray-400 font-normal text-xs">(opcional)</span></label>
            <Select value={transportadoraId} onValueChange={setTransportadoraId}>
              <SelectTrigger className="h-12 rounded-xl border-0 bg-gray-50 dark:bg-gray-800 shadow-sm text-sm text-gray-800 dark:text-gray-200">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <SelectValue placeholder="Selecione..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                {transportadoras.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Volumes */}
          <div className="space-y-1.5">
            <label className="text-sm text-gray-500 dark:text-gray-400">Volumes <span className="text-gray-400 font-normal text-xs">(opcional)</span></label>
            <Input
              placeholder="Ex: 10 pallets, 3 caixas..."
              value={volumes}
              onChange={(e) => setVolumes(e.target.value)}
              className="h-12 rounded-xl border-0 bg-gray-50 dark:bg-gray-800 shadow-sm text-sm"
            />
          </div>

          {/* Itens embarcados */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowItens(!showItens)}
              className="flex items-center justify-between w-full py-1">
              <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                <Package className="w-3.5 h-3.5" />
                Itens deste embarque
                <span className="text-xs text-gray-400 font-normal">(desmarque para tornar órfão)</span>
              </span>
              {showItens ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {showItens && (
              <div className="space-y-2">
                {(pedido.itens || []).map((item) => {
                  const pedida = item.quantidade || 0;
                  const anterior = jaEmbarcado[item.produto_id] || 0;
                  const pendente = Math.max(0, pedida - anterior);
                  const emb = parseFloat(qtdEmbarque[item.produto_id]) || 0;
                  const excede = emb > pendente;

                  return (
                    <div key={item.produto_id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                      {/* Info produto */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight">{item.produto_nome}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Ped: {pedida} {item.unidade_medida}
                          {anterior > 0 && <span className="ml-1.5 text-gray-500">· já emb: {anterior}</span>}
                          {pendente < pedida && pendente > 0 && <span className="ml-1.5 text-gray-500">· disp: {pendente}</span>}
                          {excede && <span className="ml-1.5 text-red-500">· excede!</span>}
                        </p>
                      </div>
                      {/* Input quantidade */}
                      <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={qtdEmbarque[item.produto_id] ?? ''}
                          onChange={(e) => setQtdEmbarque((prev) => ({ ...prev, [item.produto_id]: e.target.value.replace(',', '.') }))}
                          className={`w-20 h-10 text-sm text-right rounded-xl border-0 bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100 px-3 ${excede ? 'ring-1 ring-red-400' : ''}`}
                        />
                        <span className="text-[10px] text-gray-400">{item.unidade_medida}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview status */}
          <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
            statusEmbarquePreview === 'Total'
              ? 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              : statusEmbarquePreview === 'Parcial'
              ? 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
          }`}>
            {statusEmbarquePreview === 'Total' && <CheckCircle2 className="w-4 h-4 text-gray-400 flex-shrink-0" />}
            {statusEmbarquePreview === 'Parcial' && <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />}
            {statusEmbarquePreview === 'Nenhum' && <Package className="w-4 h-4 text-gray-300 flex-shrink-0" />}
            <span>
              {statusEmbarquePreview === 'Total' && 'Embarque total — todos os itens cobertos'}
              {statusEmbarquePreview === 'Parcial' && 'Embarque parcial — haverá itens órfãos aguardando despacho'}
              {statusEmbarquePreview === 'Nenhum' && 'Informe as quantidades a embarcar'}
            </span>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <label className="text-sm text-gray-500 dark:text-gray-400">Observações</label>
            <Input
              placeholder="Observações sobre este embarque..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="h-12 rounded-xl border-0 bg-gray-50 dark:bg-gray-800 shadow-sm text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-5 border-t border-gray-100 dark:border-gray-800">
          <Button variant="outline" onClick={onClose} disabled={loading}
            className="h-12 px-6 rounded-xl border-0 shadow-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={loading}
            className="h-12 px-8 rounded-xl border-0 shadow-sm bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 text-white min-w-[160px]">
            {loading ? 'Salvando...' : isEdicao ? 'Salvar Edição' : 'Registrar Embarque'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>);

}