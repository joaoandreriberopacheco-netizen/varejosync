import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const formatCurrency = (v) =>
  `R$ ${Math.abs(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function LancamentoDetalheDialog({ lancamento, contas, onClose, onSaved }) {
  const [conciliando, setConciliando] = useState(false);
  const [contaId, setContaId] = useState(lancamento.conta_financeira_id || '');
  const [dataPagamento, setDataPagamento] = useState(
    lancamento.data_pagamento
      ? format(new Date(lancamento.data_pagamento), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd')
  );
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const isReceita = lancamento.tipo === 'Receita';
  const isPago = lancamento.status === 'Pago';
  const isPendente = lancamento.status_conciliacao === 'Pendente';

  const handleMarcarPago = async () => {
    setSaving(true);
    const conta = contas.find(c => c.id === contaId);
    await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
      status: 'Pago',
      data_pagamento: dataPagamento,
      status_conciliacao: 'Pendente',
      conta_financeira_id: contaId,
      conta_financeira_nome: conta?.nome,
    });
    if (conta) {
      const delta = isReceita ? (lancamento.valor || 0) : -(lancamento.valor || 0);
      await base44.entities.ContasFinanceiras.update(contaId, { saldo_atual: (conta.saldo_atual || 0) + delta });
    }
    toast({ title: 'Pagamento registrado!', className: 'bg-gray-100 text-gray-800' });
    onSaved?.();
    setSaving(false);
  };

  const handleConciliar = async () => {
    setSaving(true);
    await base44.entities.LancamentoFinanceiro.update(lancamento.id, {
      status_conciliacao: 'Conciliado',
      data_liquidacao_efetiva: dataPagamento,
    });
    toast({ title: 'Lançamento conciliado!', className: 'bg-gray-100 text-gray-800' });
    onSaved?.();
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm dark:bg-gray-900 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-800 dark:text-gray-100 text-base font-medium">
            {lancamento.descricao}
          </DialogTitle>
        </DialogHeader>

        {/* Info principal */}
        <div className={`rounded-2xl p-4 flex items-center gap-3 ${
          isReceita ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isReceita ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'
          }`}>
            {isReceita
              ? <ArrowDownLeft className="w-5 h-5 text-green-600 dark:text-green-400" />
              : <ArrowUpRight className="w-5 h-5 text-red-500 dark:text-red-400" />
            }
          </div>
          <div>
            <p className={`text-2xl font-bold ${isReceita ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>
              {isReceita ? '+' : '-'}{formatCurrency(lancamento.valor)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {lancamento.categoria || 'Sem categoria'}
              {lancamento.conta_financeira_nome && ` · ${lancamento.conta_financeira_nome}`}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          {isPago ? (
            <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" /> Pago
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5" /> Em Aberto
            </span>
          )}
          {isPendente && (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5" /> Aguard. Conciliação
            </span>
          )}
          {lancamento.referencia_numero && (
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
              Ref: {lancamento.referencia_numero}
            </span>
          )}
        </div>

        {/* Ações conforme status */}
        {!isPago && (
          <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Registrar pagamento</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-400">Data</Label>
                <Input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)}
                  className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 mt-1 h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-400">Conta</Label>
                <Select value={contaId} onValueChange={setContaId}>
                  <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 mt-1 h-9 text-sm">
                    <SelectValue placeholder="Conta..." />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    {contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleMarcarPago} disabled={saving || !contaId} className="w-full bg-gray-800 hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900">
              Marcar como Pago
            </Button>
          </div>
        )}

        {isPago && isPendente && (
          <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Confirmar data de liquidação</p>
            <Input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)}
              className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 h-9 text-sm" />
            <Button onClick={handleConciliar} disabled={saving} className="w-full bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Conciliar
            </Button>
          </div>
        )}

        <Button variant="ghost" onClick={onClose} className="w-full text-gray-400 dark:text-gray-500 text-xs">
          Fechar
        </Button>
      </DialogContent>
    </Dialog>
  );
}