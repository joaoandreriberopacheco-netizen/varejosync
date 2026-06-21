import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, X, CheckCircle2, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { addWeeks, addMonths, addYears, format } from 'date-fns';
import { dataHoje, datetimeLocalParaISO, codigoOrdenacaoDesdeInstante } from '@/components/utils/dateUtils';
import { formatarCodigoLancamentoLegivel } from '@/lib/financialUtils';
import { sincronizarSaldosAposAlteracao } from '@/lib/sincronizarSaldoContasFinanceiras';
import { SeletorCategoria, useCategorias } from './fluxo/DialogCategoria';
import SeletorContaMobile from './fluxo/SeletorContaMobile';
import MobileCampoFlow from './fluxo/MobileCampoFlow';
import LancamentoResumoConfirmacao from './fluxo/LancamentoResumoConfirmacao';
import LancamentoMaisOpcoes from './fluxo/LancamentoMaisOpcoes';
import LancamentoConfirmacaoDialog from './LancamentoConfirmacaoDialog';
import { normalizeDataText } from '@/lib/normalizeDataText';
import { createUppercaseInputChangeHandler } from '@/lib/uppercaseInputHandlers';
import { useCompactShell } from '@/hooks/use-breakpoint';
import { gravarPreferenciasLancamento, resolverPreferenciasLancamento } from '@/lib/lancamentoPreferencias';

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
  const [dataLancamento, setDataLancamento] = useState('');
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
  const [mobileStep, setMobileStep] = useState(0);
  const { toast } = useToast();
  const { categorias, reload: reloadCats } = useCategorias();
  const isMobile = useCompactShell();

  useEffect(() => {
    if (open) {
      base44.entities.ContasFinanceiras.filter({ ativo: true }).then(setContas);
      base44.entities.PedidoCompra.list('-created_date', 50).then(setPedidosCompra);
      setTipo(tipoInicial || 'Despesa');
      setValorCents(valorInicial ? Math.round(parseFloat(valorInicial) * 100).toString() : '0');
      setDescricao(descricaoInicial || '');
      setData(dataHoje());
      setDataLancamento('');
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
      setMobileStep(0);
    }
  }, [open, tipoInicial, contaDefaultId, descricaoInicial, valorInicial, origemContaPagar]);

  useEffect(() => {
    if (open) setMobileStep(0);
    if (!open || tipo === 'Transferência') return;
    const prefs = resolverPreferenciasLancamento(tipo, { contas, categorias });
    if (!contaDefaultId && prefs.contaId) setContaId(prefs.contaId);
    if (!origemContaPagar) {
      setCategoria(prefs.categoria || '');
      setCategoriaId(prefs.categoriaId || '');
    }
  }, [open, tipo, contas, categorias, contaDefaultId, origemContaPagar]);

  const previewOrdemLancamento = useMemo(() => {
    if (!dataLancamento) return null;
    const iso = datetimeLocalParaISO(dataLancamento);
    if (!iso) return null;
    return formatarCodigoLancamentoLegivel(codigoOrdenacaoDesdeInstante(iso));
  }, [dataLancamento]);

  const valorNumerico = parseInt(valorCents || '0', 10) / 100;
  const display = valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const mobileSteps = useMemo(() => {
    if (!isMobile) return [];
    const steps = [
      {
        id: 'valor',
        label: 'Valor',
        title: 'Quanto é?',
        hint: 'Informe o valor do lançamento',
        type: 'decimal',
        value: valorNumerico === 0 ? '' : String(valorNumerico),
        onChange: (e) => setValorCents(Math.round(parseFloat(e.target.value || '0') * 100).toString() || '0'),
      },
      {
        id: 'descricao',
        label: 'Descrição',
        title: tipo === 'Transferência' ? 'Alguma observação?' : 'Do que se trata?',
        hint: tipo === 'Transferência' ? 'Opcional' : 'Ex: aluguel, fornecedor, cliente',
        type: 'text',
        optional: tipo === 'Transferência',
        uppercase: true,
        value: descricao,
        onChange: (e) => setDescricao(e.target.value),
        placeholder: tipo === 'Transferência' ? 'Opcional' : 'Ex: Aluguel',
      },
      {
        id: 'data',
        label: 'Vencimento',
        title: 'Quando vence?',
        type: 'date',
        value: data,
        onChange: (e) => setData(e.target.value),
      },
      {
        id: 'dataLancamento',
        label: 'Ordem no fluxo',
        title: 'Quando aparece na lista?',
        hint: 'Opcional — só muda a posição na lista do fluxo',
        type: 'datetime',
        optional: true,
        value: dataLancamento,
        onChange: (e) => setDataLancamento(e.target.value),
        preview: previewOrdemLancamento ? `Ordem: ${previewOrdemLancamento}` : null,
      },
    ];

    if (tipo === 'Transferência') {
      steps.push(
        {
          id: 'contaOrigem',
          type: 'custom',
          label: 'Conta origem',
          render: () => (
            <SeletorContaMobile
              contas={contas}
              value={contaId}
              onChange={setContaId}
              label="De qual conta?"
              placeholder="Selecionar origem"
            />
          ),
        },
        {
          id: 'contaDestino',
          type: 'custom',
          label: 'Conta destino',
          render: () => (
            <SeletorContaMobile
              contas={contas}
              value={contaDestinoId}
              onChange={setContaDestinoId}
              excludeIds={contaId ? [contaId] : []}
              label="Para qual conta?"
              placeholder="Selecionar destino"
            />
          ),
        },
      );
    } else {
      steps.push(
        {
          id: 'conta',
          type: 'custom',
          label: 'Conta',
          render: () => (
            <SeletorContaMobile
              contas={contas}
              value={contaId}
              onChange={setContaId}
              label="Qual conta?"
              placeholder="Selecionar conta"
            />
          ),
        },
        {
          id: 'status',
          type: 'choice',
          label: 'Situação',
          title: 'Já foi pago?',
          value: status,
          onChange: setStatus,
          options: [
            { value: 'Em Aberto', label: 'Ainda em aberto' },
            { value: 'Pago', label: 'Sim, já pago' },
          ],
        },
        {
          id: 'categoria',
          type: 'custom',
          label: 'Categoria',
          title: 'Qual categoria?',
          hint: 'Opcional — ajuda nos relatórios',
          optional: true,
          render: () => (
            <SeletorCategoria
              tipo={tipo}
              value={categoria}
              onChange={(nome, id) => { setCategoria(nome); setCategoriaId(id || ''); }}
              categorias={categorias}
              onCriada={reloadCats}
              mobileLarge
            />
          ),
        },
        {
          id: 'extras',
          type: 'custom',
          label: 'Mais opções',
          title: 'Precisa de mais alguma coisa?',
          hint: 'Tags, recorrência ou CMV — só se precisar',
          optional: true,
          render: () => (
            <LancamentoMaisOpcoes
              tipo={tipo}
              tags={tags}
              onTagsChange={setTags}
              isCustoMercadoria={isCustoMercadoria}
              onCustoMercadoriaChange={setIsCustoMercadoria}
              pedidoCompraId={pedidoCompraId}
              onPedidoCompraIdChange={setPedidoCompraId}
              pedidosCompra={pedidosCompra}
              isRecorrente={isRecorrente}
              onRecorrenteToggle={setIsRecorrente}
              frequencia={frequencia}
              onFrequencia={setFrequencia}
              parcelas={parcelas}
              onParcelas={setParcelas}
              dataFim={dataFim}
              onDataFim={setDataFim}
              defaultExpanded
            />
          ),
        },
      );
    }

    steps.push({
      id: 'confirm',
      type: 'custom',
      label: 'Confirmar',
      title: 'Está tudo certo?',
      render: () => (
        <LancamentoResumoConfirmacao
          tipo={tipo}
          descricao={descricao}
          valorFormatado={display}
          dataVencimento={data}
          status={status}
          contaNome={contas.find((c) => c.id === contaId)?.nome}
          contaDestinoNome={contas.find((c) => c.id === contaDestinoId)?.nome}
          categoria={categoria}
          tags={tags}
          isRecorrente={isRecorrente}
          frequencia={frequencia}
          parcelas={parcelas}
          isCustoMercadoria={isCustoMercadoria}
        />
      ),
    });

    return steps;
  }, [
    isMobile, tipo, valorNumerico, descricao, data, dataLancamento, previewOrdemLancamento,
    contas, contaId, contaDestinoId, status, categoria, categorias, tags,
    isCustoMercadoria, isRecorrente, frequencia, parcelas, dataFim, display, reloadCats,
  ]);

  const validateMobileStep = useCallback((stepId) => {
    if (stepId === 'valor' && valorNumerico <= 0) {
      toast({ title: 'Informe o valor', variant: 'destructive' });
      return false;
    }
    if (stepId === 'descricao' && tipo !== 'Transferência' && !descricao.trim()) {
      toast({ title: 'Informe a descrição', variant: 'destructive' });
      return false;
    }
    if (stepId === 'conta' && !contaId) {
      toast({ title: 'Selecione uma conta', variant: 'destructive' });
      return false;
    }
    if (stepId === 'contaOrigem' && !contaId) {
      toast({ title: 'Selecione a conta origem', variant: 'destructive' });
      return false;
    }
    if (stepId === 'contaDestino' && !contaDestinoId) {
      toast({ title: 'Selecione a conta destino', variant: 'destructive' });
      return false;
    }
    if (stepId === 'status' && status === 'Pago' && !contaId) {
      toast({ title: 'Selecione a conta para registrar o pagamento', variant: 'destructive' });
      return false;
    }
    return true;
  }, [valorNumerico, tipo, descricao, contaId, contaDestinoId, status, toast]);

  const gerarGrupoId = () => `grp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const metaDataLancamento = () => {
    if (!dataLancamento) return {};
    const iso = datetimeLocalParaISO(dataLancamento);
    return iso ? { data_lancamento: iso } : {};
  };

  const handleSave = async () => {
    if (saving) return;
    if (!valorNumerico || valorNumerico <= 0) { toast({ title: 'Informe o valor', variant: 'destructive' }); return; }
    if (tipo !== 'Transferência' && !descricao.trim()) { toast({ title: 'Informe a descrição', variant: 'destructive' }); return; }
    if (tipo === 'Transferência' && !contaId) { toast({ title: 'Selecione a conta', variant: 'destructive' }); return; }
    if (status === 'Pago' && !contaId) { toast({ title: 'Selecione a conta para registrar o pagamento', variant: 'destructive' }); return; }

    const descricaoNorm = normalizeDataText(descricao.trim());
    const categoriaNorm = normalizeDataText(categoria);

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
      await base44.entities.LancamentoFinanceiro.create({ ...metaDataLancamento(), tipo: 'Despesa', descricao: `Transferência para ${contaDest?.nome}`, valor: valorNumerico, data_vencimento: data, data_pagamento: data, status: 'Pago', status_conciliacao: 'N/A', categoria: 'Transferência entre Contas', conta_financeira_id: contaId, conta_financeira_nome: conta?.nome, referencia_tipo: 'Manual' });
      await base44.entities.LancamentoFinanceiro.create({ ...metaDataLancamento(), tipo: 'Receita', descricao: `Transferência de ${conta?.nome}`, valor: valorNumerico, data_vencimento: data, data_pagamento: data, status: 'Pago', status_conciliacao: 'N/A', categoria: 'Transferência entre Contas', conta_financeira_id: contaDestinoId, conta_financeira_nome: contaDest?.nome, referencia_tipo: 'Manual' });
      await sincronizarSaldosAposAlteracao(base44, [contaId, contaDestinoId]);
    } else if (isRecorrente && frequencia) {
      const grupoId = gerarGrupoId();
      const baseDate = new Date(`${data}T12:00:00Z`);
      const isPago = status === 'Pago';
      const lotes = [];

      if (frequencia === 'Parcelado') {
        for (let i = 0; i < parcelas; i++) {
          const dtVenc = addMonths(baseDate, i);
          lotes.push({
            ...metaDataLancamento(),
            tipo, descricao: `${descricaoNorm} (${i + 1}/${parcelas})`,
            valor: valorNumerico, data_vencimento: format(dtVenc, 'yyyy-MM-dd'),
            data_pagamento: i === 0 && isPago ? data : null,
            status: i === 0 && isPago ? 'Pago' : 'Em Aberto',
            status_conciliacao: i === 0 && isPago ? 'Pendente' : 'N/A',
            categoria: categoriaNorm, categoria_id: categoriaId, tags,
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
            ...metaDataLancamento(),
            tipo, descricao: descricaoNorm,
            valor: valorNumerico, data_vencimento: format(dtAtual, 'yyyy-MM-dd'),
            data_pagamento: i === 0 && isPago ? data : null,
            status: i === 0 && isPago ? 'Pago' : 'Em Aberto',
            status_conciliacao: i === 0 && isPago ? 'Pendente' : 'N/A',
            categoria: categoriaNorm, categoria_id: categoriaId, tags,
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
        await sincronizarSaldosAposAlteracao(base44, [conta.id]);
      }
    } else {
      const isPago = status === 'Pago';
      const novoLancamento = await base44.entities.LancamentoFinanceiro.create({
        ...metaDataLancamento(),
        tipo, descricao: descricaoNorm, valor: valorNumerico,
        data_vencimento: data, data_pagamento: isPago ? data : null,
        status, status_conciliacao: isPago ? 'Pendente' : 'N/A',
        categoria: categoriaNorm, categoria_id: categoriaId, tags,
        conta_financeira_id: contaId, conta_financeira_nome: conta?.nome,
        referencia_tipo: referenciaTipo || 'Manual',
        referencia_id: referenciaId || '',
        is_custo_mercadoria: isCustoMercadoria,
        pedido_compra_vinculado_id: pedidoCompra?.id,
        pedido_compra_vinculado_numero: pedidoCompra?.numero,
      });
      if (isPago && conta) {
        await sincronizarSaldosAposAlteracao(base44, [conta.id]);
      }
      setLancamentoCriado(novoLancamento);
      lancamentoParaCallback = novoLancamento;
    }

    toast({ title: 'Lançamento salvo!' });
    if (tipo !== 'Transferência') {
      gravarPreferenciasLancamento(tipo, {
        contaId,
        categoria: categoriaNorm,
        categoriaId,
      });
    }
    onSaved?.(lancamentoParaCallback);
    setSaving(false);
    setConfirmDialogMode('success');
  };

  const handleMobileNext = () => {
    const current = mobileSteps[mobileStep];
    if (!current) return;
    if (!validateMobileStep(current.id)) return;
    if (current.id === 'confirm') {
      handleSave();
      return;
    }
    if (mobileStep < mobileSteps.length - 1) setMobileStep((i) => i + 1);
  };

  const handleMobileBack = () => {
    if (mobileStep > 0) setMobileStep((i) => i - 1);
    else onClose();
  };

  const handleMobileSkip = () => {
    if (mobileStep < mobileSteps.length - 1) setMobileStep((i) => i + 1);
  };

  if (!open) return null;

  const layout = presentation ?? (origemContaPagar ? 'bottomSheet' : 'center');
  const rootClassName = isMobile
    ? 'relative flex h-[min(92dvh,720px)] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-background shadow-2xl'
    : layout === 'bottomSheet'
      ? 'relative flex h-[min(58dvh,520px)] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-background shadow-2xl'
      : 'relative flex h-[min(100dvh,820px)] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-background shadow-2xl md:max-h-[calc(100vh-3rem)]';

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
          {!isMobile && (
            <>
              <div className={`w-2 h-2 rounded-full transition-all ${step === 'valor' ? 'bg-primary dark:bg-muted' : 'bg-muted dark:bg-muted'}`} />
              <div className={`w-2 h-2 rounded-full transition-all ${step === 'detalhes' ? 'bg-primary dark:bg-muted' : 'bg-muted dark:bg-muted'}`} />
              <div className={`w-2 h-2 rounded-full transition-all ${step === 'anexos' ? 'bg-primary dark:bg-muted' : 'bg-muted dark:bg-muted'}`} />
            </>
          )}
        </div>
      </div>

      {isMobile ? (
        <div className="flex-1 min-h-0 flex flex-col px-4 pb-4">
          <MobileCampoFlow
            steps={mobileSteps}
            stepIndex={mobileStep}
            onStepIndexChange={setMobileStep}
            onBack={handleMobileBack}
            onNext={handleMobileNext}
            onSkip={handleMobileSkip}
            showSkip={!!mobileSteps[mobileStep]?.optional}
            finishLabel={saving ? 'Processando...' : 'Confirmar lançamento'}
            nextLabel="Próximo"
          />
        </div>
      ) : (
      <>
      {step === 'valor' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div className="text-center w-full">
            <p className="text-lg font-semibold text-foreground mb-1">Quanto é?</p>
            <p className="text-xs text-muted-foreground mb-3">Valor do lançamento</p>
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
            value={descricao}
            onChange={createUppercaseInputChangeHandler((e) => setDescricao(e.target.value))}
            placeholder={tipo === 'Transferência' ? 'Observações (opcional)' : 'Do que se trata? *'}
            className="w-full text-center bg-transparent border-0 border-b border-border/40 py-2 text-sm text-muted-foreground placeholder:text-muted-foreground outline-none focus:border-border/40 transition-colors p38-data-uppercase"
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
            <div className="px-4 py-1 text-sm font-medium text-foreground pt-3">Quando vence?</div>
            <input autoComplete="off" type="date" value={data} onChange={e => setData(e.target.value)}
              className="w-full bg-transparent px-4 pb-3 text-sm text-foreground outline-none" />
          </div>

          <div className="bg-card rounded-2xl shadow-sm">
            <div className="px-4 py-1 text-sm font-medium text-foreground pt-3">
              Quando aparece na lista? <span className="font-normal text-muted-foreground">(opcional)</span>
            </div>
            <input
              autoComplete="off"
              type="datetime-local"
              value={dataLancamento}
              onChange={(e) => setDataLancamento(e.target.value)}
              className="w-full bg-transparent px-4 pb-1 text-sm text-foreground outline-none"
            />
            <p className="px-4 pb-3 text-xs text-muted-foreground">
              {previewOrdemLancamento ? (
                <>
                  Ordem no fluxo:{' '}
                  <span className="font-mono text-foreground/80">{previewOrdemLancamento}</span>
                </>
              ) : (
                'Se deixar vazio, usa a data e hora de agora.'
              )}
            </p>
          </div>

          {/* Conta */}
          {tipo === 'Transferência' ? (
            <>
              <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-1 text-[10px] text-muted-foreground uppercase tracking-wider pt-3">Conta Origem</div>
                <Select value={contaId} onValueChange={setContaId}>
                  <SelectTrigger className="border-0 shadow-none bg-transparent h-12 dark:text-foreground text-sm px-4">
                    <SelectValue placeholder="Conta Origem *" />
                  </SelectTrigger>
                  <SelectContent className="z-[70] dark:bg-muted dark:border-border/40">
                    {contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
            </>
          ) : (
            <>
              <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-1 text-sm font-medium text-foreground pt-3">Qual conta?</div>
                <Select value={contaId} onValueChange={setContaId}>
                  <SelectTrigger className="border-0 shadow-none bg-transparent h-12 dark:text-foreground text-base px-4">
                    <SelectValue placeholder="Escolher conta" />
                  </SelectTrigger>
                  <SelectContent className="z-[70] dark:bg-muted dark:border-border/40">
                    {contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Status — abaixo da conta */}
              <div className="flex gap-2">
                <p className="w-full text-xs text-muted-foreground px-1 pb-1">Já foi pago?</p>
              </div>
              <div className="flex gap-2">
                {[
                  { value: 'Em Aberto', label: 'Em aberto' },
                  { value: 'Pago', label: 'Já pago' },
                ].map(({ value, label }) => (
                  <button key={value} onClick={() => setStatus(value)}
                    className={`flex-1 h-12 rounded-2xl text-sm font-medium transition-all shadow-sm ${status === value ? 'bg-muted/400 dark:bg-card text-white dark:text-foreground' : 'bg-card text-muted-foreground'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {tipo !== 'Transferência' && (
            <>
              <SeletorCategoria
                tipo={tipo}
                value={categoria}
                onChange={(nome, id) => { setCategoria(nome); setCategoriaId(id || ''); }}
                categorias={categorias}
                onCriada={reloadCats}
              />

              <LancamentoMaisOpcoes
                tipo={tipo}
                tags={tags}
                onTagsChange={setTags}
                isCustoMercadoria={isCustoMercadoria}
                onCustoMercadoriaChange={setIsCustoMercadoria}
                pedidoCompraId={pedidoCompraId}
                onPedidoCompraIdChange={setPedidoCompraId}
                pedidosCompra={pedidosCompra}
                isRecorrente={isRecorrente}
                onRecorrenteToggle={setIsRecorrente}
                frequencia={frequencia}
                onFrequencia={setFrequencia}
                parcelas={parcelas}
                onParcelas={setParcelas}
                dataFim={dataFim}
                onDataFim={setDataFim}
              />
            </>
          )}

          <LancamentoResumoConfirmacao
            tipo={tipo}
            descricao={descricao}
            valorFormatado={display}
            dataVencimento={data}
            status={status}
            contaNome={contas.find((c) => c.id === contaId)?.nome}
            contaDestinoNome={contas.find((c) => c.id === contaDestinoId)?.nome}
            categoria={categoria}
            tags={tags}
            isRecorrente={isRecorrente}
            frequencia={frequencia}
            parcelas={parcelas}
            isCustoMercadoria={isCustoMercadoria}
          />

          <button onClick={handleSave}
            disabled={saving}
            className="w-full h-14 rounded-2xl bg-muted/400 dark:bg-card text-white dark:text-foreground text-base font-semibold active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:pointer-events-none">
            <CheckCircle2 className="w-5 h-5" />
            {saving ? 'Processando...' : isRecorrente && frequencia === 'Parcelado' ? `Criar ${parcelas} parcelas` : isRecorrente ? 'Criar Recorrência' : 'Confirmar Lançamento'}
          </button>
        </div>
      )}
      </>
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
          setDataLancamento('');
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
          setMobileStep(0);
        }}
        onFinish={() => {
          setShowConfirmDialog(false);
          onClose();
        }}
      />
    </div>
  );

  if (layout === 'bottomSheet' || isMobile) {
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