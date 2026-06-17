import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, X, CheckCircle2, ChevronRight, ShoppingCart } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { addWeeks, addMonths, addYears, format } from 'date-fns';
import { dataHoje } from '@/components/utils/dateUtils';
import { SeletorCategoria, useCategorias } from './fluxo/DialogCategoria';
import RecorrenciaConfig from './fluxo/RecorrenciaConfig';
import TagsInput from './fluxo/TagsInput';
import { Checkbox } from '@/components/ui/checkbox';
import LancamentoConfirmacaoDialog from './LancamentoConfirmacaoDialog';

const TIPOS = [
  { value: 'Receita', label: 'Receita', icon: ArrowDownLeft },
  { value: 'Despesa', label: 'Despesa', icon: ArrowUpRight },
  { value: 'Transferência', label: 'Transf.', icon: ArrowRightLeft },
];

const FREQS_MAP = {
  'Semanal': (d, i) => addWeeks(d, i),
  'Mensal': (d, i) => addMonths(d, i),
  'Bimestral': (d, i) => addMonths(d, i * 2),
  'Trimestral': (d, i) => addMonths(d, i * 3),
  'Semestral': (d, i) => addMonths(d, i * 6),
  'Anual': (d, i) => addYears(d, i),
};

/**
 * @param {'center' | 'bottomSheet'} [presentation] — Se omitido: `bottomSheet` quando `origemContaPagar`, senão `center`.
 */
