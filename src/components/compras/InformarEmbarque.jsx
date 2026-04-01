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

export default function InformarEmbarque({ pedido, isOpen, onClose, onSuccess }) {
  const [transportadoras, setTransportadoras] = useState([]);
  const [transportadoraId, setTransportadoraId] = useState('');
  const [eta, setEta] = useState('');
  const [volumes, setVolumes] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showItens, setShowItens] = useState(true);
  // qtdEmbarque: { [produto_id]: string }
  const [qtdEmbarque, setQtdEmbarque] = useState({});

  const jaEmbarcado = useMemo(() => calcularJaEmbarcado(pedido), [pedido]);

  useEffect(() => {
    if (isOpen && pedido) {
      loadTransportadoras();
      setTransportadoraId('');
      setEta('');
      setVolumes('');
      setPesoKg('');
      setObservacoes('');
      // Pré-preenche com a diferença pendente de cada item
      const initial = {};
      (pedido.itens || []).forEach((item) => {
        const pendente = (item.quantidade || 0) - (jaEmbarcado[item.produto_id] || 0);
        initial[item.produto_id] = pendente > 0 ? String(pendente) : '0';
      });
      setQtdEmbarque(initial);
    }
  }, [isOpen, pedido]);

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
      const itensEmbarcados = (pedido.itens || []).
      filter((item) => parseFloat(qtdEmbarque[item.produto_id]) > 0).
      map((item) => ({
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        quantidade_pedida: item.quantidade,
        quantidade_embarcada: parseFloat(qtdEmbarque[item.produto_id]) || 0,
        unidade_medida: item.unidade_medida
      }));

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

      const embarcadosAtualizados = [...(pedido.embarques_registrados || []), novoEmbarque];

      // Recalcula status_embarque com todos os embarques incluindo o novo
      const todosJaEmbarcado = calcularJaEmbarcado({ embarques_registrados: embarcadosAtualizados });
      const novoStatusEmbarque = calcularStatusEmbarque(pedido.itens || [], todosJaEmbarcado, {});

      await base44.entities.PedidoCompra.update(pedido.id, {
        status: 'Despachado',
        data_despacho: new Date().toISOString(),
        status_embarque: novoStatusEmbarque,
        embarques_registrados: embarcadosAtualizados
      });

      toast.success(novoStatusEmbarque === 'Total' ?
      'Embarque total registrado — pedido despachado!' :
      'Embarque parcial registrado — LED âmbar ativo até completar o despacho.');

      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error('Erro ao registrar embarque: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !pedido) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-quicksand">
            <Truck className="w-4 h-4 text-teal-600" />
            Informar Embarque — {pedido.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Transportadora */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Transportadora *</Label>
            <Select value={transportadoraId} onValueChange={setTransportadoraId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {transportadoras.map((t) =>
                <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* ETA */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> ETA — Chegada Prevista *
            </Label>
            <Input type="datetime-local" value={eta} onChange={(e) => setEta(e.target.value)} />
          </div>

          {/* Volumes e Peso */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Volumes / Descritivo</Label>
              <Input placeholder="Ex: 10 pallets, 3 caixas..." value={volumes} onChange={(e) => setVolumes(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Peso bruto (kg)</Label>
              <Input type="text" inputMode="decimal" placeholder="0,00" value={pesoKg} onChange={(e) => setPesoKg(e.target.value.replace(',', '.'))} />
            </div>
          </div>

          {/* Itens embarcados */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setShowItens(!showItens)}
              className="flex items-center justify-between w-full text-xs text-gray-500 hover:text-gray-700 transition-colors">
              
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" /> Itens deste embarque
              </span>
              {showItens ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showItens &&
            <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-2 space-y-2">
                {(pedido.itens || []).map((item) => {
                const pedida = item.quantidade || 0;
                const anterior = jaEmbarcado[item.produto_id] || 0;
                const pendente = Math.max(0, pedida - anterior);
                const emb = parseFloat(qtdEmbarque[item.produto_id]) || 0;
                const excede = emb > pendente;

                return (
                  <div key={item.produto_id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{item.produto_nome}</p>
                        <p className="text-[10px] text-gray-400">
                          Pedido: {pedida} {item.unidade_medida}
                          {anterior > 0 && <span className="ml-1 text-teal-500">· Já emb: {anterior}</span>}
                          {pendente < pedida && <span className="ml-1 text-amber-500">· Pendente: {pendente}</span>}
                        </p>
                      </div>
                      <div className="w-20">
                        <Input
                        type="text"
                        inputMode="decimal"
                        value={qtdEmbarque[item.produto_id] ?? ''}
                        onChange={(e) => setQtdEmbarque((prev) => ({ ...prev, [item.produto_id]: e.target.value.replace(',', '.') }))} className="flex h-10 w-13 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-7 text-xs text-right " />

                      
                      </div>
                    </div>);

              })}
              </div>
            }
          </div>

          {/* Preview do status */}
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${
          statusEmbarquePreview === 'Total' ?
          'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300' :
          statusEmbarquePreview === 'Parcial' ?
          'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' :
          'bg-gray-100 dark:bg-gray-800 text-gray-500'}`
          }>
            {statusEmbarquePreview === 'Total' && <CheckCircle2 className="w-3.5 h-3.5" />}
            {statusEmbarquePreview === 'Parcial' && <AlertTriangle className="w-3.5 h-3.5" />}
            {statusEmbarquePreview === 'Nenhum' && <Package className="w-3.5 h-3.5" />}
            {statusEmbarquePreview === 'Total' && 'Embarque total — todos os itens despachados'}
            {statusEmbarquePreview === 'Parcial' && 'Embarque parcial — LED âmbar até completar o despacho'}
            {statusEmbarquePreview === 'Nenhum' && 'Informe as quantidades a embarcar'}
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Observações</Label>
            <Input placeholder="Observações sobre este embarque..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading} size="sm">Cancelar</Button>
          <Button onClick={handleSalvar} disabled={loading} size="sm" className="bg-teal-600 hover:bg-teal-700">
            {loading ? 'Salvando...' : 'Registrar Embarque'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

}