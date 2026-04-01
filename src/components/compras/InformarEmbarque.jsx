import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Truck, Package, Calendar, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Edit3, Boxes, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import VolumesDialog from './VolumesDialog';

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtNum(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  if (Math.abs(n) < 1000) return String(val);
  return n.toLocaleString('pt-BR');
}

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
  let totalPedido = 0, totalEmbarcado = 0;
  itens.forEach(item => {
    totalPedido += item.quantidade || 0;
    totalEmbarcado += Math.min(jaEmbarcadoFinal[item.produto_id] || 0, item.quantidade || 0);
  });
  if (totalEmbarcado <= 0) return 'Nenhum';
  if (totalEmbarcado >= totalPedido) return 'Total';
  return 'Parcial';
}

// ── Nova Transportadora rápida ─────────────────────────────────────────────
function NovaTransportadoraDialog({ isOpen, onClose, onCreated }) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!nome.trim()) return toast.error('Informe o nome da transportadora');
    setLoading(true);
    try {
      const nova = await base44.entities.Transportadora.create({ nome: nome.trim(), telefone, ativo: true });
      toast.success('Transportadora criada!');
      onCreated(nova);
      setNome(''); setTelefone('');
      onClose();
    } catch (e) {
      toast.error('Erro ao criar: ' + e.message);
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xs bg-white dark:bg-gray-900 border-0 shadow-2xl rounded-2xl z-[10000]">
        <DialogHeader>
          <DialogTitle className="text-sm font-quicksand text-gray-900 dark:text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-teal-600" /> Nova Transportadora
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500 dark:text-gray-400">Nome *</Label>
            <Input placeholder="Nome da transportadora" value={nome} onChange={e => setNome(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
              onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500 dark:text-gray-400">Telefone</Label>
            <Input placeholder="(00) 00000-0000" value={telefone} onChange={e => setTelefone(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="border-0 shadow-sm text-gray-700 dark:text-gray-300">Cancelar</Button>
          <Button size="sm" onClick={handleCreate} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white">
            {loading ? 'Criando...' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Painel principal ───────────────────────────────────────────────────────
export default function InformarEmbarque({ pedido, isOpen, onClose, onSuccess, embarqueExistente }) {
  const isEdicao = !!embarqueExistente;

  const [transportadoras, setTransportadoras] = useState([]);
  const [transportadoraId, setTransportadoraId] = useState('');
  const [eta, setEta] = useState('');
  const [volumes, setVolumes] = useState([]);
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showItens, setShowItens] = useState(true);
  const [qtdEmbarque, setQtdEmbarque] = useState({});
  const [itensSelecionados, setItensSelecionados] = useState({});
  const [showVolumesDialog, setShowVolumesDialog] = useState(false);
  const [showNovaTransp, setShowNovaTransp] = useState(false);

  const jaEmbarcadoSemEste = useMemo(
    () => calcularJaEmbarcadoSemEste(pedido, embarqueExistente?.id),
    [pedido, embarqueExistente]
  );

  useEffect(() => {
    if (isOpen && pedido) {
      loadTransportadoras();
      if (isEdicao && embarqueExistente) {
        setTransportadoraId(embarqueExistente.transportadora_id || '');
        setEta(embarqueExistente.eta || '');
        setVolumes(embarqueExistente.volumes_lista || []);
        setObservacoes(embarqueExistente.observacoes || '');
        const initial = {}, sel = {};
        (pedido.itens || []).forEach(item => {
          const itemEmb = (embarqueExistente.itens_embarcados || []).find(i => i.produto_id === item.produto_id);
          initial[item.produto_id] = itemEmb ? String(itemEmb.quantidade_embarcada) : '0';
          sel[item.produto_id] = !!(itemEmb && itemEmb.quantidade_embarcada > 0);
        });
        setQtdEmbarque(initial);
        setItensSelecionados(sel);
      } else {
        setTransportadoraId(''); setEta(''); setVolumes([]); setObservacoes('');
        const initial = {}, sel = {};
        (pedido.itens || []).forEach(item => {
          const pendente = (item.quantidade || 0) - (jaEmbarcadoSemEste[item.produto_id] || 0);
          initial[item.produto_id] = pendente > 0 ? String(pendente) : '0';
          sel[item.produto_id] = pendente > 0;
        });
        setQtdEmbarque(initial); setItensSelecionados(sel);
      }
    }
  }, [isOpen, pedido, embarqueExistente]);

  const loadTransportadoras = async () => {
    try {
      const data = await base44.entities.Transportadora.filter({ ativo: true });
      setTransportadoras(data || []);
    } catch { toast.error('Erro ao carregar transportadoras'); }
  };

  const toggleItem = (produtoId, pedida) => {
    const novoSel = !itensSelecionados[produtoId];
    setItensSelecionados(prev => ({ ...prev, [produtoId]: novoSel }));
    if (!novoSel) {
      setQtdEmbarque(prev => ({ ...prev, [produtoId]: '0' }));
    } else {
      const disponivel = Math.max(0, pedida - (jaEmbarcadoSemEste[produtoId] || 0));
      setQtdEmbarque(prev => ({ ...prev, [produtoId]: String(disponivel) }));
    }
  };

  const statusPreview = useMemo(() => {
    const totalFinal = {};
    (pedido?.itens || []).forEach(item => {
      const outros = jaEmbarcadoSemEste[item.produto_id] || 0;
      const este = itensSelecionados[item.produto_id] ? (parseFloat(qtdEmbarque[item.produto_id]) || 0) : 0;
      totalFinal[item.produto_id] = outros + este;
    });
    return calcularStatusEmbarque(pedido?.itens || [], totalFinal);
  }, [pedido, jaEmbarcadoSemEste, qtdEmbarque, itensSelecionados]);

  const volumesResumo = useMemo(() => {
    if (!volumes.length) return null;
    const total = volumes.reduce((s, v) => s + (v.peso_total_kg || 0), 0);
    const totalVol = volumes.reduce((s, v) => s + (v.quantidade || 0), 0);
    return `${fmtNum(totalVol)} volumes · ${fmtNum(total.toFixed(1))} kg`;
  }, [volumes]);

  const handleSalvar = async () => {
    if (!eta) return toast.error('Informe a ETA (chegada prevista)');
    const algumSelecionado = Object.entries(itensSelecionados).some(([pid, sel]) => sel && parseFloat(qtdEmbarque[pid]) > 0);
    if (!algumSelecionado) return toast.error('Selecione ao menos um item para embarcar');

    setLoading(true);
    try {
      const transportadora = transportadoras.find(t => t.id === transportadoraId);
      const itensEmbarcados = (pedido.itens || [])
        .filter(item => itensSelecionados[item.produto_id] && parseFloat(qtdEmbarque[item.produto_id]) > 0)
        .map(item => ({
          produto_id: item.produto_id, produto_nome: item.produto_nome,
          quantidade_pedida: item.quantidade,
          quantidade_embarcada: parseFloat(qtdEmbarque[item.produto_id]) || 0,
          unidade_medida: item.unidade_medida
        }));

      const pesoTotalKg = volumes.reduce((s, v) => s + (v.peso_total_kg || 0), 0);
      const embarqueData = {
        id: isEdicao ? embarqueExistente.id : `emb_${Date.now()}`,
        data_embarque: isEdicao ? embarqueExistente.data_embarque : new Date().toISOString(),
        eta, transportadora_id: transportadoraId || null,
        transportadora_nome: transportadora?.nome || '',
        volumes_lista: volumes, peso_kg: pesoTotalKg,
        observacoes, itens_embarcados: itensEmbarcados
      };

      const embarcadosAtualizados = isEdicao
        ? (pedido.embarques_registrados || []).map(e => e.id === embarqueExistente.id ? embarqueData : e)
        : [...(pedido.embarques_registrados || []), embarqueData];

      const todosJaEmbarcado = {};
      embarcadosAtualizados.forEach(emb => {
        (emb.itens_embarcados || []).forEach(item => {
          todosJaEmbarcado[item.produto_id] = (todosJaEmbarcado[item.produto_id] || 0) + item.quantidade_embarcada;
        });
      });
      const novoStatusEmbarque = calcularStatusEmbarque(pedido.itens || [], todosJaEmbarcado);

      await base44.entities.PedidoCompra.update(pedido.id, {
        status: 'Despachado', data_despacho: pedido.data_despacho || new Date().toISOString(),
        status_embarque: novoStatusEmbarque, embarques_registrados: embarcadosAtualizados
      });

      toast.success(novoStatusEmbarque === 'Total' ? 'Embarque total registrado!' : 'Embarque parcial — LED âmbar ativo.');
      onSuccess?.(); onClose();
    } catch (err) {
      toast.error('Erro ao salvar embarque: ' + (err.message || 'Erro desconhecido'));
    } finally { setLoading(false); }
  };

  if (!isOpen || !pedido) return null;

  return (
    <>
      {/* Overlay com blur sobre o formulário principal */}
      <div className="fixed inset-0 z-[200] flex items-center justify-center">
        {/* Fundo desfocado — não bloqueia visibilidade total */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

        {/* Painel do embarque */}
        <div className="relative z-10 w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl mx-4">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            {isEdicao ? <Edit3 className="w-4 h-4 text-amber-500" /> : <Truck className="w-4 h-4 text-teal-600" />}
            <span className="font-quicksand font-semibold text-sm text-gray-900 dark:text-white flex-1">
              {isEdicao ? 'Editar Embarque' : 'Informar Embarque'} — {pedido.numero}
            </span>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* ETA (obrigatório — em destaque) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 font-semibold">
                <Calendar className="w-3 h-3" /> ETA — Chegada Prevista *
              </Label>
              <Input type="datetime-local" value={eta} onChange={e => setEta(e.target.value)}
                className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm text-gray-900 dark:text-gray-100 h-11" />
            </div>

            {/* Transportadora (opcional) + criar nova */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Transportadora <span className="text-gray-400">(opcional)</span></Label>
              <div className="flex gap-2">
                <Select value={transportadoraId} onValueChange={setTransportadoraId}>
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm text-gray-900 dark:text-gray-100 flex-1">
                    <SelectValue placeholder="Selecione ou deixe em branco..." />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 border-0 shadow-lg z-[9999]">
                    <SelectItem value={null}>Não informada</SelectItem>
                    {transportadoras.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon"
                  className="h-11 w-11 border-0 shadow-sm bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-teal-600 flex-shrink-0"
                  onClick={() => setShowNovaTransp(true)} title="Nova transportadora">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Volumes — botão abre dialog */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Volumes da Carga <span className="text-gray-400">(opcional)</span></Label>
              <button type="button" onClick={() => setShowVolumesDialog(true)}
                className="w-full flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 h-11 text-sm text-left shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Boxes className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className={volumes.length > 0 ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}>
                  {volumes.length > 0 ? volumesResumo : 'Clique para adicionar volumes...'}
                </span>
                {volumes.length > 0 && (
                  <span className="ml-auto text-[10px] text-teal-600 dark:text-teal-400 font-semibold bg-teal-50 dark:bg-teal-900/30 px-1.5 py-0.5 rounded-full">
                    {volumes.length} tipo(s)
                  </span>
                )}
              </button>
            </div>

            {/* Itens do embarque */}
            <div className="space-y-1.5">
              <button type="button" onClick={() => setShowItens(!showItens)}
                className="flex items-center justify-between w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" /> Itens deste embarque
                  <span className="text-[10px] text-gray-400 ml-1">(desmarque para tornar órfão)</span>
                </span>
                {showItens ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showItens && (
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-2 space-y-1.5">
                  {(pedido.itens || []).map(item => {
                    const pedida = item.quantidade || 0;
                    const outrosEmb = jaEmbarcadoSemEste[item.produto_id] || 0;
                    const disponivel = Math.max(0, pedida - outrosEmb);
                    const selecionado = !!itensSelecionados[item.produto_id];
                    const emb = parseFloat(qtdEmbarque[item.produto_id]) || 0;
                    const excede = emb > disponivel;

                    return (
                      <div key={item.produto_id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-opacity ${!selecionado ? 'opacity-40' : ''}`}>
                        <button type="button" onClick={() => toggleItem(item.produto_id, pedida)}
                          className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors ${
                            selecionado ? 'bg-teal-500 border-teal-500' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500'}`}>
                          {selecionado && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{item.produto_nome}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">
                            Pedido: {fmtNum(pedida)} {item.unidade_medida}
                            {outrosEmb > 0 && <span className="ml-1 text-teal-500">· Outros: {fmtNum(outrosEmb)}</span>}
                            {disponivel < pedida && disponivel > 0 && <span className="ml-1 text-amber-500">· Disp: {fmtNum(disponivel)}</span>}
                          </p>
                        </div>
                        <div className="w-24">
                          <Input type="text" inputMode="decimal" disabled={!selecionado}
                            value={selecionado ? (qtdEmbarque[item.produto_id] ?? '') : '—'}
                            onChange={e => setQtdEmbarque(prev => ({ ...prev, [item.produto_id]: e.target.value.replace(',', '.') }))}
                            className={`h-7 text-xs text-right border-0 bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100 ${excede ? 'ring-1 ring-rose-400' : ''}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status preview */}
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${
              statusPreview === 'Total' ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
              : statusPreview === 'Parcial' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
              {statusPreview === 'Total' && <CheckCircle2 className="w-3.5 h-3.5" />}
              {statusPreview === 'Parcial' && <AlertTriangle className="w-3.5 h-3.5" />}
              {statusPreview === 'Nenhum' && <Package className="w-3.5 h-3.5" />}
              {statusPreview === 'Total' && 'Embarque total — todos os itens cobertos'}
              {statusPreview === 'Parcial' && 'Embarque parcial — haverá itens órfãos aguardando despacho'}
              {statusPreview === 'Nenhum' && 'Selecione os itens e informe as quantidades'}
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Observações</Label>
              <Input placeholder="Observações sobre este embarque..."
                className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                value={observacoes} onChange={e => setObservacoes(e.target.value)} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" onClick={onClose} disabled={loading} size="sm"
              className="border-0 shadow-sm text-gray-700 dark:text-gray-300">Cancelar</Button>
            <Button onClick={handleSalvar} disabled={loading} size="sm"
              className={isEdicao ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'}>
              {loading ? 'Salvando...' : isEdicao ? 'Salvar Edição' : 'Registrar Embarque'}
            </Button>
          </div>
        </div>
      </div>

      <VolumesDialog isOpen={showVolumesDialog} onClose={() => setShowVolumesDialog(false)}
        volumes={volumes} onChange={setVolumes} />

      <NovaTransportadoraDialog isOpen={showNovaTransp} onClose={() => setShowNovaTransp(false)}
        onCreated={nova => { setTransportadoras(prev => [...prev, nova]); setTransportadoraId(nova.id); }} />
    </>
  );
}