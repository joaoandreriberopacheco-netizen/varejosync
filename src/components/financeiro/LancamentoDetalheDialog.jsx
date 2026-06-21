import { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatarSoData, dataHoje, toLocalDateKey, vencimentoComMesmoDiaNoMes, datetimeLocalParaISO, codigoOrdenacaoDesdeInstante } from '@/components/utils/dateUtils';
import { formatarCodigoLancamentoLegivel } from '@/lib/financialUtils';
import {
  ordemLancamentoFoiPersistida,
  prepararPayloadOrdemLancamento,
  resolverDataLancamentoInput,
} from '@/lib/lancamentoOrdemMeta';

const mesAnoLabel = (dataStr) => {
  if (!dataStr) return '';
  const s = typeof dataStr === 'string' && dataStr.length >= 7 ? dataStr : toLocalDateKey(dataStr);
  const meses = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const [y, m] = s.split('-');
  return `${meses[parseInt(m,10)-1]}/${y}`;
};
import { Clock, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, X, Save, RotateCcw, AlertCircle, Trash2, Loader2, Pencil } from 'lucide-react';
import CancelarLancamentoDialog from './CancelarLancamentoDialog';
import LancamentoConfirmacaoDialog from './LancamentoConfirmacaoDialog';
import { useToast } from '@/components/ui/use-toast';
import AnexosPanel from '@/components/anexos/AnexosPanel';
import RecorrenciaEscopoDialog from './RecorrenciaEscopoDialog';
import { lancamentoMesmoRamoRecorrencia } from '@/lib/agefinLancamentosRecorrencia';
import { SeletorCategoria, useCategorias } from './fluxo/DialogCategoria';
import TagsInput from './fluxo/TagsInput';
import SeletorContaMobile from './fluxo/SeletorContaMobile';
import MobileCampoFlow from './fluxo/MobileCampoFlow';
import LancamentoResumoConfirmacao from './fluxo/LancamentoResumoConfirmacao';
import { tagsVisiveisFinanceiro } from './fluxo/FinanceiroLancRow';
import { useCompactShell } from '@/hooks/use-breakpoint';
import { gravarPreferenciasLancamento } from '@/lib/lancamentoPreferencias';

