import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Truck, Package, Calendar, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, X, Edit3, Loader2, Boxes, Plus, Search
} from 'lucide-react';
import { toast } from 'sonner';
import VolumesDialog from './VolumesDialog';

// ─── helpers ────────────────────────────────────────────────────────────────
function fmtNum(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return String(val ?? '');
  if (Math.abs(n) < 1000) return n % 1 === 0 ? String(n) : n.toFixed(2);
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function calcularStatusEmbarque(itens, totalEmbarcado) {
  let totPedido = 0, totEmb = 0;
  itens.forEach(item => {
    const pedida = item.quantidade || 0;
    totPedido += pedida;
    totEmb += Math.min(totalEmbarcado[item.produto_id] || 0, pedida);
  });
  if (totEmb <= 0) return 'Nenhum';
  if (totEmb >= totPedido) return 'Total';
  return 'Parcial';
}

// ─── TransportadoraSearch ────────────────────────────────────────────────────
function TransportadoraSearch({ value, onSelect, transportadoras, onCreateNew }) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [criando, setCriando] = useState(false);
  const [nomeNova, setNomeNova] = useState('');

  const selected = transportadoras.find(t => t.id === value);

  const filtered = useMemo(() => {
    if (!query) return transportadoras.slice(0, 8);
    const q = query.toLowerCase();
    return transportadoras.filter(t => t.nome.toLowerCase().includes(q)).slice(0, 8);
  }, [query, transportadoras]);

  const handleCreate = async () => {
    if (!nomeNova.trim()) return;
    try {
      const nova = await base44.entities.Transportadora.create({ nome: nomeNova.trim(), ativo: true });
      onCreateNew(nova);
      onSelect(nova.id);
      setShowDropdown(false);
      setCriando(false);
      setNomeNova('');
      setQuery('');
    } catch { toast.error('Erro ao criar transportadora'); }
  };

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 h-11 shadow-sm cursor-pointer"
        onClick={() => setShowDropdown(v => !v)}
      >
        <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className={`flex-1 text-sm truncate ${selected ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>
          {selected ? selected.nome : 'Selecionar transportadora...'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      </div>

      {showDropdown && (
        <div className="absolute z-[700] left-0 right-0 mt-1 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              autoFocus
              className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
              placeholder="Buscar..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtered.map(t => (
              <div
                key={t.id}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${t.id === value ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                onClick={() => { onSelect(t.id); setShowDropdown(false); setQuery(''); }}
              >
                {t.nome}
              </div>
            ))}
            {filtered.length === 0 && !criando && (
              <div className="px-4 py-3 text-xs text-gray-400">Nenhuma encontrada</div>
            )}
          </div>
          {!criando ? (
            <div
              className="px-4 py-2.5 text-xs text-teal-600 dark:text-teal-400 cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-900/20 flex items-center gap-1.5 border-t border-gray-100 dark:border-gray-800"
              onClick={() => setCriando(true)}
            >
              <Plus className="w-3.5 h-3.5" /> Criar nova transportadora
            </div>
          ) : (
            <div className="px-3 py-2.5 border-t border-gray-100 dark:border-gray-800 flex gap-2">
              <input
                autoFocus
                className="flex-1 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1.5 outline-none text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
                placeholder="Nome da transportadora"
                value={nomeNova}
                onChange={e => setNomeNova(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                onClick={e => e.stopPropagation()}
              />
              <button type="button" onClick={handleCreate}
                className="text-xs text-white bg-teal-600 rounded-lg px-2.5 py-1.5 hover:bg-teal-700 transition-colors">
                Criar
              </button>
              <button type="button" onClick={() => setCriando(false)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── InformarEmbarque principal ──────────────────────────────────────────────
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
  const [itensSelecionados, setItensSelecionados] = useState({});

  // quanto foi embarcado em outros embarques (excluindo o atual em edição)
  const jaEmbarcadoSemEste = useMemo(() => {
    const map = {};
    (pedido?.embarques_registrados || []).forEach(emb => {
      if (isEdicao && emb.id === embarqueExistente?.id) return;
      (emb.itens_embarcados || []).forEach(item => {
        map[item.produto_id] = (map[item.produto_id] || 0) + (item.quantidade_embarcada || 0);
      });
    });
    return map;
  }, [pedido, embarqueExistente, isEdicao]);

  useEffect(() => {
    if (!isOpen || !pedido) return;
    base44.entities.Transportadora.filter({ ativo: true }).then(setTransportadoras).catch(() => {});

    if (isEdicao && embarqueExistente) {
      setTransportadoraId(embarqueExistente.transportadora_id || '');
      setDataDespacho(embarqueExistente.data_embarque ? embarqueExistente.data_embarque.slice(0, 16) : '');
      setEta(embarqueExistente.eta ? embarqueExistente.eta.slice(0, 16) : '');
      setVolumes(embarqueExistente.volumes_lista || []);
      setObservacoes(embarqueExistente.observacoes || '');
      const selInit = {};
      const qtdInit = {};
      (pedido.itens || []).forEach(item => {
        const embItem = (embarqueExistente.itens_embarcados || []).find(i => i.produto_id === item.produto_id);
        selInit[item.produto_id] = !!embItem && embItem.quantidade_embarcada > 0;
        qtdInit[item.produto_id] = embItem ? String(embItem.quantidade_embarcada) : '0';
      });
      setItensSelecionados(selInit);
      setQtdEmbarque(qtdInit);
    } else {
      setTransportadoraId('');
      setDataDespacho('');
      setEta('');
      setVolumes([]);
      setObservacoes('');
      const selInit = {};
      const qtdInit = {};
      (pedido.itens || []).forEach(item => {
        const disponivel = Math.max(0, (item.quantidade || 0) - (jaEmbarcadoSemEste[item.produto_id] || 0));
        selInit[item.produto_id] = disponivel > 0;
        qtdInit[item.produto_id] = disponivel > 0 ? String(disponivel) : '0';
      });
      setItensSelecionados(selInit);
      setQtdEmbarque(qtdInit);
    }
  }, [isOpen, pedido?.id, embarqueExistente?.id]);

  const toggleItem = useCallback((produtoId, pedida) => {
    const novoSel = !itensSelecionados[produtoId];
    setItensSelecionados(prev => ({ ...prev, [produtoId]: novoSel }));
    if (!novoSel) {
      setQtdEmbarque(prev => ({ ...prev, [produtoId]: '0' }));
    } else {
      const disponivel = Math.max(0, pedida - (jaEmbarcadoSemEste[produtoId] || 0));
      setQtdEmbarque(prev => ({ ...prev, [produtoId]: String(disponivel) }));
    }
  }, [itensSelecionados, jaEmbarcadoSemEste]);

  const statusPreview = useMemo(() => {
    const totalFinal = {};
    (pedido?.itens || []).forEach(item => {
      totalFinal[item.produto_id] = (jaEmbarcadoSemEste[item.produto_id] || 0)
        + (itensSelecionados[item.produto_id] ? (parseFloat(qtdEmbarque[item.produto_id]) || 0) : 0);
    });
    return calcularStatusEmbarque(pedido?.itens || [], totalFinal);
  }, [pedido, jaEmbarcadoSemEste, qtdEmbarque, itensSelecionados]);

  const volumesResumo = useMemo(() => {
    if (!volumes.length) return null;
    const pesoTotal = volumes.reduce((s, v) => s + (v.peso_total_kg || 0), 0);
    const volTotal = volumes.reduce((s, v) => s + (v.quantidade || 0), 0);
    return `${fmtNum(volTotal)} volumes · ${fmtNum(pesoTotal)} kg`;
  }, [volumes]);

  const handleSalvar = async (e) => {
    e?.stopPropagation();
    const etaValida = eta && eta.length >= 10;
    if (!etaValida) { toast.error('Informe a ETA (chegada prevista)', { position: 'top-center' }); return; }
    const algumSelecionado = Object.entries(itensSelecionados).some(([pid, sel]) => sel && parseFloat(qtdEmbarque[pid]) > 0);
    if (!algumSelecionado) { toast.error('Selecione ao menos um item', { position: 'top-center' }); return; }

    setLoading(true);
    try {
      const transportadora = transportadoras.find(t => t.id === transportadoraId);
      const itensEmbarcados = (pedido.itens || [])
        .filter(item => itensSelecionados[item.produto_id] && parseFloat(qtdEmbarque[item.produto_id]) > 0)
        .map(item => ({
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          quantidade_pedida: item.quantidade,
          quantidade_embarcada: parseFloat(qtdEmbarque[item.produto_id]) || 0,
          unidade_medida: item.unidade_medida,
        }));

      const pesoTotalKg = volumes.reduce((s, v) => s + (v.peso_total_kg || 0), 0);
      const embarqueData = {
        id: isEdicao ? embarqueExistente.id : `emb_${Date.now()}`,
        data_embarque: dataDespacho ? new Date(dataDespacho).toISOString() : new Date().toISOString(),
        eta: eta.length === 10 ? new Date(eta + 'T00:00').toISOString() : new Date(eta).toISOString(),
        transportadora_id: transportadoraId || null,
        transportadora_nome: transportadora?.nome || '',
        volumes_lista: volumes,
        peso_kg: pesoTotalKg,
        observacoes,
        itens_embarcados: itensEmbarcados,
      };

      const embarcadosAtualizados = isEdicao
        ? (pedido.embarques_registrados || []).map(e => e.id === embarqueExistente.id ? embarqueData : e)
        : [...(pedido.embarques_registrados || []), embarqueData];

      const todosMap = {};
      embarcadosAtualizados.forEach(emb => {
        (emb.itens_embarcados || []).forEach(item => {
          todosMap[item.produto_id] = (todosMap[item.produto_id] || 0) + item.quantidade_embarcada;
        });
      });
      const novoStatus = calcularStatusEmbarque(pedido.itens || [], todosMap);

      await base44.entities.PedidoCompra.update(pedido.id, {
        status: 'Despachado',
        data_despacho: pedido.data_despacho || embarqueData.data_embarque,
        status_embarque: novoStatus,
        embarques_registrados: embarcadosAtualizados,
      });

      toast.success(novoStatus === 'Total' ? 'Embarque total registrado!' : 'Embarque parcial — itens órfãos pendentes.');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error('Erro: ' + (err.message || 'Erro desconhecido'));
    } finally { setLoading(false); }
  };

  if (!isOpen || !pedido) return null;

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 z-[400] bg-black/25 backdrop-blur-[2px]" onClick={onClose} />

      <div className="fixed inset-0 z-[401] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
        <div className="w-full max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            {isEdicao
              ? <Edit3 className="w-4 h-4 text-amber-500 flex-shrink-0" />
              : <Truck className="w-4 h-4 text-teal-600 flex-shrink-0" />
            }
            <span className="font-quicksand font-semibold text-sm text-gray-900 dark:text-white flex-1">
              {isEdicao ? 'Editar Embarque' : 'Informar Embarque'} — {pedido.numero}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Datas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Data Despacho
                </Label>
                <Input type="datetime-local" value={dataDespacho}
                  onChange={e => setDataDespacho(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm text-gray-900 dark:text-gray-100 h-10 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 font-semibold">
                  <Calendar className="w-3 h-3 text-teal-500" />
                  <span className="text-teal-600 dark:text-teal-400">ETA *</span>
                </Label>
                <Input type="datetime-local" value={eta}
                  onChange={e => setEta(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm text-gray-900 dark:text-gray-100 h-10 text-xs ring-1 ring-teal-200 dark:ring-teal-800" />
              </div>
            </div>

            {/* Transportadora */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400">
                Transportadora <span className="text-gray-400">(opcional)</span>
              </Label>
              <TransportadoraSearch
                value={transportadoraId}
                onSelect={setTransportadoraId}
                transportadoras={transportadoras}
                onCreateNew={nova => setTransportadoras(prev => [...prev, nova])}
              />
            </div>

            {/* Volumes */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400">
                Volumes <span className="text-gray-400">(opcional)</span>
              </Label>
              <button
                type="button"
                onClick={() => setShowVolumesDialog(true)}
                className="w-full flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 h-11 text-sm text-left shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Boxes className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className={`flex-1 truncate ${volumes.length > 0 ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>
                  {volumes.length > 0 ? volumesResumo : 'Clicar para gerenciar volumes...'}
                </span>
                {volumes.length > 0 && (
                  <span className="ml-auto text-[10px] font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    {volumes.length} tipo(s)
                  </span>
                )}
              </button>
            </div>

            {/* Itens */}
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setShowItens(!showItens)}
                className="flex items-center justify-between w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Package className="w-3 h-3" />
                  Itens deste embarque
                  <span className="text-gray-400">(desmarque para tornar órfão)</span>
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
                      <div key={item.produto_id}
                        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-opacity ${!selecionado ? 'opacity-40' : ''}`}>
                        <button
                          type="button"
                          onClick={() => toggleItem(item.produto_id, pedida)}
                          className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors ${
                            selecionado
                              ? 'bg-teal-500 border-teal-500'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500'
                          }`}
                        >
                          {selecionado && (
                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{item.produto_nome}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
                            {fmtNum(pedida)} {item.unidade_medida}
                            {outrosEmb > 0 && <span className="ml-1 text-teal-500">· -{fmtNum(outrosEmb)}</span>}
                            {disponivel < pedida && disponivel > 0 && <span className="ml-1 text-amber-500">· disp:{fmtNum(disponivel)}</span>}
                          </p>
                        </div>
                        <Input
                          type="text"
                          inputMode="decimal"
                          disabled={!selecionado}
                          value={selecionado ? (qtdEmbarque[item.produto_id] ?? '') : '—'}
                          onChange={e => setQtdEmbarque(prev => ({
                            ...prev, [item.produto_id]: e.target.value.replace(',', '.')
                          }))}
                          className={`flex-shrink-0 w-20 h-7 text-xs text-right border-0 bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100 ${excede ? 'ring-1 ring-rose-400' : ''}`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status preview */}
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium ${
              statusPreview === 'Total'
                ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
                : statusPreview === 'Parcial'
                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}>
              {statusPreview === 'Total' && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
              {statusPreview === 'Parcial' && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />}
              {statusPreview === 'Nenhum' && <Package className="w-3.5 h-3.5 flex-shrink-0" />}
              <span>
                {statusPreview === 'Total' && 'Embarque total — todos os itens cobertos'}
                {statusPreview === 'Parcial' && 'Embarque parcial — haverá itens órfãos aguardando despacho'}
                {statusPreview === 'Nenhum' && 'Selecione os itens e informe as quantidades'}
              </span>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Observações</Label>
              <Input
                placeholder="Observações sobre este embarque..."
                className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
            <Button variant="outline" onClick={onClose} disabled={loading} size="sm"
              className="border-0 shadow-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleSalvar(e); }}
              disabled={loading}
              size="sm"
              className={`${isEdicao ? 'bg-amber-500 hover:bg-amber-600' : 'bg-teal-600 hover:bg-teal-700'} text-white border-0 shadow-sm min-w-[140px]`}
            >
              {loading
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Salvando...</>
                : isEdicao ? 'Salvar Edição' : 'Registrar Embarque'
              }
            </Button>
          </div>
        </div>
      </div>

      <VolumesDialog
        isOpen={showVolumesDialog}
        onClose={() => setShowVolumesDialog(false)}
        volumes={volumes}
        onChange={setVolumes}
      />
    </>,
    document.body
  );
}