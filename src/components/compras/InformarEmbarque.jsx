import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Truck, Package, Calendar, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Boxes, Plus, Check, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import VolumesDialog from '@/components/compras/VolumesDialog';

// ── helpers ───────────────────────────────────────────────────────────────────

function calcularJaEmbarcadoSemEmbarque(pedido, embarqueExistenteId) {
  const map = {};
  (pedido?.embarques_registrados || []).forEach((emb) => {
    if (embarqueExistenteId && emb.id === embarqueExistenteId) return;
    (emb.itens_embarcados || []).forEach((item) => {
      map[item.produto_id] = (map[item.produto_id] || 0) + (item.quantidade_embarcada || 0);
    });
  });
  return map;
}

function calcularStatusEmbarque(itens, jaEmbarcado, qtdEmbarque, selectedItems) {
  let totalPedido = 0;
  let totalEmbarcado = 0;
  itens.forEach((item) => {
    const pedida = item.quantidade || 0;
    const anterior = jaEmbarcado[item.produto_id] || 0;
    const selecionado = selectedItems[item.produto_id] !== false;
    const nova = selecionado ? (parseFloat(qtdEmbarque[item.produto_id]) || 0) : 0;
    totalPedido += pedida;
    totalEmbarcado += Math.min(anterior + nova, pedida);
  });
  if (totalEmbarcado <= 0) return 'Nenhum';
  if (totalEmbarcado >= totalPedido) return 'Total';
  return 'Parcial';
}

// ── TransportadoraSearch ──────────────────────────────────────────────────────