const R = (v) => `R$ ${Math.abs(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

import { isLancamentoPago } from '@/lib/lancamentoFinanceiroStatus';
import { sincronizarSaldosAposAlteracao } from '@/lib/sincronizarSaldoContasFinanceiras';
import { normalizeDataText } from '@/lib/normalizeDataText';
import { createUppercaseInputChangeHandler } from '@/lib/uppercaseInputHandlers';

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-none ${checked ? 'bg-primary dark:bg-muted' : 'bg-muted dark:bg-muted'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-card shadow transform transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

const inputClass = (enabled) =>
  `w-full h-10 px-3 text-sm rounded-xl bg-muted text-foreground border-0 outline-none focus:ring-2 focus:ring-border/40 dark:focus:ring-ring ${enabled ? '' : 'opacity-60 cursor-default'}`;

export default function LancamentoDetalheDialog({ lancamento, contas, onClose, onSaved }) {
  const [modoEdicao, setModoEdicao] = useState(false);
  const [contaId, setContaId] = useState(lancamento.conta_financeira_id || '');
  const [cadDescricao, setCadDescricao] = useState(lancamento.descricao || '');
  const [cadVencimento, setCadVencimento] = useState((lancamento.data_vencimento || '').slice(0, 10));
  const [cadValor, setCadValor] = useState(String(lancamento.valor ?? ''));
  const [cadObs, setCadObs] = useState(lancamento.observacoes || '');
  const [editCategoria, setEditCategoria] = useState(lancamento.categoria || '');
  const [editCategoriaId, setEditCategoriaId] = useState(lancamento.categoria_id || '');
  const [editTags, setEditTags] = useState(lancamento.tags || []);
  const [dataPagamento, setDataPagamento] = useState(
    lancamento.data_pagamento ? lancamento.data_pagamento : dataHoje()
  );
  const [dataLiquidacao, setDataLiquidacao] = useState(
    lancamento.data_pagamento ? lancamento.data_pagamento : dataHoje()
  );
  const [isPagoLocal, setIsPagoLocal] = useState(isLancamentoPago(lancamento));
  const [saving, setSaving] = useState(false);
  const [showEscopo, setShowEscopo] = useState(false);
  const [showEscopoCadastro, setShowEscopoCadastro] = useState(false);
  const [pendingEscopoPagamento, setPendingEscopoPagamento] = useState('apenas_esta');
  const [showCancelarDialog, setShowCancelarDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogMode, setConfirmDialogMode] = useState('processing');
  const [mobileEditStep, setMobileEditStep] = useState(0);
  const dataLancamentoOriginal = useMemo(
    () => resolverDataLancamentoInput(lancamento),
    [lancamento],
  );
  const [dataLancamentoLocal, setDataLancamentoLocal] = useState(dataLancamentoOriginal);
  const [dataLancamentoBase, setDataLancamentoBase] = useState(dataLancamentoOriginal);
  const { toast } = useToast();
  const { categorias, reload: reloadCats } = useCategorias();
  const isMobile = useCompactShell();

  const isCancelado = lancamento.status === 'Cancelado';
  const isReceita = lancamento.tipo === 'Receita';
  const isTransf = lancamento.tipo === 'Transferência';
  const ehLancamentoEditavel = !isTransf && !isCancelado;

  useEffect(() => {
    setCadDescricao(lancamento.descricao || '');
    setCadVencimento((lancamento.data_vencimento || '').slice(0, 10));
    setCadValor(String(lancamento.valor ?? ''));
    setCadObs(lancamento.observacoes || '');
    setEditCategoria(lancamento.categoria || '');
    setEditCategoriaId(lancamento.categoria_id || '');
    setEditTags(lancamento.tags || []);
    setContaId(lancamento.conta_financeira_id || '');
    setIsPagoLocal(isLancamentoPago(lancamento));
    setDataPagamento(lancamento.data_pagamento ? lancamento.data_pagamento : dataHoje());
    setDataLiquidacao(lancamento.data_pagamento ? lancamento.data_pagamento : dataHoje());
    setDataLancamentoLocal(dataLancamentoOriginal);
    setDataLancamentoBase(dataLancamentoOriginal);
    setModoEdicao(false);
    setMobileEditStep(0);
  }, [
    lancamento.id,
    lancamento.descricao,
    lancamento.data_vencimento,
    lancamento.valor,
    lancamento.observacoes,
    lancamento.categoria,
    lancamento.categoria_id,
    lancamento.tags,
    lancamento.conta_financeira_id,
    lancamento.data_pagamento,
    lancamento.status,
    dataLancamentoOriginal,
  ]);

  const cadastroDirty = useMemo(() => {
    if (!ehLancamentoEditavel) return false;
    const d0 = (lancamento.descricao || '').trim();
    const d1 = (cadDescricao || '').trim();
    const v0 = Number(lancamento.valor ?? 0);
    const v1 = parseFloat(String(cadValor).replace(',', '.')) || 0;
    const ven0 = (lancamento.data_vencimento || '').slice(0, 10);
    const ven1 = (cadVencimento || '').slice(0, 10);
    const obs0 = lancamento.observacoes || '';
    const obs1 = cadObs || '';
    const cat0 = lancamento.categoria || '';
    const cat1 = editCategoria || '';
    const tags0 = JSON.stringify(lancamento.tags || []);
    const tags1 = JSON.stringify(editTags || []);
    return (
      d0 !== d1 ||
      ven0 !== ven1 ||
      Math.abs(v0 - v1) > 0.009 ||
      obs0 !== obs1 ||
      cat0 !== cat1 ||
      tags0 !== tags1
    );
  }, [
    ehLancamentoEditavel,
    lancamento,
    cadDescricao,
    cadVencimento,
    cadValor,
    cadObs,
    editCategoria,
    editTags,
  ]);

  const dataLancamentoDirty = dataLancamentoLocal !== dataLancamentoBase;
  const previewOrdemLancamento = useMemo(() => {
    if (!dataLancamentoLocal) return null;
    const iso = datetimeLocalParaISO(dataLancamentoLocal);
    if (!iso) return null;
    return formatarCodigoLancamentoLegivel(codigoOrdenacaoDesdeInstante(iso));
  }, [dataLancamentoLocal]);

  const payloadDataLancamentoFromInput = (value = dataLancamentoLocal) => {
    const iso = datetimeLocalParaISO(value);
    if (!iso) return null;
    return prepararPayloadOrdemLancamento({ dataLancamento: iso, tags: editTags });
  };

  const metaDataLancamentoIfDirty = () => {
    if (!dataLancamentoDirty) return {};
    return payloadDataLancamentoFromInput() || {};
  };

  const isPagoOriginal = isLancamentoPago(lancamento);
  const isPendente = lancamento.status_conciliacao === 'Pendente';
  const isCartaoReceber = isReceita && ['Cartão Débito', 'Cartão Crédito'].includes(lancamento.forma_pagamento_tipo);
  const valorNumerico = parseFloat(String(cadValor).replace(',', '.')) || 0;
  const valorLiquidoOriginal = parseFloat(lancamento.valor_liquido ?? lancamento.valor) || 0;
  const proporcaoLiquida = (lancamento.valor || 0) > 0 ? valorLiquidoOriginal / lancamento.valor : 1;
  const houveAlteracaoValor = Math.abs(valorNumerico - (parseFloat(lancamento.valor) || 0)) > 0.009;
  const pagamentoDirty = isPagoLocal !== isPagoOriginal
    || (isPagoLocal && dataPagamento !== (lancamento.data_pagamento || dataHoje()))
    || (isPagoLocal && contaId !== (lancamento.conta_financeira_id || ''));
  const conciliacaoDirty = isPagoOriginal && isPendente
    && dataLiquidacao !== (lancamento.data_pagamento || dataHoje());

  const formDirty = cadastroDirty || dataLancamentoDirty || pagamentoDirty || conciliacaoDirty;

  const mobileEditSteps = useMemo(() => {
    if (!isMobile || !ehLancamentoEditavel) return [];
    const steps = [
      {
        id: 'descricao',
        label: 'Descrição',
        title: 'Do que se trata?',
        type: 'text',
        uppercase: true,
        value: cadDescricao,
        onChange: (e) => setCadDescricao(e.target.value),
        placeholder: 'Descrição do lançamento',
      },
      {
        id: 'valor',
        label: 'Valor',
        title: 'Quanto é?',
        type: 'decimal',
        value: cadValor,
        onChange: (e) => setCadValor(e.target.value),
      },
      {
        id: 'vencimento',
        label: 'Vencimento',
        title: 'Quando vence?',
        type: 'date',
        value: cadVencimento,
        onChange: (e) => setCadVencimento(e.target.value),
      },
      {
        id: 'observacoes',
        label: 'Observações',
        title: 'Alguma observação?',
        hint: 'Opcional',
        type: 'textarea',
        optional: true,
        uppercase: true,
        value: cadObs,
        onChange: (e) => setCadObs(e.target.value),
        placeholder: 'Opcional',
      },
      {
        id: 'categoria',
        label: 'Categoria',
        title: 'Qual categoria?',
        type: 'custom',
        optional: true,
        render: () => (
          <SeletorCategoria
            tipo={lancamento.tipo}
            value={editCategoria}
            onChange={(nome, id) => { setEditCategoria(nome); setEditCategoriaId(id || ''); }}
            categorias={categorias}
            onCriada={reloadCats}
            mobileLarge
          />
        ),
      },
      {
        id: 'tags',
        label: 'Tags',
        title: 'Quer etiquetar?',
        hint: 'Opcional — para organizar depois',
        type: 'custom',
        optional: true,
        render: () => <TagsInput tags={editTags} onChange={setEditTags} defaultExpanded />,
      },
      {
        id: 'dataFluxo',
        label: 'Ordem no fluxo',
        title: 'Quando aparece na lista?',
        hint: 'Opcional — só muda a posição no fluxo',
        type: 'datetime',
        optional: true,
        value: dataLancamentoLocal,
        onChange: (e) => setDataLancamentoLocal(e.target.value),
        preview: previewOrdemLancamento ? `Ordem: ${previewOrdemLancamento}` : null,
      },
      {
        id: 'pago',
        label: 'Pagamento',
        title: 'Já foi pago?',
        type: 'toggle',
        value: isPagoLocal,
        onChange: setIsPagoLocal,
        onLabel: 'Sim, já pago',
        offLabel: 'Ainda em aberto',
      },
      {
        id: 'dataPagamento',
        label: 'Data do pagamento',
        title: 'Quando foi pago?',
        type: 'date',
        hidden: !isPagoLocal,
        value: dataPagamento,
        onChange: (e) => setDataPagamento(e.target.value),
      },
      {
        id: 'conta',
        label: 'Conta',
        type: 'custom',
        hidden: !isPagoLocal,
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
        id: 'liquidacao',
        label: 'Liquidação',
        title: 'Data de liquidação',
        hint: 'Confirme quando o valor entrou na conta',
        type: 'date',
        hidden: !(isPagoOriginal && isPendente),
        value: dataLiquidacao,
        onChange: (e) => setDataLiquidacao(e.target.value),
      },
      {
        id: 'confirm',
        label: 'Confirmar',
        title: 'Está tudo certo?',
        type: 'custom',
        render: () => (
          <LancamentoResumoConfirmacao
            tipo={lancamento.tipo}
            descricao={cadDescricao}
            valorFormatado={valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            dataVencimento={cadVencimento}
            status={isPagoLocal ? 'Pago' : 'Em Aberto'}
            contaNome={contas.find((c) => c.id === contaId)?.nome}
            categoria={editCategoria}
            tags={editTags}
          />
        ),
      },
    ];
    return steps;
  }, [
    isMobile, ehLancamentoEditavel, cadDescricao, cadValor, cadVencimento, cadObs,
    editCategoria, editTags, dataLancamentoLocal, previewOrdemLancamento, isPagoLocal,
    dataPagamento, contaId, contas, isPagoOriginal, isPendente, dataLiquidacao,
    lancamento.tipo, categorias, reloadCats, valorNumerico,
  ]);

  const validateMobileEditStep = (stepId) => {
    if (stepId === 'valor' && valorNumerico <= 0) {
      toast({ title: 'Informe um valor válido', variant: 'destructive' });
      return false;
    }
    if (stepId === 'descricao' && !(cadDescricao || '').trim()) {
      toast({ title: 'Informe a descrição', variant: 'destructive' });
      return false;
    }
    if (stepId === 'conta' && isPagoLocal && !contaId) {
      toast({ title: 'Selecione uma conta', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleMobileEditNext = () => {
    const visible = mobileEditSteps.filter((s) => !s.hidden);
    const current = visible[mobileEditStep];
    if (!current) return;
    if (!validateMobileEditStep(current.id)) return;
    if (mobileEditStep >= visible.length - 1) {
      if (current.id === 'confirm') {
        handleSalvarEdicao();
      }
      return;
    }
    setMobileEditStep((i) => i + 1);
  };

  const handleMobileEditBack = () => {
    if (mobileEditStep > 0) setMobileEditStep((i) => i - 1);
    else setModoEdicao(false);
  };

  const handleMobileEditSkip = () => {
    const visible = mobileEditSteps.filter((s) => !s.hidden);
    if (mobileEditStep < visible.length - 1) setMobileEditStep((i) => i + 1);
  };

  useEffect(() => {
    if (modoEdicao) setMobileEditStep(0);
  }, [modoEdicao, lancamento.id]);

  const data = lancamento.data_pagamento || lancamento.data_vencimento;
  const competenciaAtual = (lancamento.data_vencimento || '').slice(0, 7);

  const loteRecorrenciaAmbiguo = (grupo) => {
    const refAtual = lancamento.referencia_id || '';
    const grupoId = lancamento.grupo_lancamento_id || '';
    const mesmaCompetencia = (grupo || []).filter(
      (l) =>
        (l.data_vencimento || '').slice(0, 7) === competenciaAtual &&
        l.id !== lancamento.id &&
        l.status !== 'Cancelado'
    );
    if (!mesmaCompetencia.length) return false;
    if (!refAtual || refAtual === grupoId) return true;
    return mesmaCompetencia.some(
      (l) => (l.referencia_id || '') !== refAtual || (l.referencia_tipo || '') !== (lancamento.referencia_tipo || '')
    );
  };

  const buildCadastroPayload = () => {
    const descricao = normalizeDataText((cadDescricao || '').trim()) || lancamento.descricao;
    const obs = normalizeDataText(cadObs || '');
    const venAtual = (cadVencimento || '').slice(0, 10) || (lancamento.data_vencimento || '').slice(0, 10);
    const v = valorNumerico;
    const valorLiquido = isCartaoReceber
      ? parseFloat((v * proporcaoLiquida).toFixed(2))
      : v;
    return {
      descricao,
      valor: v,
      valor_liquido: valorLiquido,
      observacoes: obs,
      data_vencimento: venAtual,
      categoria: normalizeDataText(editCategoria),
      categoria_id: editCategoriaId || '',
      tags: editTags,
    };
  };

  const buildPagamentoPayload = () => {
    const conta = contas.find((c) => c.id === contaId);
    if (isPagoLocal && !isPagoOriginal) {
      return {
        status: 'Pago',
        data_pagamento: dataPagamento,
        status_conciliacao: 'Pendente',
        conta_financeira_id: contaId,
        conta_financeira_nome: conta?.nome,
      };
    }
    if (!isPagoLocal && isPagoOriginal) {
      return {
        status: 'Em Aberto',
        data_pagamento: null,
      };
    }
    if (isPagoLocal && isPagoOriginal) {
      return {
        data_pagamento: dataPagamento,
        conta_financeira_id: contaId,
        conta_financeira_nome: conta?.nome,
      };
    }
    return {};
  };

  const finalizarSalvo = useCallback(async () => {
    await onSaved?.({ keepOpen: true });
    setModoEdicao(false);
    setConfirmDialogMode('success');
    setShowConfirmDialog(true);
  }, [onSaved]);

  const aplicarSalvarEdicao = async (escopoCadastro = 'apenas_esta', escopoPagamento = 'apenas_esta') => {
    setSaving(true);
    setConfirmDialogMode('processing');
    setShowConfirmDialog(true);

    try {
      const conta = contas.find((c) => c.id === contaId);
      const cadastroPayload = cadastroDirty ? buildCadastroPayload() : {};
      const pagamentoPayload = pagamentoDirty ? buildPagamentoPayload() : {};
      const metaPayload = metaDataLancamentoIfDirty();
      const conciliacaoPayload = conciliacaoDirty ? {
        status_conciliacao: 'Conciliado',
        data_liquidacao_efetiva: dataLiquidacao,
      } : {};

      const baseUpdate = { ...cadastroPayload, ...pagamentoPayload, ...metaPayload, ...conciliacaoPayload };

      // Pagamento recorrente em lote
      if (
        pagamentoDirty &&
        lancamento.is_recorrente &&
        lancamento.grupo_lancamento_id &&
        escopoPagamento !== 'apenas_esta' &&
        isPagoLocal &&
        !isPagoOriginal
      ) {
        const grupo = await base44.entities.LancamentoFinanceiro.filter({ grupo_lancamento_id: lancamento.grupo_lancamento_id });
        if (loteRecorrenciaAmbiguo(grupo)) {
          toast({
            title: 'Conta parecida na mesma competência. Use "apenas esta" para evitar atualização indevida.',
            variant: 'destructive',
          });
          setShowConfirmDialog(false);
          return;
        }
        const hStr = lancamento.data_vencimento || '';
        const alvos = grupo
          .filter((l) => {
            if (l.status === 'Pago') return false;
            if (escopoPagamento === 'todas') return true;
            if (escopoPagamento === 'futuras') return (l.data_vencimento || '') >= hStr;
            if (escopoPagamento === 'passadas') return (l.data_vencimento || '') <= hStr;
            return false;
          })
          .filter((l) => lancamentoMesmoRamoRecorrencia(lancamento, l));
        for (const l of alvos) {
          await base44.entities.LancamentoFinanceiro.update(l.id, {
            status: 'Pago',
            data_pagamento: dataPagamento,
            status_conciliacao: 'Pendente',
            conta_financeira_id: contaId,
            conta_financeira_nome: conta?.nome,
            ...(l.id === lancamento.id ? metaPayload : {}),
          });
        }
        await sincronizarSaldosAposAlteracao(base44, [contaId, ...alvos.map((l) => l.conta_financeira_id)]);
        toast({ title: `${alvos.length} lançamento(s) marcados como pagos!`, className: 'bg-muted text-foreground' });
        await finalizarSalvo();
        return;
      }

      // Cadastro recorrente em lote
      if (
        cadastroDirty &&
        lancamento.is_recorrente &&
        lancamento.grupo_lancamento_id &&
        escopoCadastro !== 'apenas_esta'
      ) {
        const grupo = await base44.entities.LancamentoFinanceiro.filter({
          grupo_lancamento_id: lancamento.grupo_lancamento_id,
        });
        if (loteRecorrenciaAmbiguo(grupo)) {
          toast({
            title: 'Há contas parecidas nesta competência. Para segurança, guarde só esta conta.',
            variant: 'destructive',
          });
          setShowConfirmDialog(false);
          return;
        }
        const hStr = (lancamento.data_vencimento || '').slice(0, 10);
        const alvos = (grupo || [])
          .filter((l) => {
            if (l.status === 'Pago') return false;
            if (escopoCadastro === 'todas') return true;
            if (escopoCadastro === 'futuras') return (l.data_vencimento || '').slice(0, 10) >= hStr;
            return false;
          })
          .filter((l) => lancamentoMesmoRamoRecorrencia(lancamento, l));

        for (const l of alvos) {
          const novaData =
            l.id === lancamento.id
              ? cadastroPayload.data_vencimento
              : vencimentoComMesmoDiaNoMes(cadVencimento || l.data_vencimento, l.data_vencimento);
          await base44.entities.LancamentoFinanceiro.update(l.id, {
            ...cadastroPayload,
            ...(l.id === lancamento.id ? metaPayload : {}),
            data_vencimento: novaData,
          });
        }
        toast({ title: `${alvos.length} lançamento(s) atualizados`, className: 'bg-muted text-foreground' });
        await finalizarSalvo();
        return;
      }

      // Atualização simples deste lançamento
      if (Object.keys(baseUpdate).length > 0) {
        let updated = await base44.entities.LancamentoFinanceiro.update(lancamento.id, baseUpdate);

        if (metaPayload.codigo_lancamento && !ordemLancamentoFoiPersistida(updated, metaPayload.codigo_lancamento)) {
          updated = await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
            tags: metaPayload.tags,
          });
        }

        if (pagamentoDirty || houveAlteracaoValor) {
          await sincronizarSaldosAposAlteracao(base44, [contaId, lancamento.conta_financeira_id]);
        }

        if (dataLancamentoDirty) {
          const salvo = resolverDataLancamentoInput(updated) || dataLancamentoLocal;
          setDataLancamentoBase(salvo);
          setDataLancamentoLocal(salvo);
        }
      }

      toast({ title: 'Lançamento atualizado!', className: 'bg-muted text-foreground' });
      if (lancamento.tipo !== 'Transferência') {
        gravarPreferenciasLancamento(lancamento.tipo, {
          contaId,
          categoria: normalizeDataText(editCategoria),
          categoriaId: editCategoriaId,
        });
      }
      await finalizarSalvo();
    } catch {
      toast({ title: 'Não foi possível guardar', variant: 'destructive' });
      setShowConfirmDialog(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSalvarEdicao = async () => {
    if (valorNumerico <= 0) {
      toast({ title: 'Informe um valor válido', variant: 'destructive' });
      return;
    }
    if (isPagoLocal && !contaId) {
      toast({ title: 'Selecione uma conta', variant: 'destructive' });
      return;
    }
    if (!formDirty) {
      toast({ title: 'Nada foi alterado', className: 'bg-muted text-foreground' });
      return;
    }

    if (
      pagamentoDirty &&
      lancamento.is_recorrente &&
      lancamento.grupo_lancamento_id &&
      isPagoLocal &&
      !isPagoOriginal
    ) {
      setShowEscopo(true);
      return;
    }

    if (
      cadastroDirty &&
      lancamento.is_recorrente &&
      lancamento.grupo_lancamento_id
    ) {
      setShowEscopoCadastro(true);
      return;
    }

    await aplicarSalvarEdicao('apenas_esta', 'apenas_esta');
  };

  const handleRestaurar = async () => {
    setSaving(true);
    const statusAnterior = lancamento.referencia_tipo === 'MovimentosCaixa' ? 'Em Aberto' : lancamento.data_pagamento ? 'Pago' : 'Em Aberto';
    await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
      status: statusAnterior,
      observacoes: (lancamento.observacoes || '').replace(/\[CANCELADO.*?\]/gs, '').trim()
    });
    toast({ title: 'Lançamento restaurado!', className: 'bg-muted text-foreground' });
    onSaved?.();
    setSaving(false);
  };

  const tagsVisiveis = tagsVisiveisFinanceiro(lancamento.tags);

  let Icon = ArrowRightLeft;
  let iconClass = 'text-muted-foreground';
  if (!isTransf) {
    Icon = isReceita ? ArrowDownLeft : ArrowUpRight;
    iconClass = isPagoOriginal ? (isReceita ? 'text-green-500' : 'text-red-500') : 'text-muted-foreground';
  }

  return (
    <>
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={`flex max-h-[min(92vh,44rem)] min-h-0 w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 dark:border-border/40 dark:bg-background sm:max-w-sm [&~div[data-radix-dialog-overlay]]:bg-card/30 [&~div[data-radix-dialog-overlay]]:backdrop-blur-sm [&~div[data-radix-dialog-overlay]]:dark:bg-black/30 ${isMobile && modoEdicao ? 'max-w-md sm:max-w-md' : ''}`}>

        <div className="shrink-0">
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <p className="text-sm font-semibold text-foreground leading-snug flex-1 pr-3">
            {modoEdicao ? 'Editar lançamento' : lancamento.descricao}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {ehLancamentoEditavel && (
              <button
                type="button"
                onClick={() => setModoEdicao((v) => !v)}
                className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${modoEdicao ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                title={modoEdicao ? 'Modo visualização' : 'Editar'}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={onClose} className="w-7 h-7 flex-none flex items-center justify-center rounded-full bg-muted text-muted-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-4 flex items-center gap-3">
          <span className="w-10 h-10 flex-none rounded-xl bg-muted flex items-center justify-center">
            <Icon className={`w-5 h-5 ${iconClass}`} />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-2xl font-bold text-foreground">
                {isTransf ? '' : isReceita ? '+' : '−'}{R(modoEdicao ? valorNumerico : lancamento.valor)}
              </p>
              {lancamento.is_recorrente && lancamento.data_vencimento && (
                <span className="text-[0.65rem] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                  {mesAnoLabel(lancamento.data_vencimento)}
                </span>
              )}
            </div>
            {!modoEdicao && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {lancamento.categoria || 'Sem categoria'}
                {lancamento.conta_financeira_nome ? ` · ${lancamento.conta_financeira_nome}` : ''}
                {data ? ` · ${formatarSoData(data)}` : ''}
              </p>
            )}
          </div>
        </div>

        {!modoEdicao && tagsVisiveis.length > 0 && (
          <div className="flex gap-1.5 px-5 pb-3 flex-wrap">
            {tagsVisiveis.map((t) => (
              <span key={t} className="text-[0.65rem] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        )}

        <div className="flex gap-2 px-5 pb-4 flex-wrap">
          {lancamento.referencia_numero && (
            <span className="text-[0.65rem] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              Ref: {lancamento.referencia_numero}
            </span>
          )}
          {isPendente && (
            <span className="flex items-center gap-1 text-[0.65rem] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              <Clock className="w-2.5 h-2.5" /> Aguard. Conciliação
            </span>
          )}
          {modoEdicao && (
            <span className="text-[0.65rem] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              Modo edição
            </span>
          )}
        </div>

        <div className="h-px bg-muted" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">

        {isMobile && modoEdicao && ehLancamentoEditavel ? (
          <div className="px-4 py-2 min-h-[min(60vh,28rem)] flex flex-col">
            <MobileCampoFlow
              steps={mobileEditSteps}
              stepIndex={mobileEditStep}
              onStepIndexChange={setMobileEditStep}
              onBack={handleMobileEditBack}
              onNext={handleMobileEditNext}
              onSkip={handleMobileEditSkip}
              showSkip={!!mobileEditSteps.filter((s) => !s.hidden)[mobileEditStep]?.optional}
              finishLabel={saving ? 'A guardar…' : 'Guardar alterações'}
              nextLabel="Próximo"
            />
          </div>
        ) : (
        <>
        {ehLancamentoEditavel && modoEdicao && (
          <div className="px-5 pt-4 space-y-3">
            <p className="text-xs font-medium text-foreground/90">Dados do lançamento</p>
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Descrição</p>
              <input
                autoComplete="off"
                value={cadDescricao}
                onChange={createUppercaseInputChangeHandler((e) => setCadDescricao(e.target.value))}
                className={`${inputClass(true)} p38-data-uppercase`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Vencimento</p>
                <input
                  autoComplete="off"
                  type="date"
                  value={cadVencimento}
                  onChange={(e) => setCadVencimento(e.target.value)}
                  className={inputClass(true)}
                />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Valor</p>
                <input
                  autoComplete="off"
                  type="number"
                  step="0.01"
                  min="0"
                  value={cadValor}
                  onChange={(e) => setCadValor(e.target.value)}
                  className={inputClass(true)}
                />
              </div>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Observações</p>
              <textarea
                value={cadObs}
                onChange={createUppercaseInputChangeHandler((e) => setCadObs(e.target.value))}
                rows={2}
                className={`w-full resize-none rounded-xl bg-muted px-3 py-2 text-sm text-foreground border-0 outline-none focus:ring-2 focus:ring-border/40 dark:focus:ring-ring p38-data-uppercase`}
              />
            </div>

            <SeletorCategoria
              tipo={lancamento.tipo}
              value={editCategoria}
              onChange={(nome, id) => { setEditCategoria(nome); setEditCategoriaId(id || ''); }}
              categorias={categorias}
              onCriada={reloadCats}
            />

            <TagsInput tags={editTags} onChange={setEditTags} defaultExpanded={editTags.length > 0} />
          </div>
        )}

        {!isCancelado && (
          <div className="px-5 pt-4 space-y-2">
            <p className="text-xs font-medium text-foreground/90">Quando aparece na lista?</p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Opcional — define a posição deste lançamento no fluxo (não é a data de pagamento).
            </p>
            {modoEdicao ? (
              <>
                <input
                  autoComplete="off"
                  type="datetime-local"
                  value={dataLancamentoLocal}
                  onChange={(e) => setDataLancamentoLocal(e.target.value)}
                  className={inputClass(true)}
                />
                {previewOrdemLancamento && (
                  <p className="text-[11px] text-muted-foreground">
                    Ordem: <span className="font-mono text-foreground/80">{previewOrdemLancamento}</span>
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-foreground">
                {dataLancamentoLocal
                  ? formatarSoData(datetimeLocalParaISO(dataLancamentoLocal) || dataLancamentoLocal)
                  : 'Automática'}
              </p>
            )}
          </div>
        )}

        {!isCancelado && ehLancamentoEditavel && <div className="h-px bg-muted mx-5 my-4" />}

        {!isTransf && !isCancelado && (
          <div className="px-5 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground/90">Marcar como pago</p>
                <p className="text-xs text-muted-foreground">{isPagoLocal ? 'Pago' : 'Em aberto'}</p>
              </div>
              <Toggle checked={isPagoLocal} onChange={setIsPagoLocal} disabled={!modoEdicao} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Data</p>
                <input
                  autoComplete="off"
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  disabled={!modoEdicao || !isPagoLocal}
                  className={`w-full h-9 px-3 text-sm rounded-xl bg-muted text-foreground border-0 outline-none focus:ring-2 focus:ring-border/40 dark:focus:ring-ring ${!modoEdicao || !isPagoLocal ? 'opacity-40 cursor-not-allowed' : ''}`}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Conta</p>
                <Select value={contaId} onValueChange={setContaId} disabled={!modoEdicao || !isPagoLocal}>
                  <SelectTrigger className={`h-9 text-sm bg-muted border-0 rounded-xl text-foreground focus:ring-2 focus:ring-border/40 ${!modoEdicao || !isPagoLocal ? 'opacity-40' : ''}`}>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-muted dark:border-border/40">
                    {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {isPagoOriginal && isPendente && !isCancelado && modoEdicao && (
          <>
            <div className="h-px bg-muted mx-5" />
            <div className="px-5 py-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground/90">Conciliar</p>
                <p className="text-xs text-muted-foreground">Confirmar data de liquidação</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Data de liquidação</p>
                <input
                  autoComplete="off"
                  type="date"
                  value={dataLiquidacao}
                  onChange={(e) => setDataLiquidacao(e.target.value)}
                  className={inputClass(true)}
                />
              </div>
            </div>
          </>
        )}

        {modoEdicao && ehLancamentoEditavel && !isMobile && (
          <div className="px-5 py-4">
            <button
              type="button"
              onClick={handleSalvarEdicao}
              disabled={saving}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-primary dark:bg-muted text-white dark:text-foreground text-base font-semibold active:scale-95 transition-transform disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? 'A guardar…' : 'Salvar alterações'}
            </button>
          </div>
        )}

        {isCancelado && (
          <>
            <div className="h-px bg-muted" />
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50/50 border border-border/40">
                <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Cancelado</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Este lançamento foi cancelado e não contribui para cálculos de saldo.</p>
                  {lancamento.observacoes && (
                    <p className="text-xs text-muted-foreground mt-1.5 font-medium">Motivo: {lancamento.observacoes.replace(/\[CANCELADO.*?\]/gs, '').trim()}</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleRestaurar}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 dark:bg-blue-700 text-white text-sm font-medium active:scale-95 transition-transform disabled:opacity-50">
                <RotateCcw className="w-4 h-4" />
                Restaurar Lançamento
              </button>
            </div>
          </>
        )}

        </>
        )}

        </div>

        <div className="shrink-0 border-t border-border/40 bg-muted/40/90 dark:border-border/40 dark:bg-background/95">
        <div className="h-px bg-muted" />
        <div className="px-5 py-4 flex items-center justify-between gap-3">
          {!isCancelado && (
            <button
              onClick={() => setShowCancelarDialog(true)}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Cancelar
            </button>
          )}
          <div className="flex items-center justify-end gap-3 flex-1">
          {lancamento.pedido_compra_vinculado_id && (
            <AnexosPanel
              referenciaId={lancamento.pedido_compra_vinculado_id}
              referenciaTipo="PedidoCompra"
              referenciaNumero={lancamento.pedido_compra_vinculado_numero}
              inline
            />
          )}
          <AnexosPanel
           referenciaId={lancamento.id}
           referenciaTipo="LancamentoFinanceiro"
           referenciaNumero={lancamento.descricao}
           inline
          />
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>

    <RecorrenciaEscopoDialog
      open={showEscopo}
      onClose={() => { setShowEscopo(false); setSaving(false); }}
      onConfirm={(escopo) => {
        setShowEscopo(false);
        setPendingEscopoPagamento(escopo);
        if (cadastroDirty && lancamento.is_recorrente && lancamento.grupo_lancamento_id) {
          setShowEscopoCadastro(true);
          return;
        }
        aplicarSalvarEdicao('apenas_esta', escopo);
      }}
    />
    <RecorrenciaEscopoDialog
      mode="cadastro"
      open={showEscopoCadastro}
      onClose={() => setShowEscopoCadastro(false)}
      onConfirm={(escopo) => {
        setShowEscopoCadastro(false);
        aplicarSalvarEdicao(escopo, pendingEscopoPagamento);
      }}
    />

    <CancelarLancamentoDialog
      lancamento={lancamento}
      isOpen={showCancelarDialog}
      onClose={() => setShowCancelarDialog(false)}
      onSuccess={() => {
        setShowCancelarDialog(false);
        onSaved?.();
      }}
    />

    <LancamentoConfirmacaoDialog
      open={showConfirmDialog}
      mode={confirmDialogMode}
      successTitle="Alterações guardadas"
      successMessage="Deseja cadastrar outro lançamento?"
      onCreateAnother={() => {
        setShowConfirmDialog(false);
        onSaved?.({ createAnother: true });
        onClose();
      }}
      onFinish={() => {
        setShowConfirmDialog(false);
        onClose();
      }}
    />

    </>
  );
}
