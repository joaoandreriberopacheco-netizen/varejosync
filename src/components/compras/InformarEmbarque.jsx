import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Package, Calendar, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { toast } from 'sonner';

// Calcula quanto já foi embarcado por produto, excluindo um embarque específico
function calcularJaEmbarcadoSemEste(pedido, excluirId) {
  const map = {};
  (pedido?.embarques_registrados || []).forEach(emb => {
    if (emb.id === excluirId) return;
    (emb.itens_embarcados || []).forEach(item => {
      map[item.produto_id] = (map[item.produto_id] || 0) + (item.quantidade_embarcada || 0);
    });
  });
  return map;
}

function calcularStatusEmbarque(itens, jaEmbarcadoFinal) {
  let totalPedido = 0;
  let totalEmbarcado = 0;
  itens.forEach(item => {
    const pedida = item.quantidade || 0;
    const emb = jaEmbarcadoFinal[item.produto_id] || 0;
    totalPedido += pedida;
    totalEmbarcado += Math.min(emb, pedida);
  });
  if (totalEmbarcado <= 0) return 'Nenhum';
  if (totalEmbarcado >= totalPedido) return 'Total';
  return 'Parcial';
}

// embarqueExistente: se fornecido, modo edição
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

  // Quantidades já embarcadas em OUTROS embarques (excluindo o atual em modo edição)
  const jaEmbarcadoSemEste = useMemo(
    () => calcularJaEmbarcadoSemEste(pedido, embarqueExistente?.id),
    [pedido, embarqueExistente]
  );

  useEffect(() => {
    if (isOpen && pedido) {
      loadTransportadoras();

      if (isEdicao && embarqueExistente) {
        // Modo edição: pré-preenche com dados do embarque existente
        setTransportadoraId(embarqueExistente.transportadora_id || '');
        setEta(embarqueExistente.eta || '');
        setVolumes(embarqueExistente.volumes || '');
        setPesoKg(embarqueExistente.peso_kg ? String(embarqueExistente.peso_kg) : '');
        setObservacoes(embarqueExistente.observacoes || '');

        const initial = {};
        (pedido.itens || []).forEach(item => {
          const itemEmb = (embarqueExistente.itens_embarcados || []).find(i => i.produto_id === item.produto_id);
          initial[item.produto_id] = itemEmb ? String(itemEmb.quantidade_embarcada) : '0';
        });
        setQtdEmbarque(initial);
      } else {
        // Modo criação: pré-preenche com itens pendentes (órfãos)
        setTransportadoraId('');
        setEta('');
        setVolumes('');
        setPesoKg('');
        setObservacoes('');

        const initial = {};
        (pedido.itens || []).forEach(item => {
          const pendente = (item.quantidade || 0) - (jaEmbarcadoSemEste[item.produto_id] || 0);
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

  // Preview do status considerando qtds deste embarque + outros
  const statusPreview = useMemo(() => {
    const totalFinal = {};
    (pedido?.itens || []).forEach(item => {
      const outros = jaEmbarcadoSemEste[item.produto_id] || 0;
      const este = parseFloat(qtdEmbarque[item.produto_id]) || 0;
      totalFinal[item.produto_id] = outros + este;
    });
    return calcularStatusEmbarque(pedido?.itens || [], totalFinal);
  }, [pedido, jaEmbarcadoSemEste, qtdEmbarque]);

  const handleSalvar = async () => {
    if (!transportadoraId) return toast.error('Selecione a transportadora');
    if (!eta) return toast.error('Informe a ETA (chegada prevista)');

    const algumEmbarcado = Object.values(qtdEmbarque).some(v => parseFloat(v) > 0);
    if (!algumEmbarcado) return toast.error('Informe a quantidade embarcada de ao menos um item');

    setLoading(true);
    try {
      const transportadora = transportadoras.find(t => t.id === transportadoraId);
      const itensEmbarcados = (pedido.itens || [])
        .filter(item => parseFloat(qtdEmbarque[item.produto_id]) > 0)
        .map(item => ({
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          quantidade_pedida: item.quantidade,
          quantidade_embarcada: parseFloat(qtdEmbarque[item.produto_id]) || 0,
          unidade_medida: item.unidade_medida
        }));

      const embarqueData = {
        id: isEdicao ? embarqueExistente.id : `emb_${Date.now()}`,
        data_embarque: isEdicao ? embarqueExistente.data_embarque : new Date().toISOString(),
        eta,
        transportadora_id: transportadoraId,
        transportadora_nome: transportadora?.nome || '',
        volumes,
        peso_kg: parseFloat(pesoKg) || 0,
        observacoes,
        itens_embarcados: itensEmbarcados
      };

      let embarcadosAtualizados;
      if (isEdicao) {
        // Substitui o embarque existente
        embarcadosAtualizados = (pedido.embarques_registrados || []).map(e =>
          e.id === embarqueExistente.id ? embarqueData : e
        );
      } else {
        embarcadosAtualizados = [...(pedido.embarques_registrados || []), embarqueData];
      }

      // Recalcula status_embarque com todos os embarques
      const todosJaEmbarcado = {};
      embarcadosAtualizados.forEach(emb => {
        (emb.itens_embarcados || []).forEach(item => {
          todosJaEmbarcado[item.produto_id] = (todosJaEmbarcado[item.produto_id] || 0) + item.quantidade_embarcada;
        });
      });
      const novoStatusEmbarque = calcularStatusEmbarque(pedido.itens || [], todosJaEmbarcado);

      await base44.entities.PedidoCompra.update(pedido.id, {
        status: 'Despachado',
        data_despacho: pedido.data_despacho || new Date().toISOString(),
        status_embarque: novoStatusEmbarque,
        embarques_registrados: embarcadosAtualizados
      });

      toast.success(novoStatusEmbarque === 'Total'
        ? 'Embarque total registrado — todos os itens despachados!'
        : 'Embarque parcial registrado — LED âmbar ativo, há itens pendentes.');

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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-quicksand text-gray-900 dark:text-white">
            {isEdicao ? <Edit3 className="w-4 h-4 text-amber-500" /> : <Truck className="w-4 h-4 text-teal-600" />}
            {isEdicao ? 'Editar Embarque' : 'Informar Embarque'} — {pedido.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Transportadora */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Transportadora *</Label>
            <Select value={transportadoraId} onValueChange={setTransportadoraId}>
              <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 border-0 shadow-lg z-[9999]">
                {transportadoras.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ETA */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> ETA — Chegada Prevista *
            </Label>
            <Input type="datetime-local" value={eta} onChange={e => setEta(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm" />
          </div>

          {/* Volumes e Peso */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Volumes / Descritivo</Label>
              <Input placeholder="Ex: 10 pallets, 3 caixas..."
                className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm"
                value={volumes} onChange={e => setVolumes(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Peso bruto (kg)</Label>
              <Input type="text" inputMode="decimal" placeholder="0,00"
                className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm"
                value={pesoKg} onChange={e => setPesoKg(e.target.value.replace(',', '.'))} />
            </div>
          </div>

          {/* Itens embarcados */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setShowItens(!showItens)}
              className="flex items-center justify-between w-full text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" /> Itens deste embarque
                <span className="text-[10px] text-gray-400 ml-1">(zere para tornar órfão)</span>
              </span>
              {showItens ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showItens && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-2 space-y-2">
                {(pedido.itens || []).map(item => {
                  const pedida = item.quantidade || 0;
                  const outrosEmb = jaEmbarcadoSemEste[item.produto_id] || 0;
                  const disponivel = Math.max(0, pedida - outrosEmb);
                  const emb = parseFloat(qtdEmbarque[item.produto_id]) || 0;
                  const excede = emb > disponivel;
                  const isOrfao = emb === 0;

                  return (
                    <div key={item.produto_id} className={`flex items-center gap-2 rounded-lg px-2 py-1 transition-colors ${isOrfao ? 'opacity-40' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{item.produto_nome}</p>
                        <p className="text-[10px] text-gray-400">
                          Pedido: {pedida} {item.unidade_medida}
                          {outrosEmb > 0 && <span className="ml-1 text-teal-500">· Outros emb: {outrosEmb}</span>}
                          {disponivel < pedida && disponivel > 0 && <span className="ml-1 text-amber-500">· Disponível: {disponivel}</span>}
                        </p>
                      </div>
                      <div className="w-20">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={qtdEmbarque[item.produto_id] ?? ''}
                          onChange={e => setQtdEmbarque(prev => ({ ...prev, [item.produto_id]: e.target.value.replace(',', '.') }))}
                          className={`h-7 text-xs text-right border-0 bg-white dark:bg-gray-700 shadow-sm ${excede ? 'ring-1 ring-rose-400' : ''} ${isOrfao ? 'text-gray-400' : ''}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview do status */}
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${
            statusPreview === 'Total'
              ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
              : statusPreview === 'Parcial'
              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
          }`}>
            {statusPreview === 'Total' && <CheckCircle2 className="w-3.5 h-3.5" />}
            {statusPreview === 'Parcial' && <AlertTriangle className="w-3.5 h-3.5" />}
            {statusPreview === 'Nenhum' && <Package className="w-3.5 h-3.5" />}
            {statusPreview === 'Total' && 'Embarque total — todos os itens cobertos'}
            {statusPreview === 'Parcial' && 'Embarque parcial — haverá itens órfãos aguardando despacho'}
            {statusPreview === 'Nenhum' && 'Informe as quantidades a embarcar'}
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Observações</Label>
            <Input placeholder="Observações sobre este embarque..."
              className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm"
              value={observacoes} onChange={e => setObservacoes(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading} size="sm"
            className="border-0 shadow-sm">Cancelar</Button>
          <Button onClick={handleSalvar} disabled={loading} size="sm"
            className={isEdicao ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'}>
            {loading ? 'Salvando...' : isEdicao ? 'Salvar Edição' : 'Registrar Embarque'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}