function TransportadoraSearch({ transportadoras, value, onChange, onCriarNova }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [criando, setCriando] = useState(false);
  const [nomeNova, setNomeNova] = useState('');
  const [salvando, setSalvando] = useState(false);
  const ref = useRef(null);

  const selected = transportadoras.find(t => t.id === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return transportadoras.slice(0, 10);
    const q = query.toLowerCase();
    return transportadoras.filter(t => t.nome.toLowerCase().includes(q)).slice(0, 10);
  }, [query, transportadoras]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSalvarNova = async () => {
    if (!nomeNova.trim()) return;
    setSalvando(true);
    try {
      const nova = await base44.entities.Transportadora.create({ nome: nomeNova.trim().toUpperCase(), ativo: true });
      onCriarNova(nova);
      onChange(nova.id);
      setCriando(false);
      setNomeNova('');
      setOpen(false);
      toast.success('Transportadora cadastrada!');
    } catch {
      toast.error('Erro ao cadastrar transportadora');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQuery(''); }}
        className="w-full h-12 rounded-xl bg-gray-50 dark:bg-gray-800 shadow-sm px-4 flex items-center gap-3 text-left"
      >
        <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className={`flex-1 text-sm truncate ${selected ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400'}`}>
          {selected ? selected.nome : 'Selecione ou busque...'}
        </span>
        {value && <button type="button" onClick={e => { e.stopPropagation(); onChange(''); }} className="p-1"><X className="w-3.5 h-3.5 text-gray-400" /></button>}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-0 overflow-hidden">
          {/* busca */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar transportadora..."
              className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
            />
          </div>
          {/* lista */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => { onChange(t.id); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
              >
                <Truck className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{t.nome}</span>
                {t.id === value && <Check className="w-3.5 h-3.5 text-gray-500" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Nenhuma encontrada</p>
            )}
          </div>
          {/* criar nova */}
          {!criando ? (
            <button
              type="button"
              onClick={() => { setCriando(true); setNomeNova(query); }}
              className="w-full flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-600 dark:text-gray-300"
            >
              <Plus className="w-3.5 h-3.5" /> Cadastrar nova transportadora
            </button>
          ) : (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <input
                autoFocus
                value={nomeNova}
                onChange={e => setNomeNova(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSalvarNova()}
                placeholder="Nome da transportadora..."
                className="w-full text-sm bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 outline-none text-gray-800 dark:text-gray-100"
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={handleSalvarNova} disabled={salvando || !nomeNova.trim()}
                  className="flex-1 h-9 text-xs bg-gray-900 dark:bg-white dark:text-gray-900 text-white border-0">
                  {salvando ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setCriando(false)}
                  className="h-9 text-xs border-0 bg-gray-100 dark:bg-gray-700">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function InformarEmbarque({ pedido, isOpen, onClose, onSuccess, embarqueExistente }) {
  const isEdicao = !!embarqueExistente;
  const [transportadoras, setTransportadoras] = useState([]);
  const [transportadoraId, setTransportadoraId] = useState('');
  const [dataDespacho, setDataDespacho] = useState('');
  const [eta, setEta] = useState('');
  const [volumes, setVolumes] = useState([]);
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showItens, setShowItens] = useState(true);
  const [showVolumesDialog, setShowVolumesDialog] = useState(false);
  const [qtdEmbarque, setQtdEmbarque] = useState({});
  const [selectedItems, setSelectedItems] = useState({});

  const jaEmbarcado = useMemo(() =>
    calcularJaEmbarcadoSemEmbarque(pedido, embarqueExistente?.id),
    [pedido, embarqueExistente]
  );

  useEffect(() => {
    if (!isOpen || !pedido) return;
    loadTransportadoras();
    if (isEdicao) {
      setDataDespacho(embarqueExistente.data_embarque ? new Date(embarqueExistente.data_embarque).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
        setTransportadoraId(embarqueExistente.transportadora_id || '');
        // ETA: pega só a data (YYYY-MM-DD)
      const etaVal = embarqueExistente.eta
        ? new Date(embarqueExistente.eta).toISOString().slice(0, 10)
        : '';
      setEta(etaVal);
      // Carrega volumes — verifica ambos campos (retrocompatibilidade)
      const volsCarregados = (embarqueExistente.volumes_detalhados && Array.isArray(embarqueExistente.volumes_detalhados) && embarqueExistente.volumes_detalhados.length > 0)
        ? embarqueExistente.volumes_detalhados
        : [];
      setVolumes(volsCarregados);
      setObservacoes(embarqueExistente.observacoes || '');
      const initQtd = {};
      const initSel = {};
      (pedido.itens || []).forEach((item) => {
        const embItem = (embarqueExistente.itens_embarcados || []).find(i => i.produto_id === item.produto_id);
        initQtd[item.produto_id] = embItem ? String(embItem.quantidade_embarcada) : '0';
        initSel[item.produto_id] = !!embItem;
      });
      setQtdEmbarque(initQtd);
      setSelectedItems(initSel);
    } else {
      setDataDespacho(new Date().toISOString().slice(0, 10));
      setTransportadoraId('');
      setEta('');
      setVolumes([]);
      setObservacoes('');
      const initQtd = {};
      const initSel = {};
      (pedido.itens || []).forEach((item) => {
        const pendente = Math.max(0, (item.quantidade || 0) - (jaEmbarcado[item.produto_id] || 0));
        initQtd[item.produto_id] = pendente > 0 ? String(pendente) : '0';
        initSel[item.produto_id] = pendente > 0;
      });
      setQtdEmbarque(initQtd);
      setSelectedItems(initSel);
    }
  }, [isOpen, pedido, embarqueExistente]);

  const loadTransportadoras = async () => {
    try {
      const data = await base44.entities.Transportadora.list();
      setTransportadoras((data || []).filter(t => t.ativo !== false));
    } catch {
      toast.error('Erro ao carregar transportadoras');
    }
  };

  const toggleItem = (produtoId) => {
    setSelectedItems(prev => ({ ...prev, [produtoId]: !prev[produtoId] }));
  };

  const statusPreview = useMemo(() =>
    calcularStatusEmbarque(pedido?.itens || [], jaEmbarcado, qtdEmbarque, selectedItems),
    [pedido, jaEmbarcado, qtdEmbarque, selectedItems]
  );

  const totalVolumesQtd = volumes.reduce((s, v) => s + (v.quantidade || 0), 0);
  const totalPesoKg = volumes.reduce((s, v) => s + (v.peso_total_kg || 0), 0);

  const handleSalvar = async () => {
    if (!eta) return toast.error('Informe a data de chegada prevista (ETA)');
    const algumSelecionado = Object.values(selectedItems).some(v => v);
    if (!algumSelecionado) return toast.error('Selecione ao menos um item para embarcar');

    setLoading(true);
    try {
      const transportadora = transportadoras.find(t => t.id === transportadoraId);
      const itensEmbarcados = (pedido.itens || [])
        .filter(item => selectedItems[item.produto_id])
        .map(item => ({
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          quantidade_pedida: item.quantidade,
          quantidade_embarcada: parseFloat(qtdEmbarque[item.produto_id]) || 0,
          unidade_medida: item.unidade_medida
        }))
        .filter(i => i.quantidade_embarcada > 0);

      if (itensEmbarcados.length === 0) return toast.error('Informe quantidades maiores que zero');

      // Volumes: verifica se foi preenchido e salva normalmente
       // (não precisa de conversão especial agora que a estrutura tá limpa)
       let embarcadosAtualizados;
      if (isEdicao) {
        embarcadosAtualizados = (pedido.embarques_registrados || []).map(emb =>
          emb.id === embarqueExistente.id
            ? { ...emb, data_embarque: dataDespacho ? dataDespacho + 'T12:00:00.000Z' : emb.data_embarque, eta: eta + 'T12:00:00.000Z', transportadora_id: transportadoraId, transportadora_nome: transportadora?.nome || '', volumes_detalhados: volumes, peso_kg: totalPesoKg, observacoes, itens_embarcados: itensEmbarcados }
            : emb
        );
      } else {
        const novoEmbarque = {
          id: `emb_${Date.now()}`,
          data_embarque: dataDespacho ? dataDespacho + 'T12:00:00.000Z' : new Date().toISOString(),
          eta: eta + 'T12:00:00.000Z',
          transportadora_id: transportadoraId,
          transportadora_nome: transportadora?.nome || '',
          volumes_detalhados: volumes,
          peso_kg: totalPesoKg,
          observacoes,
          itens_embarcados: itensEmbarcados
        };
        embarcadosAtualizados = [...(pedido.embarques_registrados || []), novoEmbarque];
      }

      // Recalcula status_embarque
      const todosMap = {};
      embarcadosAtualizados.forEach(emb => {
        (emb.itens_embarcados || []).forEach(item => {
          todosMap[item.produto_id] = (todosMap[item.produto_id] || 0) + (item.quantidade_embarcada || 0);
        });
      });
      const novoStatusEmbarque = calcularStatusEmbarque(pedido.itens || [], todosMap, {}, Object.fromEntries((pedido.itens || []).map(i => [i.produto_id, true])));

      await base44.entities.PedidoCompra.update(pedido.id, {
        status: 'Despachado',
        data_despacho: pedido.data_despacho || new Date().toISOString(),
        status_embarque: novoStatusEmbarque,
        embarques_registrados: embarcadosAtualizados
      });

      toast.success(isEdicao ? 'Embarque atualizado!' : novoStatusEmbarque === 'Total' ? 'Embarque total registrado!' : 'Embarque parcial registrado.');
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
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl">

          {/* Header */}
          <div className="flex items-center gap-2 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
            <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 font-quicksand flex-1">
              {isEdicao ? 'Editar Embarque' : 'Informar Embarque'}
              <span className="text-gray-400 font-normal"> — {pedido.numero}</span>
            </h2>
          </div>

          <div className="px-6 py-5 space-y-5 overflow-y-auto">

            {/* Data Despacho + ETA lado a lado */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Data Despacho
                </label>
                <Input
                  type="date"
                  value={dataDespacho}
                  onChange={e => setDataDespacho(e.target.value)}
                  className="h-12 rounded-xl border-0 bg-gray-50 dark:bg-gray-800 shadow-sm text-sm text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  ETA — Chegada <span className="text-red-400">*</span>
                </label>
                <Input
                  type="date"
                  value={eta}
                  onChange={e => setEta(e.target.value)}
                  className="h-12 rounded-xl border-0 bg-gray-50 dark:bg-gray-800 shadow-sm text-sm text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Transportadora */}
            <div className="space-y-1.5">
              <label className="text-sm text-gray-500 dark:text-gray-400">
                Transportadora <span className="text-xs text-gray-400 font-normal">(opcional)</span>
              </label>
              <TransportadoraSearch
                transportadoras={transportadoras}
                value={transportadoraId}
                onChange={setTransportadoraId}
                onCriarNova={nova => setTransportadoras(prev => [...prev, nova])}
              />
            </div>

            {/* Volumes */}
            <div className="space-y-1.5">
              <label className="text-sm text-gray-500 dark:text-gray-400">
                Volumes <span className="text-xs text-gray-400 font-normal">(opcional)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowVolumesDialog(true)}
                className="w-full h-12 rounded-xl bg-gray-50 dark:bg-gray-800 shadow-sm px-4 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Boxes className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {volumes.length > 0 ? (
                   <span className="text-sm text-gray-800 dark:text-gray-200 flex-1 text-left">
                     {totalVolumesQtd.toLocaleString('pt-BR')} vol · {totalPesoKg > 0 ? `${totalPesoKg.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg` : '—'}
                     <span className="text-xs text-gray-400 ml-2">({volumes.length} tipo{volumes.length > 1 ? 's' : ''})</span>
                   </span>
                 ) : (
                  <span className="text-sm text-gray-400 flex-1 text-left">Clicar para gerenciar volumes...</span>
                )}
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Itens */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowItens(o => !o)}
                className="flex items-center justify-between w-full py-0.5"
              >
                <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                  <Package className="w-3.5 h-3.5" />
                  Itens deste embarque
                  <span className="text-xs text-gray-400 font-normal">(desmarque para tornar órfão)</span>
                </span>
                {showItens ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {showItens && (
                <div className="grid grid-cols-2 gap-2">
                  {(pedido.itens || []).map(item => {
                    const pedida = item.quantidade || 0;
                    const anterior = jaEmbarcado[item.produto_id] || 0;
                    const pendente = Math.max(0, pedida - anterior);
                    const selecionado = selectedItems[item.produto_id] !== false;
                    const emb = parseFloat(qtdEmbarque[item.produto_id]) || 0;
                    const excede = emb > pendente;

                    return (
                      <button
                        key={item.produto_id}
                        type="button"
                        onClick={() => toggleItem(item.produto_id)}
                        className={`text-left rounded-xl px-3 py-2 transition-all ${selecionado ? 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700' : 'bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 opacity-60'}`}
                      >
                        <div className="flex items-start gap-2">
                          {/* Checkbox pequeno */}
                          <div className={`flex-shrink-0 w-4 h-4 rounded mt-0.5 flex items-center justify-center transition-colors ${selecionado ? 'bg-gray-700 dark:bg-gray-300' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            {selecionado && <Check className="w-2 h-2 text-white dark:text-gray-900" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">{item.produto_nome}</p>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 space-y-0.5">
                              <p>Ped: <span className="font-medium text-gray-700 dark:text-gray-300">{pedida}</span> {item.unidade_medida}</p>
                              {anterior > 0 && <p>Emb: <span className="font-medium text-gray-700 dark:text-gray-300">{anterior}</span></p>}
                            </div>
                          </div>
                        </div>
                        {/* Input quantidade no canto inferior */}
                        {selecionado && (
                          <div className="flex items-center gap-1 mt-1.5 ml-6">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={qtdEmbarque[item.produto_id] ?? ''}
                              onChange={e => {
                                e.stopPropagation();
                                setQtdEmbarque(prev => ({ ...prev, [item.produto_id]: e.target.value.replace(',', '.') }));
                              }}
                              onClick={e => e.stopPropagation()}
                              className={`w-14 h-8 text-xs text-right rounded-lg border-0 shadow-sm px-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${excede ? 'ring-1 ring-red-400' : ''}`}
                              placeholder="0"
                            />
                            <span className="text-[9px] text-gray-400 font-medium">{item.unidade_medida}</span>
                          </div>
                        )}
                        {excede && selecionado && <p className="text-[9px] text-red-400 mt-1 ml-6">excede!</p>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status preview */}
            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
              statusPreview === 'Total' ? 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300' :
              statusPreview === 'Parcial' ? 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300' :
              'bg-gray-100 dark:bg-gray-800 text-gray-400'
            }`}>
              {statusPreview === 'Total' && <CheckCircle2 className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              {statusPreview === 'Parcial' && <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />}
              {statusPreview === 'Nenhum' && <Package className="w-4 h-4 text-gray-300 flex-shrink-0" />}
              <span>
                {statusPreview === 'Total' && 'Embarque total — todos os itens cobertos'}
                {statusPreview === 'Parcial' && 'Embarque parcial — haverá itens órfãos aguardando despacho'}
                {statusPreview === 'Nenhum' && 'Selecione e informe as quantidades a embarcar'}
              </span>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <label className="text-sm text-gray-500 dark:text-gray-400">Observações</label>
              <Input
                placeholder="Observações sobre este embarque..."
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                className="h-12 rounded-xl border-0 bg-gray-50 dark:bg-gray-800 shadow-sm text-sm"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-5 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" onClick={onClose} disabled={loading}
              className="h-12 px-6 rounded-xl border-0 shadow-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={loading}
              className="h-12 px-8 rounded-xl border-0 shadow-sm bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 text-white min-w-[160px]">
              {loading ? 'Salvando...' : isEdicao ? 'Salvar Edição' : 'Registrar Embarque'}
            </Button>
          </div>

        </DialogContent>
      </Dialog>

      {/* Dialog de volumes (portal próprio) */}
      <VolumesDialog
        isOpen={showVolumesDialog}
        onClose={() => setShowVolumesDialog(false)}
        volumes={volumes}
        onChange={setVolumes}
      />
    </>
  );
}