import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, X, Delete, CheckCircle2, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const TIPOS = [
  { value: 'Receita', label: 'Receita', icon: ArrowDownLeft, activeClass: 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' },
  { value: 'Despesa', label: 'Despesa', icon: ArrowUpRight, activeClass: 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' },
  { value: 'Transferência', label: 'Transf.', icon: ArrowRightLeft, activeClass: 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' },
];

const CATEGORIAS_RECEITA = ['Venda de Produto', 'Prestação de Serviço', 'Outros'];
const CATEGORIAS_DESPESA = ['Compra de Mercadoria', 'Aluguel', 'Salários', 'Impostos', 'Utilities', 'Marketing', 'Outros'];

export default function NovoLancamentoDialog({ open, onClose, onSaved, contaDefaultId, tipoInicial }) {
  const [tipo, setTipo] = useState(tipoInicial || 'Despesa');
  const [contas, setContas] = useState([]);
  const [valorCents, setValorCents] = useState('0');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoria, setCategoria] = useState('');
  const [contaId, setContaId] = useState(contaDefaultId || '');
  const [contaDestinoId, setContaDestinoId] = useState('');
  const [status, setStatus] = useState('Em Aberto');
  const [step, setStep] = useState('valor'); // 'valor' | 'detalhes'
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      base44.entities.ContasFinanceiras.filter({ ativo: true }).then(setContas);
      setTipo(tipoInicial || 'Despesa');
      setValorCents('0');
      setDescricao('');
      setData(format(new Date(), 'yyyy-MM-dd'));
      setCategoria('');
      setContaId(contaDefaultId || '');
      setContaDestinoId('');
      setStatus('Em Aberto');
      setStep('valor');
    }
  }, [open, tipoInicial, contaDefaultId]);

  if (!open) return null;

  const valorNumerico = parseInt(valorCents || '0', 10) / 100;
  const categorias = tipo === 'Receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;

  const handlePad = (k) => {
    if (k === '⌫') {
      const next = valorCents.slice(0, -1);
      setValorCents(next.length === 0 ? '0' : next);
    } else {
      const raw = valorCents === '0' ? k : valorCents + k;
      if (raw.length <= 10) setValorCents(raw);
    }
  };

  const display = valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const handleSave = async () => {
    if (!valorNumerico || valorNumerico <= 0) {
      toast({ title: 'Informe o valor', variant: 'destructive' }); return;
    }
    if (tipo !== 'Transferência' && !descricao.trim()) {
      toast({ title: 'Informe a descrição', variant: 'destructive' }); return;
    }
    if (!contaId) {
      toast({ title: 'Selecione a conta', variant: 'destructive' }); return;
    }

    const conta = contas.find(c => c.id === contaId);

    if (tipo === 'Transferência') {
      if (!contaDestinoId) { toast({ title: 'Selecione a conta destino', variant: 'destructive' }); return; }
      const contaDest = contas.find(c => c.id === contaDestinoId);
      await base44.entities.LancamentoFinanceiro.create({
        tipo: 'Despesa', descricao: `Transferência para ${contaDest?.nome}`,
        valor: valorNumerico, data_vencimento: data, data_pagamento: data,
        status: 'Pago', status_conciliacao: 'N/A', categoria: 'Transferência entre Contas',
        conta_financeira_id: contaId, conta_financeira_nome: conta?.nome, referencia_tipo: 'Manual',
      });
      await base44.entities.LancamentoFinanceiro.create({
        tipo: 'Receita', descricao: `Transferência de ${conta?.nome}`,
        valor: valorNumerico, data_vencimento: data, data_pagamento: data,
        status: 'Pago', status_conciliacao: 'N/A', categoria: 'Transferência entre Contas',
        conta_financeira_id: contaDestinoId, conta_financeira_nome: contaDest?.nome, referencia_tipo: 'Manual',
      });
      await base44.entities.ContasFinanceiras.update(contaId, { saldo_atual: (conta?.saldo_atual || 0) - valorNumerico });
      await base44.entities.ContasFinanceiras.update(contaDestinoId, { saldo_atual: (contaDest?.saldo_atual || 0) + valorNumerico });
    } else {
      const isPago = status === 'Pago';
      await base44.entities.LancamentoFinanceiro.create({
        tipo, descricao, valor: valorNumerico,
        data_vencimento: data, data_pagamento: isPago ? data : null,
        status, status_conciliacao: isPago ? 'Pendente' : 'N/A',
        categoria, conta_financeira_id: contaId, conta_financeira_nome: conta?.nome, referencia_tipo: 'Manual',
      });
      if (isPago && conta) {
        const delta = tipo === 'Receita' ? valorNumerico : -valorNumerico;
        await base44.entities.ContasFinanceiras.update(conta.id, { saldo_atual: (conta.saldo_atual || 0) + delta });
      }
    }

    toast({ title: 'Lançamento salvo!' });
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-gray-900" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 active:scale-95">
          <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>

        {/* Tipo pills */}
        <div className="flex gap-1 bg-gray-200 dark:bg-gray-800 rounded-2xl p-1">
          {TIPOS.map(t => {
            const Icon = t.icon;
            const isActive = tipo === t.value;
            return (
              <button key={t.value} onClick={() => setTipo(t.value)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${isActive ? t.activeClass + ' shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Step indicator */}
        <div className="flex gap-1">
          <div className={`w-2 h-2 rounded-full transition-all ${step === 'valor' ? 'bg-gray-800 dark:bg-gray-200' : 'bg-gray-300 dark:bg-gray-600'}`} />
          <div className={`w-2 h-2 rounded-full transition-all ${step === 'detalhes' ? 'bg-gray-800 dark:bg-gray-200' : 'bg-gray-300 dark:bg-gray-600'}`} />
        </div>
      </div>

      {step === 'valor' ? (
        <>
          {/* Valor display */}
          <div className="flex-1 flex flex-col justify-end">
            <div className="text-center px-4 pb-4">
              <p className="text-5xl font-semibold text-gray-900 dark:text-white tracking-tight font-glacial">
                R$ {display}
              </p>
              <input
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder={tipo === 'Transferência' ? 'Observações (opcional)' : 'Descrição *'}
                className="mt-4 w-full text-center bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 py-2 text-sm text-gray-600 dark:text-gray-300 placeholder-gray-400 outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
              />
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2 px-4 pb-4">
              {['1','2','3','4','5','6','7','8','9','0','00','⌫'].map(k => (
                <button
                  key={k}
                  onPointerDown={e => { e.preventDefault(); handlePad(k); }}
                  className={`h-16 rounded-2xl text-2xl font-medium active:scale-95 transition-all select-none ${
                    k === '⌫'
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm'
                  }`}
                >
                  {k === '⌫' ? <Delete className="w-5 h-5 mx-auto" /> : k}
                </button>
              ))}
            </div>

            <div className="px-4 pb-6">
              <button
                onPointerDown={e => e.preventDefault()}
                onClick={() => setStep('detalhes')}
                className="w-full h-14 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-semibold active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Continuar <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3 pt-2">
          {/* Resumo */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm">
            <span className="text-sm text-gray-500 dark:text-gray-400">{tipo} · {descricao || '—'}</span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">R$ {display}</span>
          </div>

          {/* Data */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
            <div className="px-4 py-1 text-[10px] text-gray-400 uppercase tracking-wider pt-3">Data</div>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              className="w-full bg-transparent px-4 pb-3 text-sm text-gray-800 dark:text-gray-200 outline-none"
            />
          </div>

          {/* Conta */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger className="border-0 shadow-none bg-transparent h-12 dark:text-gray-200 text-sm px-4">
                <SelectValue placeholder={tipo === 'Transferência' ? 'Conta Origem *' : 'Conta *'} />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                {contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {tipo === 'Transferência' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
              <Select value={contaDestinoId} onValueChange={setContaDestinoId}>
                <SelectTrigger className="border-0 shadow-none bg-transparent h-12 dark:text-gray-200 text-sm px-4">
                  <SelectValue placeholder="Conta Destino *" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {contas.filter(c => c.id !== contaId).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {tipo !== 'Transferência' && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="border-0 shadow-none bg-transparent h-12 dark:text-gray-200 text-sm px-4">
                    <SelectValue placeholder="Categoria (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                {['Em Aberto', 'Pago'].map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    className={`flex-1 h-12 rounded-2xl text-sm font-medium transition-all shadow-sm ${
                      status === s ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}

          <button onClick={handleSave}
            className="w-full h-14 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-semibold active:scale-95 transition-all flex items-center justify-center gap-2 mt-2">
            <CheckCircle2 className="w-5 h-5" />
            Confirmar Lançamento
          </button>
        </div>
      )}
    </div>
  );
}