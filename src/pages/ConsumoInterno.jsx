import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Package, MapPin, UserRound, Search, Plus, MoreVertical, Trash2, Pencil, Paperclip, RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format, subDays, startOfDay, endOfDay, startOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AssinaturaConsumoDialog from '@/components/consumo-interno/AssinaturaConsumoDialog';
import ConsumoResumoDialog from '@/components/consumo-interno/ConsumoResumoDialog';
import ConsumoProdutoSelectorPDV from '@/components/consumo-interno/ConsumoProdutoSelectorPDV';
import ConsumoInternoFormPage from '@/components/consumo-interno/ConsumoInternoFormPage';
import ComprovanteConsumoInterno from '@/components/consumo-interno/ComprovanteConsumoInterno';

const formatCurrency = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function ConsumoInternoPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [turnos, setTurnos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [destinacoes, setDestinacoes] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [consumos, setConsumos] = useState([]);
  const [search, setSearch] = useState('');
  const [filtroTemporal, setFiltroTemporal] = useState('hoje');
  const [showAssinatura, setShowAssinatura] = useState(false);
  const [showResumo, setShowResumo] = useState(false);
  const [showProdutoSelector, setShowProdutoSelector] = useState(false);
  const [showComprovante, setShowComprovante] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [consumoSelecionado, setConsumoSelecionado] = useState(null);
  const [formData, setFormData] = useState({
    turno_caixa_id: '',
    destinacao: '',
    responsavel_recebimento: '',
    tags: [],
    observacoes: '',
    itens: [],
    assinatura_recolhedor_url: '',
    assinatura_recolhedor_nome: '',
  });
  const [novoCadastro, setNovoCadastro] = useState({ tipo: '', valor: '' });
  const [editandoConsumo, setEditandoConsumo] = useState(null);
  const anexoInputRef = useRef(null);
  const [consumoAnexoAlvo, setConsumoAnexoAlvo] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [user, turnosData, produtosData, destinacoesData, responsaveisData, consumosData] = await Promise.all([
      base44.auth.me(),
      base44.entities.TurnoCaixa.filter({ status: 'Aberto' }),
      base44.entities.Produto.list(),
      base44.entities.DestinacaoConsumoInterno.list(),
      base44.entities.ResponsavelConsumoInterno.list(),
      base44.entities.ConsumoInterno.list('-created_date'),
    ]);
    setCurrentUser(user);
    setTurnos(turnosData);
    setProdutos(produtosData.filter((item) => item.ativo !== false));
    // Não filtrar inativos — permitir escolher qualquer destinação/responsável
    setDestinacoes(destinacoesData);
    setResponsaveis(responsaveisData);
    setConsumos(consumosData);
    setFormData((prev) => ({ ...prev, turno_caixa_id: turnosData[0]?.id || '' }));
  };

  const rangeAtual = useMemo(() => {
    const agora = new Date();
    if (filtroTemporal === 'hoje') return { start: startOfDay(agora), end: endOfDay(agora) };
    if (filtroTemporal === '7d') return { start: startOfDay(subDays(agora, 6)), end: endOfDay(agora) };
    if (filtroTemporal === '30d') return { start: startOfDay(subDays(agora, 29)), end: endOfDay(agora) };
    if (filtroTemporal === 'mes') return { start: startOfMonth(agora), end: endOfDay(agora) };
    return { start: new Date(0), end: endOfDay(agora) };
  }, [filtroTemporal]);

  const consumosFiltrados = useMemo(() => {
    const term = search.toLowerCase();
    return consumos.filter((item) => {
      const dentroRange = isWithinInterval(new Date(item.created_date), rangeAtual);
      const matchSearch = !term ||
        item.numero?.toLowerCase().includes(term) ||
        item.destinacao?.toLowerCase().includes(term) ||
        item.responsavel_recebimento?.toLowerCase().includes(term);
      return dentroRange && matchSearch;
    });
  }, [consumos, search, rangeAtual]);

  const consumosAgrupadosPorDia = useMemo(() => {
    const groups = {};
    consumosFiltrados.forEach(item => {
      const dia = format(new Date(item.created_date), 'yyyy-MM-dd');
      if (!groups[dia]) groups[dia] = [];
      groups[dia].push(item);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [consumosFiltrados]);

  const totalAtual = useMemo(() => formData.itens.reduce((sum, item) => sum + (item.subtotal || 0), 0), [formData.itens]);

  const labelFiltro = { hoje: 'Hoje', '7d': '7 dias', '30d': '30 dias', mes: 'Este mês', tudo: 'Tudo' };

  const addItem = (novoItem) => {
    if (!novoItem?.produto_id) return;
    setFormData((prev) => ({ ...prev, itens: [...prev.itens, novoItem] }));
    setShowProdutoSelector(false);
  };

  const uploadAttachment = async (file, tipoDocumento, referenciaId, referenciaNumero) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.AnexoDocumento.create({
      referencia_tipo: 'Outro', referencia_id: referenciaId, referencia_numero: referenciaNumero,
      tipo_documento: tipoDocumento, nome_arquivo: file.name, url_drive: file_url,
      mime_type: file.type, tamanho_bytes: file.size, origem: 'upload_manual', descricao: 'Consumo interno',
    });
  };

  const handleAssinaturaConfirm = async ({ nome, file }) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData((prev) => ({ ...prev, assinatura_recolhedor_nome: nome, assinatura_recolhedor_url: file_url }));
    toast.success('Assinatura adicionada');
  };

  const handleSalvarCadastro = async () => {
    if (!novoCadastro.tipo || !novoCadastro.valor.trim()) return;
    if (novoCadastro.tipo === 'destinacao') {
      await base44.entities.DestinacaoConsumoInterno.create({ nome: novoCadastro.valor, ativo: true });
      toast.success('Destinação cadastrada');
    }
    if (novoCadastro.tipo === 'responsavel') {
      await base44.entities.ResponsavelConsumoInterno.create({ nome: novoCadastro.valor, ativo: true });
      toast.success('Responsável cadastrado');
    }
    setNovoCadastro({ tipo: '', valor: '' });
    loadData();
  };

  const handleDelete = async (consumo) => {
    if (!window.confirm(`Excluir ${consumo.numero}? Esta ação não pode ser desfeita.`)) return;
    await base44.entities.ConsumoInterno.delete(consumo.id);
    toast.success('Consumo excluído');
    loadData();
  };

  const handleAnexarDocumento = (consumo) => {
    setConsumoAnexoAlvo(consumo);
    anexoInputRef.current?.click();
  };

  const handleAnexoFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !consumoAnexoAlvo) return;
    await Promise.all(files.map(file => uploadAttachment(file, 'Comprovante', consumoAnexoAlvo.id, consumoAnexoAlvo.numero)));
    toast.success(`${files.length} arquivo(s) anexado(s)`);
    e.target.value = '';
    setConsumoAnexoAlvo(null);
  };

  const handleEditar = (consumo) => {
    setEditandoConsumo(consumo);
    setFormData({
      turno_caixa_id: consumo.turno_caixa_id || '',
      destinacao: consumo.destinacao || '',
      responsavel_recebimento: consumo.responsavel_recebimento || '',
      tags: consumo.tags || [],
      observacoes: consumo.observacoes || '',
      itens: consumo.itens || [],
      assinatura_recolhedor_url: consumo.assinatura_recolhedor_url || '',
      assinatura_recolhedor_nome: consumo.assinatura_recolhedor_nome || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.destinacao || !formData.responsavel_recebimento || !formData.itens.length) {
      toast.error('Preencha destinação, responsável e itens');
      return;
    }
    const turno = turnos.find((item) => item.id === formData.turno_caixa_id);
    const payload = {
      ...formData,
      status: 'Confirmado',
      turno_caixa_numero: turno?.numero || '',
      usuario_solicitante_id: currentUser?.id,
      usuario_solicitante_nome: currentUser?.full_name || currentUser?.email,
      quantidade_total_itens: formData.itens.reduce((sum, item) => sum + (item.quantidade || 0), 0),
      valor_total: totalAtual,
      data_confirmacao: new Date().toISOString(),
    };
    let created;
    if (editandoConsumo) {
      created = await base44.entities.ConsumoInterno.update(editandoConsumo.id, payload);
      toast.success('Consumo atualizado');
    } else {
      const response = await base44.functions.invoke('gerarNumeroSequencial', { tipo: 'CI' });
      const numero = response?.data?.numero || `CI-${Date.now()}`;
      created = await base44.entities.ConsumoInterno.create({ ...payload, numero });

      // ── Baixar estoque de cada item ───────────────────────────────────────
      await Promise.all(formData.itens.map(async (item) => {
        // 1. Registrar movimentação de saída
        await base44.entities.MovimentacaoEstoque.create({
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          tipo: 'Saída',
          motivo: 'Consumo Interno',
          quantidade: item.quantidade,
          custo_unitario: item.custo_unitario,
          referencia_tipo: 'ConsumoInterno',
          referencia_id: created.id,
          referencia_numero: numero,
          observacoes: `Consumo interno: ${formData.destinacao} — ${formData.responsavel_recebimento}`,
          usuario_responsavel: currentUser?.full_name || currentUser?.email,
        });
        // 2. Atualizar estoque_atual do produto
        const produtoAtual = produtos.find((p) => p.id === item.produto_id);
        if (produtoAtual) {
          const novoEstoque = (produtoAtual.estoque_atual || 0) - item.quantidade;
          await base44.entities.Produto.update(item.produto_id, { estoque_atual: novoEstoque });
        }
      }));

      const fileInput = document.getElementById('consumo-anexo-input');
      const files = Array.from(fileInput?.files || []);
      await Promise.all(files.map((file) => uploadAttachment(file, 'Comprovante', created.id, numero)));
      if (formData.assinatura_recolhedor_url) {
        await base44.entities.AnexoDocumento.create({
          referencia_tipo: 'Outro', referencia_id: created.id, referencia_numero: numero,
          tipo_documento: 'Contrato', nome_arquivo: `assinatura-${numero}.png`,
          url_drive: formData.assinatura_recolhedor_url, mime_type: 'image/png',
          origem: 'upload_manual', descricao: `Assinatura do recolhedor: ${formData.assinatura_recolhedor_nome}`,
        });
      }
      if (fileInput) fileInput.value = '';
      toast.success('Consumo interno registrado');
      setShowComprovante(true);
    }
    setConsumoSelecionado(created);
    setEditandoConsumo(null);
    setShowForm(false);
    setFormData({ turno_caixa_id: turnos[0]?.id || '', destinacao: '', responsavel_recebimento: '', tags: [], observacoes: '', itens: [], assinatura_recolhedor_url: '', assinatura_recolhedor_nome: '' });
    loadData();
  };

  if (showForm) {
    return (
      <>
        <ConsumoInternoFormPage
          onBack={() => { setShowForm(false); setEditandoConsumo(null); setFormData({ turno_caixa_id: turnos[0]?.id || '', destinacao: '', responsavel_recebimento: '', tags: [], observacoes: '', itens: [], assinatura_recolhedor_url: '', assinatura_recolhedor_nome: '' }); }}
          formData={formData}
          setFormData={setFormData}
          turnos={turnos}
          destinacoes={destinacoes}
          responsaveis={responsaveis}
          setNovoCadastro={setNovoCadastro}
          totalAtual={totalAtual}
          onOpenSelector={() => setShowProdutoSelector(true)}
          currentUser={currentUser}
          onOpenAssinatura={() => setShowAssinatura(true)}
          onSubmit={handleSubmit}
        />
        <Dialog open={!!novoCadastro.tipo} onOpenChange={() => setNovoCadastro({ tipo: '', valor: '' })}>
          <DialogContent className="max-w-sm rounded-[28px] border-0 bg-white p-5 shadow-2xl dark:bg-gray-900">
            <div className="space-y-4">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Novo cadastro interno</p>
              <Input value={novoCadastro.valor} onChange={(e) => setNovoCadastro((prev) => ({ ...prev, valor: e.target.value }))} placeholder={novoCadastro.tipo === 'destinacao' ? 'Nome da destinação' : 'Nome do responsável'} className="h-11 rounded-2xl border-0 bg-gray-100 shadow-sm dark:bg-gray-800" />
              <Button onClick={handleSalvarCadastro} className="h-11 w-full rounded-2xl bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
        <AssinaturaConsumoDialog open={showAssinatura} onOpenChange={setShowAssinatura} onConfirm={handleAssinaturaConfirm} />
        <ConsumoProdutoSelectorPDV open={showProdutoSelector} onOpenChange={setShowProdutoSelector} produtos={produtos} onAddItem={addItem} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-900 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5 pb-24">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">Consumo Interno</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Movimentações internas.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="p-3 rounded-[24px] bg-white shadow-sm dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" style={{ minWidth: '48px', minHeight: '48px' }}>
              <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
            <div className="rounded-[24px] bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total — {labelFiltro[filtroTemporal]}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(consumosFiltrados.reduce((sum, item) => sum + (item.valor_total || 0), 0))}</p>
            </div>
          </div>
        </div>

        {/* Filtros temporais */}
        <div className="flex gap-2 flex-wrap">
          {Object.entries(labelFiltro).map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setFiltroTemporal(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filtroTemporal === key
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300 shadow-sm'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-[30px] bg-white p-5 shadow-sm dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">Histórico</p>
            <div className="relative w-full max-w-[220px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar" className="h-10 rounded-2xl border-0 bg-gray-100 pl-9 shadow-sm dark:bg-gray-900" />
            </div>
          </div>
          <div className="space-y-4">
            {consumosAgrupadosPorDia.length === 0 && (
              <div className="rounded-[24px] bg-gray-50 px-4 py-10 text-center text-sm text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400">
                Nenhuma movimentação encontrada.
              </div>
            )}
            {consumosAgrupadosPorDia.map(([dia, itens]) => (
              <div key={dia}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    {format(new Date(dia + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {formatCurrency(itens.reduce((s, i) => s + (i.valor_total || 0), 0))}
                  </p>
                </div>
                <div className="space-y-2">
                  {itens.map((item) => (
                    <div key={item.id} className="flex w-full items-center justify-between rounded-[24px] bg-gray-50 px-4 py-3 shadow-sm dark:bg-gray-900">
                      <button type="button" className="flex-1 text-left" onClick={() => { setConsumoSelecionado(item); setShowResumo(true); }}>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.numero}</p>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{item.destinacao}</span>
                          <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{item.responsavel_recebimento}</span>
                          <span className="inline-flex items-center gap-1"><Package className="h-3.5 w-3.5" />{item.quantidade_total_itens} item(ns)</span>
                        </div>
                      </button>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(item.valor_total)}</p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" onClick={e => e.stopPropagation()} className="p-1.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                              <MoreVertical className="h-4 w-4 text-gray-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 dark:bg-gray-800 dark:border-gray-700">
                            <DropdownMenuItem onClick={() => handleEditar(item)} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer gap-2">
                              <Pencil className="h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAnexarDocumento(item)} className="dark:hover:bg-gray-700 dark:text-gray-200 cursor-pointer gap-2">
                              <Paperclip className="h-4 w-4" /> Anexar doc / foto
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(item)} className="text-red-600 dark:text-red-400 dark:hover:bg-gray-700 cursor-pointer gap-2">
                              <Trash2 className="h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-4 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-gray-900 text-white shadow-2xl transition-transform hover:scale-105 dark:bg-white dark:text-gray-900 md:bottom-6 md:right-6"
        aria-label="Novo consumo interno"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Input oculto para anexos diretos da lista */}
      <input ref={anexoInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleAnexoFileChange} />

      <ConsumoResumoDialog open={showResumo} onOpenChange={setShowResumo} consumo={consumoSelecionado} />
      <ComprovanteConsumoInterno open={showComprovante} onClose={() => setShowComprovante(false)} consumo={consumoSelecionado} />
    </div>
  );
}