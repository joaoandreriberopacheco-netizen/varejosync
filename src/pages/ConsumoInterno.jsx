import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Package, Paperclip, Signature, MapPin, UserRound, Search, Clock3 } from 'lucide-react';
import AssinaturaConsumoDialog from '@/components/consumo-interno/AssinaturaConsumoDialog';
import ConsumoResumoDialog from '@/components/consumo-interno/ConsumoResumoDialog';
import ConsumoProdutoSelectorPDV from '@/components/consumo-interno/ConsumoProdutoSelectorPDV';

const formatCurrency = (value) => `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function ConsumoInternoPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [turnos, setTurnos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [destinacoes, setDestinacoes] = useState([]);
  const [responsaveis, setResponsaveis] = useState([]);
  const [consumos, setConsumos] = useState([]);
  const [search, setSearch] = useState('');
  const [showAssinatura, setShowAssinatura] = useState(false);
  const [showResumo, setShowResumo] = useState(false);
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
  const [itemDraft, setItemDraft] = useState({ produto_id: '', quantidade: 1 });
  const [novoCadastro, setNovoCadastro] = useState({ tipo: '', valor: '' });
  const [showProdutoSelector, setShowProdutoSelector] = useState(false);
  const [mobileStep, setMobileStep] = useState('destinacao');
  const destinacaoRef = useRef(null);
  const responsavelRef = useRef(null);
  const observacoesRef = useRef(null);
  const tagsRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

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
    setDestinacoes(destinacoesData.filter((item) => item.ativo !== false));
    setResponsaveis(responsaveisData.filter((item) => item.ativo !== false));
    setConsumos(consumosData);
    setFormData((prev) => ({ ...prev, turno_caixa_id: turnosData[0]?.id || '' }));
  };

  const consumosFiltrados = useMemo(() => {
    const term = search.toLowerCase();
    return consumos.filter((item) =>
      !term ||
      item.numero?.toLowerCase().includes(term) ||
      item.destinacao?.toLowerCase().includes(term) ||
      item.responsavel_recebimento?.toLowerCase().includes(term)
    );
  }, [consumos, search]);

  const totalAtual = useMemo(() => formData.itens.reduce((sum, item) => sum + (item.subtotal || 0), 0), [formData.itens]);

  const addItem = (novoItem) => {
    if (!novoItem?.produto_id) return;
    setFormData((prev) => ({
      ...prev,
      itens: [...prev.itens, novoItem],
    }));
    setItemDraft({ produto_id: '', quantidade: 1 });
  };

  const uploadAttachment = async (file, tipoDocumento, referenciaId, referenciaNumero) => {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.AnexoDocumento.create({
      referencia_tipo: 'Outro',
      referencia_id: referenciaId,
      referencia_numero: referenciaNumero,
      tipo_documento: tipoDocumento,
      nome_arquivo: file.name,
      url_drive: file_url,
      mime_type: file.type,
      tamanho_bytes: file.size,
      origem: 'upload_manual',
      descricao: 'Consumo interno',
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

  useEffect(() => {
    if (mobileStep === 'destinacao') {
      setTimeout(() => destinacaoRef.current?.focus?.(), 150);
    }
    if (mobileStep === 'intervenientes') {
      setTimeout(() => responsavelRef.current?.focus?.(), 150);
    }
    if (mobileStep === 'minuta') {
      setTimeout(() => observacoesRef.current?.focus?.(), 150);
    }
  }, [mobileStep]);

  const handleSubmit = async () => {
    if (!formData.destinacao || !formData.responsavel_recebimento || !formData.itens.length) {
      toast.error('Preencha destinação, responsável e itens');
      return;
    }
    const turno = turnos.find((item) => item.id === formData.turno_caixa_id);
    const response = await base44.functions.invoke('gerarNumeroSequencial', { tipo: 'CI' });
    const numero = response?.data?.numero || `CI-${Date.now()}`;
    const created = await base44.entities.ConsumoInterno.create({
      ...formData,
      numero,
      status: 'Confirmado',
      turno_caixa_numero: turno?.numero || '',
      usuario_solicitante_id: currentUser?.id,
      usuario_solicitante_nome: currentUser?.full_name || currentUser?.email,
      quantidade_total_itens: formData.itens.reduce((sum, item) => sum + (item.quantidade || 0), 0),
      valor_total: totalAtual,
      data_confirmacao: new Date().toISOString(),
    });

    const fileInput = document.getElementById('consumo-anexo-input');
    const files = Array.from(fileInput?.files || []);
    await Promise.all(files.map((file) => uploadAttachment(file, 'Comprovante', created.id, numero)));
    if (formData.assinatura_recolhedor_url) {
      await base44.entities.AnexoDocumento.create({
        referencia_tipo: 'Outro',
        referencia_id: created.id,
        referencia_numero: numero,
        tipo_documento: 'Contrato',
        nome_arquivo: `assinatura-${numero}.png`,
        url_drive: formData.assinatura_recolhedor_url,
        mime_type: 'image/png',
        origem: 'upload_manual',
        descricao: `Assinatura do recolhedor: ${formData.assinatura_recolhedor_nome}`,
      });
    }

    toast.success('Consumo interno registrado');
    setFormData({ turno_caixa_id: turnos[0]?.id || '', destinacao: '', responsavel_recebimento: '', tags: [], observacoes: '', itens: [], assinatura_recolhedor_url: '', assinatura_recolhedor_nome: '' });
    if (fileInput) fileInput.value = '';
    loadData();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-900 md:p-6">
      <div className="mb-4 grid grid-cols-3 gap-2 md:hidden">
        <button onClick={() => setMobileStep('destinacao')} className={`rounded-2xl px-2 py-2 text-[11px] font-semibold shadow-sm ${mobileStep === 'destinacao' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>Destinação</button>
        <button onClick={() => setMobileStep('intervenientes')} className={`rounded-2xl px-2 py-2 text-[11px] font-semibold shadow-sm ${mobileStep === 'intervenientes' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>Itens</button>
        <button onClick={() => setMobileStep('minuta')} className={`rounded-2xl px-2 py-2 text-[11px] font-semibold shadow-sm ${mobileStep === 'minuta' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>Minuta</button>
      </div>
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">Consumo Interno</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Saída rastreada de material com destinação, assinatura e vínculo ao caixa ativo.</p>
          </div>
          <div className="rounded-[24px] bg-white px-4 py-3 shadow-sm dark:bg-gray-800">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total em aberto hoje</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatCurrency(consumosFiltrados.reduce((sum, item) => sum + (item.valor_total || 0), 0))}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className={`rounded-[30px] bg-white p-5 shadow-sm dark:bg-gray-800 ${mobileStep !== 'destinacao' ? 'hidden md:block' : ''}`}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Caixa ativo do dia">
                  <Select value={formData.turno_caixa_id} onValueChange={(value) => setFormData((prev) => ({ ...prev, turno_caixa_id: value }))}>
                    <SelectTrigger className="h-11 rounded-2xl border-0 bg-gray-100 shadow-sm dark:bg-gray-900">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {turnos.map((turno) => <SelectItem key={turno.id} value={turno.id}>{turno.conta_caixa_pdv_nome} · {turno.numero}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Destinação">
                  <div className="flex gap-2">
                    <Select value={formData.destinacao} onValueChange={(value) => setFormData((prev) => ({ ...prev, destinacao: value }))}>
                      <SelectTrigger ref={destinacaoRef} className="h-11 rounded-2xl border-0 bg-gray-100 shadow-sm dark:bg-gray-900">
                        <SelectValue placeholder="Escolha a destinação" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinacoes.map((item) => <SelectItem key={item.id} value={item.nome}>{item.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" className="h-11 rounded-2xl border-0 shadow-sm" onClick={() => setNovoCadastro({ tipo: 'destinacao', valor: '' })}><Plus className="h-4 w-4" /></Button>
                  </div>
                </Field>

                <Field label="Quem recebeu">
                  <div className="flex gap-2">
                    <Select value={formData.responsavel_recebimento} onValueChange={(value) => setFormData((prev) => ({ ...prev, responsavel_recebimento: value }))}>
                      <SelectTrigger ref={responsavelRef} className="h-11 rounded-2xl border-0 bg-gray-100 shadow-sm dark:bg-gray-900">
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {responsaveis.map((item) => <SelectItem key={item.id} value={item.nome}>{item.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" className="h-11 rounded-2xl border-0 shadow-sm" onClick={() => setNovoCadastro({ tipo: 'responsavel', valor: '' })}><Plus className="h-4 w-4" /></Button>
                  </div>
                </Field>

                <Field label="Tags">
                  <Input ref={tagsRef} type="text" inputMode="text" className="h-11 rounded-2xl border-0 bg-gray-100 shadow-sm dark:bg-gray-900" placeholder="Ex: obra, manutenção" onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setMobileStep('intervenientes'); } }} />
                </Field>
              </div>

              <div className="mt-4">
                <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Observações</Label>
                <Textarea ref={observacoesRef} className="min-h-[100px] rounded-[24px] border-0 bg-gray-100 shadow-sm dark:bg-gray-900" value={formData.observacoes} onChange={(e) => setFormData((prev) => ({ ...prev, observacoes: e.target.value }))} />
              </div>

              <div className="mt-4 md:hidden">
                <Button type="button" onClick={() => setMobileStep('intervenientes')} className="h-11 w-full rounded-2xl bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900">
                  Próximo
                </Button>
              </div>
            </div>

            <div className={`rounded-[30px] bg-white p-5 shadow-sm dark:bg-gray-800 ${mobileStep !== 'intervenientes' ? 'hidden md:block' : ''}`}>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Itens consumidos</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(totalAtual)}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px]">
                <Button type="button" variant="outline" onClick={() => setShowProdutoSelector(true)} className="h-12 justify-start rounded-2xl border-0 bg-gray-100 text-gray-700 shadow-sm hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
                  <Search className="mr-2 h-4 w-4" />Escolher material estilo PDV
                </Button>
                <div className="flex h-12 items-center justify-center rounded-2xl bg-gray-100 px-4 text-sm font-medium text-gray-600 shadow-sm dark:bg-gray-900 dark:text-gray-300">
                  Custo pelo calculado
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {formData.itens.map((item, index) => (
                  <div key={`${item.produto_id}-${index}`} className="flex items-center justify-between rounded-[24px] bg-gray-50 px-4 py-3 shadow-sm dark:bg-gray-900">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.produto_nome}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.quantidade} {item.unidade_medida} · custo calc. {formatCurrency(item.custo_unitario)}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(item.subtotal)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 md:hidden">
                <Button type="button" onClick={() => setMobileStep('minuta')} className="h-11 w-full rounded-2xl bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900">
                  Próximo
                </Button>
              </div>
            </div>
          </div>

          <div className={`space-y-5 ${mobileStep !== 'minuta' ? 'hidden md:block' : ''}`}>
            <div className="rounded-[30px] bg-white p-5 shadow-sm dark:bg-gray-800">
              <p className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Minuta e anexos</p>
              <div className="space-y-3">
                <Button type="button" variant="outline" className="h-11 w-full rounded-2xl border-0 justify-start shadow-sm" onClick={() => setShowAssinatura(true)}>
                  <Signature className="mr-2 h-4 w-4" />{formData.assinatura_recolhedor_nome ? `Assinado por ${formData.assinatura_recolhedor_nome}` : 'Coletar assinatura do recolhedor'}
                </Button>
                <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-[24px] bg-gray-100 text-sm text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400">
                  <Paperclip className="mb-2 h-5 w-5" />Adicionar anexos
                  <input id="consumo-anexo-input" type="file" multiple className="hidden" />
                </label>
              </div>

              <div className="mt-5 rounded-[24px] bg-gray-50 p-4 shadow-sm dark:bg-gray-900">
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <Clock3 className="h-3.5 w-3.5" />Resumo da minuta
                </div>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <p><strong>Destinação:</strong> {formData.destinacao || '—'}</p>
                  <p><strong>Recebeu:</strong> {formData.responsavel_recebimento || '—'}</p>
                  <p><strong>Registrado por:</strong> {currentUser?.full_name || currentUser?.email || '—'}</p>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <Button type="button" variant="outline" onClick={() => setMobileStep('intervenientes')} className="h-12 flex-1 rounded-2xl border-0 shadow-sm md:hidden">
                  Voltar
                </Button>
                <Button type="button" onClick={handleSubmit} className="h-12 flex-1 rounded-2xl bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900">
                  Confirmar consumo interno
                </Button>
              </div>
            </div>

            <div className="rounded-[30px] bg-white p-5 shadow-sm dark:bg-gray-800">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Histórico</p>
                <div className="relative w-full max-w-[220px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar" className="h-10 rounded-2xl border-0 bg-gray-100 pl-9 shadow-sm dark:bg-gray-900" />
                </div>
              </div>

              <div className="space-y-2">
                {consumosFiltrados.map((item) => (
                  <button key={item.id} onClick={() => { setConsumoSelecionado(item); setShowResumo(true); }} className="flex w-full items-center justify-between rounded-[24px] bg-gray-50 px-4 py-3 text-left shadow-sm dark:bg-gray-900">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.numero}</p>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{item.destinacao}</span>
                        <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{item.responsavel_recebimento}</span>
                        <span className="inline-flex items-center gap-1"><Package className="h-3.5 w-3.5" />{item.quantidade_total_itens} item(ns)</span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(item.valor_total)}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

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
      <ConsumoResumoDialog open={showResumo} onOpenChange={setShowResumo} consumo={consumoSelecionado} />
      <ConsumoProdutoSelectorPDV open={showProdutoSelector} onOpenChange={setShowProdutoSelector} produtos={produtos} onAddItem={(item) => { addItem(item); setMobileStep('intervenientes'); setShowProdutoSelector(true); }} />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</Label>
      {children}
    </div>
  );
}