export default function NovoLancamentoDialog({ open, onClose, onSaved, contaDefaultId, tipoInicial, descricaoInicial, valorInicial, referenciaId, referenciaTipo, origemContaPagar, presentation }) {
  const [tipo, setTipo] = useState(tipoInicial || 'Despesa');
  const [contas, setContas] = useState([]);
  const [valorCents, setValorCents] = useState(valorInicial ? Math.round(parseFloat(valorInicial) * 100).toString() : '0');
  const [descricao, setDescricao] = useState(descricaoInicial || '');
  const [data, setData] = useState(dataHoje());
  const [categoria, setCategoria] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [contaId, setContaId] = useState(contaDefaultId || '');
  const [contaDestinoId, setContaDestinoId] = useState('');
  const [status, setStatus] = useState('Em Aberto');
  const [tags, setTags] = useState([]);
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [frequencia, setFrequencia] = useState('');
  const [parcelas, setParcelas] = useState(2);
  const [dataFim, setDataFim] = useState('');
  const [step, setStep] = useState('valor');
  const [lancamentoCriado, setLancamentoCriado] = useState(null);
  const [isCustoMercadoria, setIsCustoMercadoria] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDialogMode, setConfirmDialogMode] = useState('processing');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pedidoCompraId, setPedidoCompraId] = useState('');
  const [pedidosCompra, setPedidosCompra] = useState([]);
  const { toast } = useToast();
  const { categorias, reload: reloadCats } = useCategorias();

  useEffect(() => {
    if (open) {
      base44.entities.ContasFinanceiras.filter({ ativo: true }).then(setContas);
      base44.entities.PedidoCompra.list('-created_date', 50).then(setPedidosCompra);
      setTipo(tipoInicial || 'Despesa');
      setValorCents(valorInicial ? Math.round(parseFloat(valorInicial) * 100).toString() : '0');
      setDescricao(descricaoInicial || '');
      setData(dataHoje());
      setCategoria('');
      setCategoriaId('');
      setContaId(contaDefaultId || '');
      setContaDestinoId('');
      setStatus('Em Aberto');
      setTags(origemContaPagar ? ['conta_pagar'] : []);
      setIsRecorrente(false);
      setFrequencia('');
      setParcelas(2);
      setDataFim('');
      setStep('valor');
      setLancamentoCriado(null);
      setIsCustoMercadoria(false);
      setPedidoCompraId('');
      setSaving(false);
      setConfirmDialogMode('processing');
      setShowConfirmDialog(false);
    }
  }, [open, tipoInicial, contaDefaultId, descricaoInicial, valorInicial]);

  if (!open) return null;

  const layout = presentation ?? (origemContaPagar ? 'bottomSheet' : 'center');
  const rootClassName =
    layout === 'bottomSheet'
      ? 'relative flex h-[min(58dvh,520px)] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-background shadow-2xl'
      : 'relative flex h-[min(100dvh,820px)] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-background shadow-2xl md:max-h-[calc(100vh-3rem)]';

  const valorNumerico = parseInt(valorCents || '0', 10) / 100;
  const display = valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const gerarGrupoId = () => `grp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const handleSave = async () => {
    if (saving) return;
    if (!valorNumerico || valorNumerico <= 0) { toast({ title: 'Informe o valor', variant: 'destructive' }); return; }
    if (tipo !== 'Transferência' && !descricao.trim()) { toast({ title: 'Informe a descrição', variant: 'destructive' }); return; }
    if (tipo === 'Transferência' && !contaId) { toast({ title: 'Selecione a conta', variant: 'destructive' }); return; }
    if (status === 'Pago' && !contaId) { toast({ title: 'Selecione a conta para registrar o pagamento', variant: 'destructive' }); return; }

    setSaving(true);
    setConfirmDialogMode('processing');
    setShowConfirmDialog(true);

    let lancamentoParaCallback = null;

    const conta = contas.find(c => c.id === contaId);
    const pedidoCompra = pedidoCompraId ? pedidosCompra.find(p => p.id === pedidoCompraId) : null;

    if (tipo === 'Transferência') {
      if (!contaDestinoId) {
        setSaving(false);
        setShowConfirmDialog(false);
        toast({ title: 'Selecione a conta destino', variant: 'destructive' });
        return;
      }
      const contaDest = contas.find(c => c.id === contaDestinoId);
      await base44.entities.LancamentoFinanceiro.create({ tipo: 'Despesa', descricao: `Transferência para ${contaDest?.nome}`, valor: valorNumerico, data_vencimento: data, data_pagamento: data, status: 'Pago', status_conciliacao: 'N/A', categoria: 'Transferência entre Contas', conta_financeira_id: contaId, conta_financeira_nome: conta?.nome, referencia_tipo: 'Manual' });
      await base44.entities.LancamentoFinanceiro.create({ tipo: 'Receita', descricao: `Transferência de ${conta?.nome}`, valor: valorNumerico, data_vencimento: data, data_pagamento: data, status: 'Pago', status_conciliacao: 'N/A', categoria: 'Transferência entre Contas', conta_financeira_id: contaDestinoId, conta_financeira_nome: contaDest?.nome, referencia_tipo: 'Manual' });
      await base44.entities.ContasFinanceiras.update(contaId, { saldo_atual: (conta?.saldo_atual || 0) - valorNumerico });
      await base44.entities.ContasFinanceiras.update(contaDestinoId, { saldo_atual: (contas.find(c => c.id === contaDestinoId)?.saldo_atual || 0) + valorNumerico });
    } else if (isRecorrente && frequencia) {
      const grupoId = gerarGrupoId();
      const baseDate = new Date(`${data}T12:00:00Z`);
      const isPago = status === 'Pago';
      const lotes = [];

      if (frequencia === 'Parcelado') {
        for (let i = 0; i < parcelas; i++) {
          const dtVenc = addMonths(baseDate, i);
          lotes.push({
            tipo, descricao: `${descricao} (${i + 1}/${parcelas})`,
            valor: valorNumerico, data_vencimento: format(dtVenc, 'yyyy-MM-dd'),
            data_pagamento: i === 0 && isPago ? data : null,
            status: i === 0 && isPago ? 'Pago' : 'Em Aberto',
            status_conciliacao: i === 0 && isPago ? 'Pendente' : 'N/A',
            categoria, categoria_id: categoriaId, tags,
            conta_financeira_id: contaId, conta_financeira_nome: conta?.nome,
            referencia_tipo: 'Manual',
            is_recorrente: true, frequencia_recorrencia: frequencia,
            numero_parcelas_total: parcelas, parcela_atual: i + 1,
            grupo_lancamento_id: grupoId,
            is_custo_mercadoria: isCustoMercadoria,
            pedido_compra_vinculado_id: pedidoCompra?.id,
            pedido_compra_vinculado_numero: pedidoCompra?.numero,
          });
        }
      } else {
        const addFn = FREQS_MAP[frequencia] || FREQS_MAP['Mensal'];
        const limiteDate = dataFim ? new Date(dataFim) : addMonths(baseDate, 11);
        let i = 0;
        let dtAtual = baseDate;
        while (dtAtual <= limiteDate && i < 60) {
          lotes.push({
            tipo, descricao,
            valor: valorNumerico, data_vencimento: format(dtAtual, 'yyyy-MM-dd'),
            data_pagamento: i === 0 && isPago ? data : null,
            status: i === 0 && isPago ? 'Pago' : 'Em Aberto',
            status_conciliacao: i === 0 && isPago ? 'Pendente' : 'N/A',
            categoria, categoria_id: categoriaId, tags,
            conta_financeira_id: contaId, conta_financeira_nome: conta?.nome,
            referencia_tipo: 'Manual',
            is_recorrente: true, frequencia_recorrencia: frequencia,
            parcela_atual: i + 1, grupo_lancamento_id: grupoId,
            data_fim_recorrencia: dataFim || null,
            is_custo_mercadoria: isCustoMercadoria,
            pedido_compra_vinculado_id: pedidoCompra?.id,
            pedido_compra_vinculado_numero: pedidoCompra?.numero,
          });
          i++;
          dtAtual = addFn(baseDate, i);
        }
      }

      await base44.entities.LancamentoFinanceiro.bulkCreate(lotes);
      if (isPago && conta) {
        const delta = tipo === 'Receita' ? valorNumerico : -valorNumerico;
        await base44.entities.ContasFinanceiras.update(conta.id, { saldo_atual: (conta.saldo_atual || 0) + delta });
      }
    } else {
      const isPago = status === 'Pago';
      const novoLancamento = await base44.entities.LancamentoFinanceiro.create({
        tipo, descricao, valor: valorNumerico,
        data_vencimento: data, data_pagamento: isPago ? data : null,
        status, status_conciliacao: isPago ? 'Pendente' : 'N/A',
        categoria, categoria_id: categoriaId, tags,
        conta_financeira_id: contaId, conta_financeira_nome: conta?.nome,
        referencia_tipo: referenciaTipo || 'Manual',
        referencia_id: referenciaId || '',
        is_custo_mercadoria: isCustoMercadoria,
        pedido_compra_vinculado_id: pedidoCompra?.id,
        pedido_compra_vinculado_numero: pedidoCompra?.numero,
      });
      if (isPago && conta) {
        const delta = tipo === 'Receita' ? valorNumerico : -valorNumerico;
        await base44.entities.ContasFinanceiras.update(conta.id, { saldo_atual: (conta.saldo_atual || 0) + delta });
      }
      setLancamentoCriado(novoLancamento);
      lancamentoParaCallback = novoLancamento;
    }

    toast({ title: 'Lançamento salvo!' });
    onSaved?.(lancamentoParaCallback);
    setSaving(false);
    setConfirmDialogMode('success');
  };

  const panel = (
    <div className={rootClassName} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-muted dark:bg-muted active:scale-95">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex gap-1 bg-muted dark:bg-muted rounded-2xl p-1">
          {TIPOS.map(t => {
            const Icon = t.icon;
            const isActive = tipo === t.value;
            return (
              <button key={t.value} onClick={() => setTipo(t.value)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${isActive ? 'bg-muted/400 dark:bg-muted text-white dark:text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                <Icon className="w-3.5 h-3.5" />{t.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1">
          <div className={`w-2 h-2 rounded-full transition-all ${step === 'valor' ? 'bg-primary dark:bg-muted' : 'bg-muted dark:bg-muted'}`} />
          <div className={`w-2 h-2 rounded-full transition-all ${step === 'detalhes' ? 'bg-primary dark:bg-muted' : 'bg-muted dark:bg-muted'}`} />
          <div className={`w-2 h-2 rounded-full transition-all ${step === 'anexos' ? 'bg-primary dark:bg-muted' : 'bg-muted dark:bg-muted'}`} />
        </div>
      </div>

      {step === 'valor' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div className="text-center w-full">
            <p className="text-[0.7rem] uppercase tracking-widest text-muted-foreground mb-2">Valor</p>
            <input autoComplete="off"
              type="number" inputMode="decimal" min="0" step="0.01"
              value={valorNumerico === 0 ? '' : valorNumerico}
              onChange={e => setValorCents(Math.round(parseFloat(e.target.value || '0') * 100).toString() || '0')}
              placeholder="0,00"
              className="w-full text-center text-5xl font-semibold text-foreground tracking-tight font-glacial bg-transparent outline-none border-0 placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">R$</p>
          </div>
          <input autoComplete="off"
            value={descricao} onChange={e => setDescricao(e.target.value)}
            placeholder={tipo === 'Transferência' ? 'Observações (opcional)' : 'Descrição *'}
            className="w-full text-center bg-transparent border-0 border-b border-border/40 py-2 text-sm text-muted-foreground placeholder:text-muted-foreground outline-none focus:border-border/40 transition-colors"
          />
          <button onClick={() => setStep('detalhes')}
            className="w-full h-14 rounded-2xl bg-muted/400 dark:bg-card text-white dark:text-foreground text-base font-semibold active:scale-95 transition-all flex items-center justify-center gap-2">
            Continuar <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
      {step === 'detalhes' && (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-2 space-y-3">
          {/* Resumo */}
          <div className="bg-card rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm">
            <span className="text-sm text-muted-foreground">{tipo} · {descricao || '—'}</span>
            <span className="text-lg font-semibold text-foreground">R$ {display}</span>
          </div>

          {/* Data */}
          <div className="bg-card rounded-2xl shadow-sm">
            <div className="px-4 py-1 text-[10px] text-muted-foreground uppercase tracking-wider pt-3">Data de Vencimento</div>
            <input autoComplete="off" type="date" value={data} onChange={e => setData(e.target.value)}
              className="w-full bg-transparent px-4 pb-3 text-sm text-foreground outline-none" />
          </div>

          {/* Conta — obrigatória só para Transferência ou quando Pago */}
          {(tipo === 'Transferência' || status === 'Pago') && (
            <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
              <Select value={contaId} onValueChange={setContaId}>
                <SelectTrigger className="border-0 shadow-none bg-transparent h-12 dark:text-foreground text-sm px-4">
                  <SelectValue placeholder={tipo === 'Transferência' ? 'Conta Origem *' : 'Conta *'} />
                </SelectTrigger>
                <SelectContent className="z-[70] dark:bg-muted dark:border-border/40">
                  {contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {tipo === 'Transferência' && (
            <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
              <Select value={contaDestinoId} onValueChange={setContaDestinoId}>
                <SelectTrigger className="border-0 shadow-none bg-transparent h-12 dark:text-foreground text-sm px-4">
                  <SelectValue placeholder="Conta Destino *" />
                </SelectTrigger>
                <SelectContent className="z-[70] dark:bg-muted dark:border-border/40">
                  {contas.filter(c => c.id !== contaId).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {tipo !== 'Transferência' && (
            <>
              {/* Status */}
              <div className="flex gap-2">
                {['Em Aberto', 'Pago'].map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    className={`flex-1 h-12 rounded-2xl text-sm font-medium transition-all shadow-sm ${status === s ? 'bg-muted/400 dark:bg-card text-white dark:text-foreground' : 'bg-card text-muted-foreground'}`}>
                    {s}
                  </button>
                ))}
              </div>

              {/* Categoria dinâmica */}
              <SeletorCategoria
                tipo={tipo}
                value={categoria}
                onChange={(nome, id) => { setCategoria(nome); setCategoriaId(id || ''); }}
                categorias={categorias}
                onCriada={reloadCats}
              />

              {/* Tags */}
              <TagsInput tags={tags} onChange={setTags} />

              {/* Custo de Mercadoria - Apenas para Despesa */}
              {tipo === 'Despesa' && (
                <>
                  <div className="bg-card rounded-2xl shadow-sm p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox checked={isCustoMercadoria} onCheckedChange={setIsCustoMercadoria} />
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-foreground/90">Custo de Mercadoria Vendida (CMV)</span>
                      </div>
                    </label>
                  </div>

                  {isCustoMercadoria && (
                    <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
                      <Select value={pedidoCompraId || '__none__'} onValueChange={(value) => setPedidoCompraId(value === '__none__' ? '' : value)}>
                        <SelectTrigger className="border-0 shadow-none bg-transparent h-12 dark:text-foreground text-sm px-4">
                          <SelectValue placeholder="Vincular a Pedido de Compra (opcional)" />
                        </SelectTrigger>
                        <SelectContent className="z-[70] dark:bg-muted dark:border-border/40">
                          <SelectItem value="__none__">Nenhum</SelectItem>
                          {pedidosCompra.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.numero} - {p.fornecedor_nome} - R$ {(p.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {/* Recorrência */}
              <RecorrenciaConfig
                isRecorrente={isRecorrente} onToggle={setIsRecorrente}
                frequencia={frequencia} onFrequencia={setFrequencia}
                parcelas={parcelas} onParcelas={setParcelas}
                dataFim={dataFim} onDataFim={setDataFim}
              />
            </>
          )}

          <button onClick={handleSave}
            disabled={saving}
            className="w-full h-14 rounded-2xl bg-muted/400 dark:bg-card text-white dark:text-foreground text-base font-semibold active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:pointer-events-none">
            <CheckCircle2 className="w-5 h-5" />
            {saving ? 'Processando...' : isRecorrente && frequencia === 'Parcelado' ? `Criar ${parcelas} parcelas` : isRecorrente ? 'Criar Recorrência' : 'Confirmar Lançamento'}
          </button>
        </div>
      )}
      <LancamentoConfirmacaoDialog
        open={showConfirmDialog}
        mode={confirmDialogMode}
        onCreateAnother={() => {
          setShowConfirmDialog(false);
          setConfirmDialogMode('processing');
          setSaving(false);
          setValorCents('0');
          setDescricao('');
          setData(dataHoje());
          setCategoria('');
          setCategoriaId('');
          setContaId(contaDefaultId || '');
          setContaDestinoId('');
          setStatus('Em Aberto');
          setTags([]);
          setIsRecorrente(false);
          setFrequencia('');
          setParcelas(2);
          setDataFim('');
          setStep('valor');
          setLancamentoCriado(null);
          setIsCustoMercadoria(false);
          setPedidoCompraId('');
        }}
        onFinish={() => {
          setShowConfirmDialog(false);
          onClose();
        }}
      />
    </div>
  );

  if (layout === 'bottomSheet') {
    return createPortal(
      <>
        <button
          type="button"
          aria-label="Fechar"
          className="fixed inset-0 z-[59] cursor-default bg-muted/25 dark:bg-muted/40"
          onClick={onClose}
        />
        <div
          className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-0"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="pointer-events-auto w-full max-w-2xl" role="dialog" aria-modal="true">
            {panel}
          </div>
        </div>
      </>,
      document.body
    );
  }

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Fechar"
        className="fixed inset-0 z-[59] cursor-default bg-muted/55 backdrop-blur-[2px] dark:bg-muted/40"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 pointer-events-none md:p-4">
        <div className="pointer-events-auto w-full max-w-2xl" role="dialog" aria-modal="true">
          {panel}
        </div>
      </div>
    </>,
    document.body
  );
}