import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Package, Calendar, AlertTriangle, CheckCircle2, ChevronDown, Boxes, Plus, Check, X, Search, Anchor, Route, ClipboardList, ShipWheel } from 'lucide-react';
import { toast } from 'sonner';
import VolumesDialog from '@/components/compras/VolumesDialog';
import FluvialTripSelectorFullscreen from '@/components/compras/FluvialTripSelectorFullscreen';
import { agora, dataHoje, meioDiaSistemaISO, toLocalDateKey } from '@/components/utils/dateUtils';

// ── helpers ───────────────────────────────────────────────────────────────────

function calcularJaEmbarcadoSemEmbarque(pedido, embarqueExistenteId) {
  const map = {};
  const embarques = Array.isArray(pedido?._embarques) ? pedido._embarques : (pedido?.embarques_registrados || []);
  embarques.forEach((emb) => {
    if (embarqueExistenteId && emb.id === embarqueExistenteId) return;
    (emb.itens || emb.itens_embarcados || []).forEach((item) => {
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

function calcularPercentualValorEmbarcado(pedido, embarquesAtualizados) {
  const custoPorProduto = Object.fromEntries((pedido.itens || []).map((item) => [item.produto_id, Number(item.custo_unitario) || 0]));
  const valorTotalPedido = Number(pedido.valor_total) || (pedido.itens || []).reduce((acc, item) => acc + ((Number(item.quantidade) || 0) * (Number(item.custo_unitario) || 0)), 0);
  if (!valorTotalPedido) return 0;

  const qtdPorProduto = {};
  (embarquesAtualizados || []).forEach((emb) => {
    if (emb.status === 'Pendente') return;
    (emb.itens_embarcados || []).forEach((item) => {
      qtdPorProduto[item.produto_id] = (qtdPorProduto[item.produto_id] || 0) + (Number(item.quantidade_embarcada) || 0);
    });
  });

  const valorEmbarcado = (pedido.itens || []).reduce((acc, item) => {
    const qtd = Math.min(Number(item.quantidade) || 0, qtdPorProduto[item.produto_id] || 0);
    return acc + (qtd * (custoPorProduto[item.produto_id] || 0));
  }, 0);

  return Math.min(100, Number(((valorEmbarcado / valorTotalPedido) * 100).toFixed(2)));
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
            <input autoComplete="off"
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
              <input autoComplete="off"
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
  const [eventosLogisticos, setEventosLogisticos] = useState([]);
  const [eventoLogisticoId, setEventoLogisticoId] = useState('');
  const [transportadoraId, setTransportadoraId] = useState('');
  const [dataDespacho, setDataDespacho] = useState('');
  const [eta, setEta] = useState('');
  const [volumes, setVolumes] = useState([]);
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('transporte');
  const [showVolumesDialog, setShowVolumesDialog] = useState(false);
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [qtdEmbarque, setQtdEmbarque] = useState({});
  const [selectedItems, setSelectedItems] = useState({});

  const eventoSelecionado = useMemo(
    () => eventosLogisticos.find((evento) => evento.id === eventoLogisticoId) || null,
    [eventosLogisticos, eventoLogisticoId]
  );

  const jaEmbarcado = useMemo(() =>
    calcularJaEmbarcadoSemEmbarque(pedido, embarqueExistente?.id),
    [pedido, embarqueExistente]
  );

  useEffect(() => {
    if (!isOpen || !pedido) return;
    loadTransportadoras();
    loadEventosLogisticos();
    setActiveTab('transporte');
    if (isEdicao) {
      setDataDespacho(embarqueExistente.data_embarque ? toLocalDateKey(new Date(embarqueExistente.data_embarque)) : dataHoje());
      setTransportadoraId(embarqueExistente.transportadora_id || '');
      setEventoLogisticoId(embarqueExistente.evento_logistico_id || '');
      const etaVal = embarqueExistente.eta
        ? toLocalDateKey(new Date(embarqueExistente.eta))
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
      setDataDespacho(dataHoje());
      setTransportadoraId('');
      setEventoLogisticoId('');
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

  const loadEventosLogisticos = async () => {
    try {
      const data = await base44.entities.EventoLogisticoSandbox.list('-data_referencia', 100);
      setEventosLogisticos(data || []);
    } catch {
      toast.error('Erro ao carregar eventos logísticos');
    }
  };

  useEffect(() => {
    if (!eventoSelecionado) return;

    setTransportadoraId(eventoSelecionado.transportadora_id || '');

    const dataSaida = eventoSelecionado.data_saida_origem || eventoSelecionado.data_referencia;
    if (dataSaida) {
      setDataDespacho(String(dataSaida).slice(0, 10));
    }

    const dataEta = eventoSelecionado.previsao_chegada || eventoSelecionado.data_chegada_destino;
    if (dataEta) {
      setEta(String(dataEta).slice(0, 10));
    }
  }, [eventoSelecionado]);

  const handleSelectTrip = (evento) => {
    setEventoLogisticoId(evento?.id || '');
    setTransportadoraId(evento?.transportadora_id || '');
    const dataSaida = evento?.data_saida_origem || evento?.data_referencia;
    const dataEta = evento?.previsao_chegada || evento?.data_chegada_destino;
    if (dataSaida) setDataDespacho(String(dataSaida).slice(0, 10));
    if (dataEta) setEta(String(dataEta).slice(0, 10));
    setShowTripSelector(false);
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

    setLoading(true);
    try {
      const transportadora = transportadoras.find(t => t.id === transportadoraId);
      const embarquesExistentes = Array.isArray(pedido._embarques) ? pedido._embarques : (pedido.embarques_registrados || []);
      const letraExibicao = String.fromCharCode(65 + embarquesExistentes.length);
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
      const itensJaLancados = (embarqueExistente?.itens_embarcados || embarqueExistente?.itens || []).filter(
        (item) => (Number(item?.quantidade_embarcada) || 0) > 0
      );
      const podeSalvarSoTransporte = isEdicao && itensEmbarcados.length === 0 && itensJaLancados.length > 0;

      if (!podeSalvarSoTransporte && itensEmbarcados.length === 0) {
        return toast.error('Informe quantidades maiores que zero');
      }

      // Volumes: texto descritivo resumido para campo legado
      // Volumes: salvar no campo volumes_detalhados (estruturado) + volumes (legado texto)
      const volumesTexto = volumes.length > 0
        ? volumes.map(v => `${v.quantidade}x ${v.descricao || 'sem descrição'}`).join(', ')
        : '';
      const volumesDetalhados = volumes.length > 0 ? volumes : [];

      const payloadEmbarque = {
        data_embarque: dataDespacho ? meioDiaSistemaISO(dataDespacho) : (embarqueExistente?.data_embarque || agora()),
        eta: meioDiaSistemaISO(eta),
        transportadora_id: transportadoraId,
        transportadora_nome: transportadora?.nome || '',
        evento_logistico_id: eventoLogisticoId || '',
        volumes: volumesTexto,
        volumes_detalhados: volumesDetalhados,
        peso_kg: totalPesoKg,
        observacoes,
        itens: podeSalvarSoTransporte ? (embarqueExistente?.itens || embarqueExistente?.itens_embarcados || []) : itensEmbarcados,
        itens_embarcados: podeSalvarSoTransporte ? (embarqueExistente?.itens_embarcados || embarqueExistente?.itens || []) : itensEmbarcados,
        status: 'Pendente'
      };

      if (isEdicao) {
        await base44.entities.Embarque.update(embarqueExistente.id, payloadEmbarque);
      } else {
        await base44.entities.Embarque.create({
          pedido_compra_id: pedido.id,
          pedido_compra_numero: pedido.numero,
          fornecedor_id: pedido.fornecedor_id,
          fornecedor_nome: pedido.fornecedor_nome,
          numero: String(embarquesExistentes.length + 1).padStart(2, '0'),
          codigo_exibicao: `${pedido.numero}-${letraExibicao}`,
          tipo: 'Embarque',
          status_recebimento: 'Pendente',
          ...payloadEmbarque
        });
      }

      await base44.functions.invoke('recalcularConclusaoPedidoCompra', { pedidoId: pedido.id });

      toast.success(isEdicao ? 'Despacho atualizado com sucesso!' : 'Despacho efetuado com sucesso!');
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
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl bg-[#111827] border-0 text-white">

        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-white/5">
          <div className="w-10 h-10 rounded-3xl bg-[#1f2937] flex items-center justify-center shadow-sm">
            <Truck className="w-4 h-4 text-slate-200 flex-shrink-0" />
          </div>
          <h2 className="text-base font-semibold text-white font-quicksand flex-1">
            {isEdicao ? 'Editar Despacho' : 'Informar Despacho'}
            <span className="text-slate-400 font-normal"> — {pedido.numero}</span>
          </h2>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-2 gap-1 h-auto rounded-2xl bg-[#1f2937] p-1 w-full">
              <TabsTrigger value="transporte" className="rounded-2xl py-2.5 text-sm flex items-center gap-2"><Route className="w-4 h-4" />Transporte</TabsTrigger>
              <TabsTrigger value="itens" className="rounded-2xl py-2.5 text-sm flex items-center gap-2"><ClipboardList className="w-4 h-4" />Itens relacionados</TabsTrigger>
            </TabsList>

              <TabsContent value="transporte" className="space-y-5 mt-0">
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
                      disabled={!!eventoLogisticoId}
                      className="h-12 rounded-xl border-0 bg-[#1f2937] shadow-sm text-sm text-white disabled:opacity-70"
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
                      disabled={!!eventoLogisticoId}
                      className="h-12 rounded-xl border-0 bg-[#1f2937] shadow-sm text-sm text-white disabled:opacity-70"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm text-gray-500 dark:text-gray-400">
                    Transportadora <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <div className={eventoLogisticoId ? 'pointer-events-none opacity-70' : ''}>
                    <TransportadoraSearch
                      transportadoras={transportadoras}
                      value={transportadoraId}
                      onChange={setTransportadoraId}
                      onCriarNova={nova => setTransportadoras(prev => [...prev, nova])}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm text-gray-500 dark:text-gray-400">
                    Viagem vinculada <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTripSelector(true)}
                    className="w-full h-12 rounded-xl border-0 bg-[#1f2937] shadow-sm text-sm text-white px-4 flex items-center gap-3 text-left"
                  >
                    <ShipWheel className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className={`flex-1 truncate ${eventoSelecionado ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      {eventoSelecionado ? `${eventoSelecionado.codigo || 'Sem código'} · ${eventoSelecionado.nome || eventoSelecionado.embarcacao_nome || 'Viagem'}` : 'Selecionar viagem no itinerário'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {eventoSelecionado ? (
                    <div className="flex items-center justify-between gap-3 px-1">
                      <p className="text-xs text-gray-400">
                        Transportadora e datas serão sobrescritas automaticamente pela viagem.
                      </p>
                      <button type="button" onClick={() => setEventoLogisticoId('')} className="text-xs text-gray-500 dark:text-gray-400">
                        Limpar
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm text-gray-500 dark:text-gray-400">
                    Volumes <span className="text-xs text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowVolumesDialog(true)}
                    className="w-full h-12 rounded-xl bg-[#1f2937] shadow-sm px-4 flex items-center gap-3 hover:bg-[#253042] transition-colors"
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

                <div className="space-y-1.5">
                  <label className="text-sm text-gray-500 dark:text-gray-400">Observações</label>
                  <Input
                    placeholder="Observações sobre este embarque..."
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                    className="h-12 rounded-xl border-0 bg-[#1f2937] shadow-sm text-sm text-white placeholder:text-slate-400"
                  />
                </div>
              </TabsContent>

              <TabsContent value="itens" className="space-y-4 mt-0">
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

                <div className="space-y-2">
                  {(pedido.itens || []).map(item => {
                    const pedida = item.quantidade || 0;
                    const anterior = jaEmbarcado[item.produto_id] || 0;
                    const pendente = Math.max(0, pedida - anterior);
                    const selecionado = selectedItems[item.produto_id] !== false;
                    const emb = parseFloat(qtdEmbarque[item.produto_id]) || 0;
                    const excede = emb > pendente;

                    return (
                      <div
                        key={item.produto_id}
                        className={`flex flex-col gap-2.5 rounded-xl px-4 py-3 transition-colors ${selecionado ? 'bg-gray-50 dark:bg-gray-800' : 'bg-gray-50/40 dark:bg-gray-900/40 opacity-60'}`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => toggleItem(item.produto_id)}
                            className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-colors mt-0.5 ${selecionado ? 'bg-gray-700 dark:bg-gray-300' : 'bg-gray-200 dark:bg-gray-600'}`}
                          >
                            {selecionado && <Check className="w-3 h-3 text-white dark:text-gray-900" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight">{item.produto_nome}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pl-8">
                          <p className="text-xs text-gray-400 dark:text-gray-500 flex-1">
                            Ped: <span className="font-medium">{pedida}</span> {item.unidade_medida}
                            {anterior > 0 && <span className="ml-1.5">· já emb: {anterior}</span>}
                            {excede && selecionado && <span className="ml-1.5 text-red-400">· excede!</span>}
                          </p>
                          <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
                            <Input
                              type="text"
                              inputMode="decimal"
                              disabled={!selecionado}
                              value={qtdEmbarque[item.produto_id] ?? ''}
                              onChange={e => setQtdEmbarque(prev => ({ ...prev, [item.produto_id]: e.target.value.replace(',', '.') }))}
                              className={`w-14 h-8 text-xs text-right rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-40 placeholder:text-gray-300 px-2 border-0 shadow-sm ${excede && selecionado ? 'ring-1 ring-red-400' : ''}`}
                              placeholder="0"
                            />
                            <span className="text-[9px] text-gray-400 uppercase">{item.unidade_medida}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-5 border-t border-gray-100 dark:border-gray-800">
            <Button variant="outline" onClick={onClose} disabled={loading}
              className="h-12 px-6 rounded-xl border-0 shadow-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={loading}
              className="h-12 px-8 rounded-xl border-0 shadow-sm bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 text-white min-w-[160px]">
              {loading ? 'Salvando...' : isEdicao ? 'Salvar Despacho' : 'Registrar Despacho'}
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

      <FluvialTripSelectorFullscreen
        open={showTripSelector}
        onClose={() => setShowTripSelector(false)}
        onSelect={handleSelectTrip}
      />
    </>
  );
}