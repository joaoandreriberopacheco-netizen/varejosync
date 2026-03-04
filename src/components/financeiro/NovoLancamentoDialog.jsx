import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const TIPOS = [
  { value: 'Receita', label: 'Receita', icon: ArrowDownLeft, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', activeBg: 'bg-green-500', activeText: 'text-white' },
  { value: 'Despesa', label: 'Despesa', icon: ArrowUpRight, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', activeBg: 'bg-red-500', activeText: 'text-white' },
  { value: 'Transferência', label: 'Transferência', icon: ArrowRightLeft, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', activeBg: 'bg-blue-500', activeText: 'text-white' },
];

const CATEGORIAS_RECEITA = ['Venda de Produto', 'Prestação de Serviço', 'Outros'];
const CATEGORIAS_DESPESA = ['Compra de Mercadoria', 'Aluguel', 'Salários', 'Impostos', 'Utilities', 'Marketing', 'Outros'];

export default function NovoLancamentoDialog({ open, onClose, onSaved, contaDefaultId }) {
  const [tipo, setTipo] = useState('Despesa');
  const [contas, setContas] = useState([]);
  const [form, setForm] = useState({
    descricao: '',
    valor: '',
    data_vencimento: format(new Date(), 'yyyy-MM-dd'),
    categoria: '',
    conta_financeira_id: contaDefaultId || '',
    conta_destino_id: '',
    observacoes: '',
    status: 'Em Aberto',
  });
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.ContasFinanceiras.filter({ ativo: true }).then(setContas);
  }, [open]);

  useEffect(() => {
    if (contaDefaultId) setForm(f => ({ ...f, conta_financeira_id: contaDefaultId }));
  }, [contaDefaultId]);

  const categorias = tipo === 'Receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;

  const handleSave = async () => {
    if (!form.descricao || !form.valor || !form.conta_financeira_id) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const valor = parseFloat(String(form.valor).replace(',', '.')) || 0;
    const conta = contas.find(c => c.id === form.conta_financeira_id);

    if (tipo === 'Transferência') {
      if (!form.conta_destino_id) {
        toast({ title: 'Selecione a conta de destino', variant: 'destructive' });
        return;
      }
      const contaDestino = contas.find(c => c.id === form.conta_destino_id);
      // Saída da origem
      await base44.entities.LancamentoFinanceiro.create({
        tipo: 'Despesa',
        descricao: `Transferência para ${contaDestino?.nome}`,
        valor,
        data_vencimento: form.data_vencimento,
        data_pagamento: form.data_vencimento,
        status: 'Pago',
        status_conciliacao: 'N/A',
        categoria: 'Transferência entre Contas',
        conta_financeira_id: form.conta_financeira_id,
        conta_financeira_nome: conta?.nome,
        referencia_tipo: 'Manual',
        observacoes: form.observacoes,
      });
      // Entrada no destino
      await base44.entities.LancamentoFinanceiro.create({
        tipo: 'Receita',
        descricao: `Transferência de ${conta?.nome}`,
        valor,
        data_vencimento: form.data_vencimento,
        data_pagamento: form.data_vencimento,
        status: 'Pago',
        status_conciliacao: 'N/A',
        categoria: 'Transferência entre Contas',
        conta_financeira_id: form.conta_destino_id,
        conta_financeira_nome: contaDestino?.nome,
        referencia_tipo: 'Manual',
        observacoes: form.observacoes,
      });
      // Atualiza saldos
      await base44.entities.ContasFinanceiras.update(form.conta_financeira_id, { saldo_atual: (conta?.saldo_atual || 0) - valor });
      await base44.entities.ContasFinanceiras.update(form.conta_destino_id, { saldo_atual: ((contaDestino?.saldo_atual) || 0) + valor });
    } else {
      const isPago = form.status === 'Pago';
      await base44.entities.LancamentoFinanceiro.create({
        tipo,
        descricao: form.descricao,
        valor,
        data_vencimento: form.data_vencimento,
        data_pagamento: isPago ? form.data_vencimento : null,
        status: form.status,
        status_conciliacao: isPago ? 'Pendente' : 'N/A',
        categoria: form.categoria,
        conta_financeira_id: form.conta_financeira_id,
        conta_financeira_nome: conta?.nome,
        referencia_tipo: 'Manual',
        observacoes: form.observacoes,
      });
      if (isPago && conta) {
        const delta = tipo === 'Receita' ? valor : -valor;
        await base44.entities.ContasFinanceiras.update(conta.id, { saldo_atual: (conta.saldo_atual || 0) + delta });
      }
    }

    toast({ title: 'Lançamento salvo!', className: 'bg-gray-100 text-gray-800' });
    onSaved?.();
    onClose();
  };

  const tipoConfig = TIPOS.find(t => t.value === tipo);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md dark:bg-gray-900 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-800 dark:text-gray-100 font-glacial">Novo Lançamento</DialogTitle>
        </DialogHeader>

        {/* Seletor de tipo */}
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {TIPOS.map(t => {
            const Icon = t.icon;
            const isActive = tipo === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTipo(t.value)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? `${t.activeBg} ${t.activeText} shadow-sm`
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-3 mt-1">
          {tipo !== 'Transferência' && (
            <div>
              <Label className="text-xs text-gray-500 dark:text-gray-400">Descrição *</Label>
              <Input
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Ex: Pagamento de fornecedor"
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 mt-1"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-gray-500 dark:text-gray-400">Valor *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                placeholder="0,00"
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500 dark:text-gray-400">Data</Label>
              <Input
                type="date"
                value={form.data_vencimento}
                onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-gray-500 dark:text-gray-400">
              {tipo === 'Transferência' ? 'Conta Origem *' : 'Conta *'}
            </Label>
            <Select value={form.conta_financeira_id} onValueChange={v => setForm(f => ({ ...f, conta_financeira_id: v }))}>
              <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 mt-1">
                <SelectValue placeholder="Selecionar conta..." />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                {contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {tipo === 'Transferência' && (
            <div>
              <Label className="text-xs text-gray-500 dark:text-gray-400">Conta Destino *</Label>
              <Select value={form.conta_destino_id} onValueChange={v => setForm(f => ({ ...f, conta_destino_id: v }))}>
                <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 mt-1">
                  <SelectValue placeholder="Selecionar conta destino..." />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {contas.filter(c => c.id !== form.conta_financeira_id).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {tipo !== 'Transferência' && (
            <>
              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400">Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 mt-1">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-gray-500 dark:text-gray-400">Status</Label>
                <div className="flex gap-2 mt-1">
                  {['Em Aberto', 'Pago'].map(s => (
                    <button
                      key={s}
                      onClick={() => setForm(f => ({ ...f, status: s }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                        form.status === s
                          ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <Label className="text-xs text-gray-500 dark:text-gray-400">Observações</Label>
            <Textarea
              value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              placeholder="Opcional..."
              rows={2}
              className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 mt-1 resize-none text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="flex-1 bg-gray-800 hover:bg-gray-700 dark:bg-gray-200 dark:hover:bg-gray-100 dark:text-gray-900">
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}