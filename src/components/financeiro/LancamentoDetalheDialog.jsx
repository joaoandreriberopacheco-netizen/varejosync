import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, X, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import AnexosPanel from '@/components/anexos/AnexosPanel';

const R = (v) => `R$ ${Math.abs(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none flex-none ${checked ? 'bg-gray-800 dark:bg-gray-200' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function LancamentoDetalheDialog({ lancamento, contas, onClose, onSaved }) {
  const [contaId, setContaId] = useState(lancamento.conta_financeira_id || '');
  const [dataPagamento, setDataPagamento] = useState(
    lancamento.data_pagamento
      ? format(new Date(lancamento.data_pagamento), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd')
  );
  const [dataLiquidacao, setDataLiquidacao] = useState(
    lancamento.data_pagamento
      ? format(new Date(lancamento.data_pagamento), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd')
  );
  const [isPagoLocal, setIsPagoLocal] = useState(lancamento.status === 'Pago');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const isReceita = lancamento.tipo === 'Receita';
  const isTransf = lancamento.tipo === 'Transferência';
  const isPagoOriginal = lancamento.status === 'Pago';
  const isPendente = lancamento.status_conciliacao === 'Pendente';
  const data = lancamento.data_pagamento || lancamento.data_vencimento;

  const handleSalvarPagamento = async () => {
    if (isPagoLocal && !contaId) {
      toast({ title: 'Selecione uma conta', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const conta = contas.find((c) => c.id === contaId);

    if (isPagoLocal && !isPagoOriginal) {
      // Marcar como pago
      await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
        status: 'Pago',
        data_pagamento: dataPagamento,
        status_conciliacao: 'Pendente',
        conta_financeira_id: contaId,
        conta_financeira_nome: conta?.nome
      });
      if (conta) {
        const delta = isReceita ? lancamento.valor || 0 : -(lancamento.valor || 0);
        await base44.entities.ContasFinanceiras.update(contaId, { saldo_atual: (conta.saldo_atual || 0) + delta });
      }
      toast({ title: 'Pagamento registrado!', className: 'bg-gray-100 text-gray-800' });
    } else if (!isPagoLocal && isPagoOriginal) {
      // Reverter para em aberto
      await base44.entities.LancamentoFinanceiro.update(lancamento.id, { status: 'Em Aberto' });
      toast({ title: 'Marcado como em aberto', className: 'bg-gray-100 text-gray-800' });
    } else if (isPagoLocal && isPagoOriginal) {
      // Atualizar data/conta
      await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
        data_pagamento: dataPagamento,
        conta_financeira_id: contaId,
        conta_financeira_nome: conta?.nome
      });
      toast({ title: 'Dados atualizados!', className: 'bg-gray-100 text-gray-800' });
    }

    onSaved?.();
    setSaving(false);
  };

  const handleConciliar = async () => {
    setSaving(true);
    await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
      status_conciliacao: 'Conciliado',
      data_liquidacao_efetiva: dataLiquidacao
    });
    toast({ title: 'Lançamento conciliado!', className: 'bg-gray-100 text-gray-800' });
    onSaved?.();
    setSaving(false);
  };

  let Icon = ArrowRightLeft;
  let iconClass = 'text-gray-400';
  if (!isTransf) {
    Icon = isReceita ? ArrowDownLeft : ArrowUpRight;
    iconClass = isPagoOriginal ? (isReceita ? 'text-green-500' : 'text-red-500') : 'text-gray-400';
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm p-0 gap-0 dark:bg-gray-900 dark:border-gray-700 overflow-hidden rounded-2xl [&~div[data-radix-dialog-overlay]]:bg-white/30 [&~div[data-radix-dialog-overlay]]:backdrop-blur-sm [&~div[data-radix-dialog-overlay]]:dark:bg-black/30">

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug flex-1 pr-3">{lancamento.descricao}</p>
          <button onClick={onClose} className="w-7 h-7 flex-none flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Valor principal */}
        <div className="px-5 pb-4 flex items-center gap-3">
          <span className="w-10 h-10 flex-none rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Icon className={`w-5 h-5 ${iconClass}`} />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {isTransf ? '' : isReceita ? '+' : '−'}{R(lancamento.valor)}
              </p>
              {lancamento.is_recorrente && lancamento.data_vencimento && (
                <span className="text-[0.65rem] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
                  {format(new Date(lancamento.data_vencimento), "MMM/yyyy", { locale: ptBR }).toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {lancamento.categoria || 'Sem categoria'}
              {lancamento.conta_financeira_nome ? ` · ${lancamento.conta_financeira_nome}` : ''}
              {data ? ` · ${format(new Date(data), 'dd MMM yyyy', { locale: ptBR })}` : ''}
            </p>
          </div>
        </div>

        {/* Status chips */}
        <div className="flex gap-2 px-5 pb-4 flex-wrap">
          {lancamento.referencia_numero && (
            <span className="text-[0.65rem] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
              Ref: {lancamento.referencia_numero}
            </span>
          )}
          {isPendente && (
            <span className="flex items-center gap-1 text-[0.65rem] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
              <Clock className="w-2.5 h-2.5" /> Aguard. Conciliação
            </span>
          )}
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-800" />

        {/* Seção: Marcar como pago */}
        {!isTransf && (
          <div className="px-5 py-4 space-y-4">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Marcar como pago</p>
                <p className="text-xs text-gray-400">{isPagoLocal ? 'Pago' : 'Em aberto'}</p>
              </div>
              <Toggle checked={isPagoLocal} onChange={setIsPagoLocal} />
            </div>

            {/* Campos Data e Conta */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Data</p>
                <input
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  disabled={!isPagoLocal}
                  className="w-full h-9 px-3 text-sm rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-0 outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Conta</p>
                <Select value={contaId} onValueChange={setContaId}>
                  <SelectTrigger className="h-9 text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded-xl text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-gray-300">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botão Salvar — PDV style */}
            <button
              onClick={handleSalvarPagamento}
              disabled={saving}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-base font-semibold active:scale-95 transition-transform disabled:opacity-50">
              <Save className="w-5 h-5" />
              Salvar
            </button>
          </div>
        )}

        {/* Conciliar (se pago e pendente) */}
        {isPagoOriginal && isPendente && (
          <>
            <div className="h-px bg-gray-100 dark:bg-gray-800" />
            <div className="px-5 py-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Conciliar</p>
                <p className="text-xs text-gray-400">Confirmar data de liquidação</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Data de liquidação</p>
                <input
                  type="date"
                  value={dataLiquidacao}
                  onChange={(e) => setDataLiquidacao(e.target.value)}
                  className="w-full h-9 px-3 text-sm rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-0 outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
                />
              </div>
              <button
                onClick={handleConciliar}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-sm font-medium active:scale-95 transition-transform disabled:opacity-50">
                <CheckCircle2 className="w-4 h-4" />
                Salvar Conciliação
              </button>
            </div>
          </>
        )}

        {/* Footer: só o clipe, alinhado à direita */}
        <div className="px-5 pb-5 pt-2 flex items-center justify-end">
          <AnexosPanel
            referenciaId={lancamento.id}
            referenciaTipo="LancamentoFinanceiro"
            referenciaNumero={lancamento.descricao}
            inline
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}