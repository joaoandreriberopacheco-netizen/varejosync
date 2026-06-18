import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatarSoData, dataHoje, toLocalDateKey, vencimentoComMesmoDiaNoMes } from '@/components/utils/dateUtils';

const mesAnoLabel = (dataStr) => {
  if (!dataStr) return '';
  const s = typeof dataStr === 'string' && dataStr.length >= 7 ? dataStr : toLocalDateKey(dataStr);
  const meses = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const [y, m] = s.split('-');
  return `${meses[parseInt(m,10)-1]}/${y}`;
};
import { CheckCircle2, Clock, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, X, Save, RotateCcw, AlertCircle, Trash2, Loader2 } from 'lucide-react';
import CancelarLancamentoDialog from './CancelarLancamentoDialog';
import { useToast } from '@/components/ui/use-toast';
import AnexosPanel from '@/components/anexos/AnexosPanel';
import RecorrenciaEscopoDialog from './RecorrenciaEscopoDialog';
import { lancamentoMesmoRamoRecorrencia } from '@/lib/agefinLancamentosRecorrencia';

const R = (v) => `R$ ${Math.abs(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

import { isLancamentoPago } from '@/lib/lancamentoFinanceiroStatus';
import { sincronizarSaldosAposAlteracao } from '@/lib/sincronizarSaldoContasFinanceiras';

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-none ${checked ? 'bg-primary dark:bg-muted' : 'bg-muted dark:bg-muted'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-card shadow transform transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function LancamentoDetalheDialog({ lancamento, contas, onClose, onSaved }) {
  const [contaId, setContaId] = useState(lancamento.conta_financeira_id || '');
  const [valorEditavel, setValorEditavel] = useState(String(lancamento.valor || ''));
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
  const [pendingSave, setPendingSave] = useState(null);
  const [showCancelarDialog, setShowCancelarDialog] = useState(false);
  const [cadDescricao, setCadDescricao] = useState(lancamento.descricao || '');
  const [cadVencimento, setCadVencimento] = useState((lancamento.data_vencimento || '').slice(0, 10));
  const [cadValor, setCadValor] = useState(String(lancamento.valor ?? ''));
  const [cadObs, setCadObs] = useState(lancamento.observacoes || '');
  const { toast } = useToast();
  const isCancelado = lancamento.status === 'Cancelado';
  const isReceita = lancamento.tipo === 'Receita';
  const isTransf = lancamento.tipo === 'Transferência';
  const ehDespesaEditavel = lancamento.tipo === 'Despesa' && !isTransf && !isCancelado;

  const cadastroDirty = useMemo(() => {
    if (!ehDespesaEditavel) return false;
    const d0 = (lancamento.descricao || '').trim();
    const d1 = (cadDescricao || '').trim();
    const v0 = Number(lancamento.valor ?? 0);
    const v1 = parseFloat(String(cadValor).replace(',', '.')) || 0;
    const ven0 = (lancamento.data_vencimento || '').slice(0, 10);
    const ven1 = (cadVencimento || '').slice(0, 10);
    const obs0 = lancamento.observacoes || '';
    const obs1 = cadObs || '';
    return (
      d0 !== d1 ||
      ven0 !== ven1 ||
      Math.abs(v0 - v1) > 0.009 ||
      obs0 !== obs1
    );
  }, [
    ehDespesaEditavel,
    lancamento.descricao,
    lancamento.valor,
    lancamento.data_vencimento,
    lancamento.observacoes,
    cadDescricao,
    cadVencimento,
    cadValor,
    cadObs,
  ]);

  useEffect(() => {
    setCadDescricao(lancamento.descricao || '');
    setCadVencimento((lancamento.data_vencimento || '').slice(0, 10));
    setCadValor(String(lancamento.valor ?? ''));
    setCadObs(lancamento.observacoes || '');
  }, [
    lancamento.id,
    lancamento.descricao,
    lancamento.data_vencimento,
    lancamento.valor,
    lancamento.observacoes,
  ]);

  const isPagoOriginal = isLancamentoPago(lancamento);
  const isPendente = lancamento.status_conciliacao === 'Pendente';
  const isCartaoReceber = isReceita && ['Cartão Débito', 'Cartão Crédito'].includes(lancamento.forma_pagamento_tipo);
  const valorNumerico = parseFloat(valorEditavel) || 0;
  const valorLiquidoOriginal = parseFloat(lancamento.valor_liquido ?? lancamento.valor) || 0;
  const proporcaoLiquida = (lancamento.valor || 0) > 0 ? valorLiquidoOriginal / lancamento.valor : 1;
  const houveAlteracaoValor = isCartaoReceber && Math.abs(valorNumerico - (parseFloat(lancamento.valor) || 0)) > 0.009;
  const payloadValor = houveAlteracaoValor ? {
    valor: valorNumerico,
    valor_liquido: parseFloat((valorNumerico * proporcaoLiquida).toFixed(2)),
  } : {};
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
    // Se não há referência forte (ou está no modo série automática por grupo),
    // não dá para distinguir com segurança duas obrigações parecidas no mesmo mês.
    if (!refAtual || refAtual === grupoId) return true;
    return mesmaCompetencia.some(
      (l) => (l.referencia_id || '') !== refAtual || (l.referencia_tipo || '') !== (lancamento.referencia_tipo || '')
    );
  };

  // Aplica pagamento com escopo de recorrência
  const aplicarPagamento = async (escopo = 'apenas_esta') => {
    setSaving(true);
    const conta = contas.find((c) => c.id === contaId);

    if (lancamento.is_recorrente && lancamento.grupo_lancamento_id && escopo !== 'apenas_esta') {
      // Buscar todos do grupo
      const grupo = await base44.entities.LancamentoFinanceiro.filter({ grupo_lancamento_id: lancamento.grupo_lancamento_id });
      if (loteRecorrenciaAmbiguo(grupo)) {
        toast({
          title: 'Conta parecida na mesma competência. Use "apenas esta" para evitar atualização indevida.',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }
      const hStr = lancamento.data_vencimento || '';
      const alvos = grupo
        .filter((l) => {
          if (l.status === 'Pago') return false;
          if (escopo === 'todas') return true;
          if (escopo === 'futuras') return (l.data_vencimento || '') >= hStr;
          if (escopo === 'passadas') return (l.data_vencimento || '') <= hStr;
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
        });
      }
      await sincronizarSaldosAposAlteracao(base44, [
        contaId,
        ...alvos.map((l) => l.conta_financeira_id),
      ]);
      toast({ title: `${alvos.length} lançamento(s) marcados como pagos!`, className: 'bg-muted text-foreground' });
      onSaved?.();
      setSaving(false);
      return;
    }

    // Salvar apenas este
    if (isPagoLocal && !isPagoOriginal) {
      await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
        ...payloadValor,
        status: 'Pago', data_pagamento: dataPagamento,
        status_conciliacao: 'Pendente',
        conta_financeira_id: contaId, conta_financeira_nome: conta?.nome,
      });
      await sincronizarSaldosAposAlteracao(base44, [contaId, lancamento.conta_financeira_id]);
      toast({ title: 'Pagamento registrado!', className: 'bg-muted text-foreground' });
    } else if (!isPagoLocal && isPagoOriginal) {
      await base44.entities.LancamentoFinanceiro.update(lancamento.id, { ...payloadValor, status: 'Em Aberto', data_pagamento: null });
      await sincronizarSaldosAposAlteracao(base44, [conta?.id, lancamento.conta_financeira_id]);
      toast({ title: 'Marcado como em aberto', className: 'bg-muted text-foreground' });
    } else if (isPagoLocal && isPagoOriginal) {
      await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
        ...payloadValor,
        data_pagamento: dataPagamento, conta_financeira_id: contaId, conta_financeira_nome: conta?.nome,
      });
      toast({ title: 'Dados atualizados!', className: 'bg-muted text-foreground' });
    } else if (houveAlteracaoValor) {
      await base44.entities.LancamentoFinanceiro.update(lancamento.id, payloadValor);
      toast({ title: 'Valor atualizado!', className: 'bg-muted text-foreground' });
    }
    onSaved?.();
    setSaving(false);
  };

  const handleSalvarPagamento = async () => {
    if (isPagoLocal && !contaId) {
      toast({ title: 'Selecione uma conta', variant: 'destructive' });
      return;
    }
    if (isCartaoReceber && valorNumerico <= 0) {
      toast({ title: 'Informe um valor válido', variant: 'destructive' });
      return;
    }
    // Se recorrente e marcando como pago, perguntar escopo
    if (lancamento.is_recorrente && lancamento.grupo_lancamento_id && isPagoLocal && !isPagoOriginal) {
      setPendingSave(true);
      setShowEscopo(true);
      return;
    }
    await aplicarPagamento('apenas_esta');
  };

  const handleConciliar = async () => {
    setSaving(true);
    await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
      status_conciliacao: 'Conciliado',
      data_liquidacao_efetiva: dataLiquidacao
    });
    toast({ title: 'Lançamento conciliado!', className: 'bg-muted text-foreground' });
    onSaved?.();
    setSaving(false);
  };

  const handleRestaurar = async () => {
    setSaving(true);
    // Restaurar o status original (antes do cancelamento)
    const statusAnterior = lancamento.referencia_tipo === 'MovimentosCaixa' ? 'Em Aberto' : lancamento.data_pagamento ? 'Pago' : 'Em Aberto';
    await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
      status: statusAnterior,
      observacoes: (lancamento.observacoes || '').replace(/\[CANCELADO.*?\]/gs, '').trim()
    });
    toast({ title: 'Lançamento restaurado!', className: 'bg-muted text-foreground' });
    onSaved?.();
    setSaving(false);
  };

  const aplicarCadastroComEscopo = async (escopo = 'apenas_esta') => {
    setSaving(true);
    try {
      const v = parseFloat(String(cadValor).replace(',', '.')) || 0;
      if (v <= 0) {
        toast({ title: 'Informe um valor válido', variant: 'destructive' });
        return;
      }
      const descricao = (cadDescricao || '').trim() || lancamento.descricao;
      const obs = cadObs || '';
      const venAtual = (cadVencimento || '').slice(0, 10) || (lancamento.data_vencimento || '').slice(0, 10);
      const basePayload = {
        descricao,
        valor: v,
        valor_liquido: v,
        observacoes: obs,
      };

      if (!lancamento.is_recorrente || !lancamento.grupo_lancamento_id || escopo === 'apenas_esta') {
        await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
          ...basePayload,
          data_vencimento: venAtual || lancamento.data_vencimento,
        });
        toast({ title: 'Dados da conta atualizados', className: 'bg-muted text-foreground' });
        onSaved?.();
        return;
      }

      const grupo = await base44.entities.LancamentoFinanceiro.filter({
        grupo_lancamento_id: lancamento.grupo_lancamento_id,
      });
      if (loteRecorrenciaAmbiguo(grupo)) {
        toast({
          title: 'Há contas parecidas nesta competência. Para segurança, guarde só esta conta.',
          variant: 'destructive',
        });
        return;
      }
      const hStr = (lancamento.data_vencimento || '').slice(0, 10);
      const alvos = (grupo || [])
        .filter((l) => {
          if (l.status === 'Pago') return false;
          if (escopo === 'todas') return true;
          if (escopo === 'futuras') return (l.data_vencimento || '').slice(0, 10) >= hStr;
          return false;
        })
        .filter((l) => lancamentoMesmoRamoRecorrencia(lancamento, l));

      for (const l of alvos) {
        const novaData =
          l.id === lancamento.id
            ? venAtual || (l.data_vencimento || '').slice(0, 10)
            : vencimentoComMesmoDiaNoMes(cadVencimento || l.data_vencimento, l.data_vencimento);
        await base44.entities.LancamentoFinanceiro.update(l.id, {
          ...basePayload,
          data_vencimento: novaData,
        });
      }
      toast({
        title: `${alvos.length} lançamento(s) atualizados`,
        className: 'bg-muted text-foreground',
      });
      onSaved?.();
    } catch {
      toast({ title: 'Não foi possível guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSalvarCadastro = async () => {
    const v = parseFloat(String(cadValor).replace(',', '.')) || 0;
    if (v <= 0) {
      toast({ title: 'Informe um valor válido', variant: 'destructive' });
      return;
    }
    if (!cadastroDirty) {
      toast({ title: 'Nada foi alterado', className: 'bg-muted text-foreground' });
      return;
    }
    if (lancamento.is_recorrente && lancamento.grupo_lancamento_id) {
      setShowEscopoCadastro(true);
      return;
    }
    await aplicarCadastroComEscopo('apenas_esta');
  };

  let Icon = ArrowRightLeft;
  let iconClass = 'text-muted-foreground';
  if (!isTransf) {
    Icon = isReceita ? ArrowDownLeft : ArrowUpRight;
    iconClass = isPagoOriginal ? (isReceita ? 'text-green-500' : 'text-red-500') : 'text-muted-foreground';
  }

  return (
    <>
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[min(92vh,44rem)] min-h-0 w-[calc(100vw-1rem)] max-w-sm flex-col gap-0 overflow-hidden rounded-2xl p-0 dark:border-border/40 dark:bg-background sm:max-w-sm [&~div[data-radix-dialog-overlay]]:bg-card/30 [&~div[data-radix-dialog-overlay]]:backdrop-blur-sm [&~div[data-radix-dialog-overlay]]:dark:bg-black/30">

        <div className="shrink-0">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <p className="text-sm font-semibold text-foreground leading-snug flex-1 pr-3">{lancamento.descricao}</p>
          <button onClick={onClose} className="w-7 h-7 flex-none flex items-center justify-center rounded-full bg-muted text-muted-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Valor principal */}
        <div className="px-5 pb-4 flex items-center gap-3">
          <span className="w-10 h-10 flex-none rounded-xl bg-muted flex items-center justify-center">
            <Icon className={`w-5 h-5 ${iconClass}`} />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-2xl font-bold text-foreground">
                {isTransf ? '' : isReceita ? '+' : '−'}{R(lancamento.valor)}
              </p>
              {lancamento.is_recorrente && lancamento.data_vencimento && (
                <span className="text-[0.65rem] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                  {mesAnoLabel(lancamento.data_vencimento)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lancamento.categoria || 'Sem categoria'}
              {lancamento.conta_financeira_nome ? ` · ${lancamento.conta_financeira_nome}` : ''}
              {data ? ` · ${formatarSoData(data)}` : ''}
            </p>
          </div>
        </div>

        {/* Status chips */}
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
        </div>

        <div className="h-px bg-muted" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]">

        {ehDespesaEditavel && (
          <>
            <div className="px-5 pt-4 space-y-3">
              <p className="text-xs font-medium text-foreground/90">Editar conta a pagar</p>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Inclui lançamentos criados por importação de PDF. Alterar vencimento ou valor não regista pagamento.
              </p>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Descrição</p>
                <input
                  autoComplete="off"
                  value={cadDescricao}
                  onChange={(e) => setCadDescricao(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-xl bg-muted text-foreground border-0 outline-none focus:ring-2 focus:ring-border/40 dark:focus:ring-ring"
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
                    className="w-full h-10 px-2 text-sm rounded-xl bg-muted text-foreground border-0 outline-none focus:ring-2 focus:ring-border/40 dark:focus:ring-ring"
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
                    className="w-full h-10 px-3 text-sm rounded-xl bg-muted text-foreground border-0 outline-none focus:ring-2 focus:ring-border/40 dark:focus:ring-ring"
                  />
                </div>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Observações</p>
                <textarea
                  value={cadObs}
                  onChange={(e) => setCadObs(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-xl bg-muted px-3 py-2 text-sm text-foreground border-0 outline-none focus:ring-2 focus:ring-border/40 dark:focus:ring-ring"
                />
              </div>
              <button
                type="button"
                onClick={handleSalvarCadastro}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary dark:bg-muted text-white dark:text-foreground text-sm font-semibold active:scale-[0.99] transition-transform disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'A guardar…' : 'Guardar alterações'}
              </button>
            </div>
            <div className="h-px bg-muted" />
          </>
        )}

        {isCartaoReceber && !isCancelado && (
          <div className="px-5 pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Valor a receber</p>
            <input autoComplete="off"
              type="number"
              step="0.01"
              min="0"
              value={valorEditavel}
              onChange={(e) => setValorEditavel(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-xl bg-muted text-foreground border-0 outline-none focus:ring-2 focus:ring-border/40 dark:focus:ring-ring"
            />
          </div>
        )}

        {/* Seção: Marcar como pago */}
        {!isTransf && !isCancelado && (
          <div className="px-5 py-4 space-y-4">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground/90">Marcar como pago</p>
                <p className="text-xs text-muted-foreground">{isPagoLocal ? 'Pago' : 'Em aberto'}</p>
              </div>
              <Toggle checked={isPagoLocal} onChange={setIsPagoLocal} />
            </div>

            {/* Campos Data e Conta */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Data</p>
                <input autoComplete="off"
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  disabled={!isPagoLocal}
                  className="w-full h-9 px-3 text-sm rounded-xl bg-muted text-foreground border-0 outline-none focus:ring-2 focus:ring-border/40 dark:focus:ring-ring disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Conta</p>
                <Select value={contaId} onValueChange={setContaId}>
                  <SelectTrigger className="h-9 text-sm bg-muted border-0 rounded-xl text-foreground focus:ring-2 focus:ring-border/40">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-muted dark:border-border/40">
                    {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botão Salvar — PDV style */}
            <button
              onClick={handleSalvarPagamento}
              disabled={saving}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-background dark:bg-muted text-white dark:text-foreground text-base font-semibold active:scale-95 transition-transform disabled:opacity-50">
              <Save className="w-5 h-5" />
              Salvar
            </button>
          </div>
        )}

        {/* Cancelado - Detalhes e Ações */}
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

        {/* Conciliar (se pago e pendente) */}
        {isPagoOriginal && isPendente && !isCancelado && (
          <>
            <div className="h-px bg-muted" />
            <div className="px-5 py-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground/90">Conciliar</p>
                <p className="text-xs text-muted-foreground">Confirmar data de liquidação</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Data de liquidação</p>
                <input autoComplete="off"
                  type="date"
                  value={dataLiquidacao}
                  onChange={(e) => setDataLiquidacao(e.target.value)}
                  className="w-full h-9 px-3 text-sm rounded-xl bg-muted text-foreground border-0 outline-none focus:ring-2 focus:ring-border/40 dark:focus:ring-ring"
                />
              </div>
              <button
                onClick={handleConciliar}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary dark:bg-muted text-white dark:text-foreground text-sm font-medium active:scale-95 transition-transform disabled:opacity-50">
                <CheckCircle2 className="w-4 h-4" />
                Salvar Conciliação
              </button>
            </div>
          </>
        )}

        </div>

        {/* Footer: clipe + botão cancelar */}
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
      onClose={() => { setShowEscopo(false); setPendingSave(null); setSaving(false); }}
      onConfirm={(escopo) => aplicarPagamento(escopo)}
    />
    <RecorrenciaEscopoDialog
      mode="cadastro"
      open={showEscopoCadastro}
      onClose={() => setShowEscopoCadastro(false)}
      onConfirm={(escopo) => aplicarCadastroComEscopo(escopo)}
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

    </>
    
  );
}