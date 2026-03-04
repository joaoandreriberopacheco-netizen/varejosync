import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, X, Delete, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

const TIPOS = [
  { value: 'Receita', label: 'Receita', icon: ArrowDownLeft, activeClass: 'bg-gray-700 text-white' },
  { value: 'Despesa', label: 'Despesa', icon: ArrowUpRight, activeClass: 'bg-gray-900 text-white' },
  { value: 'Transferência', label: 'Transf.', icon: ArrowRightLeft, activeClass: 'bg-gray-600 text-white' },
];

const CATEGORIAS_RECEITA = ['Venda de Produto', 'Prestação de Serviço', 'Outros'];
const CATEGORIAS_DESPESA = ['Compra de Mercadoria', 'Aluguel', 'Salários', 'Impostos', 'Utilities', 'Marketing', 'Outros'];

const PAD_KEYS = ['1','2','3','4','5','6','7','8','9','0','00','⌫'];

function NumPad({ value, onChange }) {
  const handleKey = (k) => {
    if (k === '⌫') {
      onChange(value.slice(0, -1) || '0');
    } else {
      const raw = (value === '0' ? '' : value) + k;
      // max 10 chars
      if (raw.length <= 10) onChange(raw);
    }
  };
  // display: divide by 100 for cents
  const display = (parseInt(value || '0', 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  return (
    <div className="w-full">
      <div className="text-center py-4">
        <p className="text-4xl font-semibold text-gray-900 dark:text-white tracking-tight font-glacial">
          R$ {display}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 px-2">
        {PAD_KEYS.map(k => (
          <button
            key={k}
            onPointerDown={e => { e.preventDefault(); handleKey(k); }}
            className={`h-14 rounded-2xl text-xl font-medium transition-all active:scale-95 ${
              k === '⌫'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm'
            }`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

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

  const valorNumerico = parseInt(valorCents || '0', 10) / 100;
  const categorias = tipo === 'Receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;

  const handleSave = async () => {
    if (!valorNumerico || valorNumerico <= 0) {
      toast({ title: 'Informe o valor', variant: 'destructive' });
      return;
    }
    if (tipo !== 'Transferência' && !descricao) {
      toast({ title: 'Informe a descrição', variant: 'destructive' });
      return;
    }
    if (!contaId) {
      toast({ title: 'Selecione a conta', variant: 'destructive' });
      return;
    }

    const conta = contas.find(c => c.id === contaId);

    if (tipo === 'Transferência') {
      if (!contaDestinoId) {
        toast({ title: 'Selecione a conta de destino', variant: 'destructive' });
        return;
      }
      const contaDestino = contas.find(c => c.id === contaDestinoId);
      await base44.entities.LancamentoFinanceiro.create({
        tipo: 'Despesa', descricao: `Transferência para ${contaDestino?.nome}`,
        valor: valorNumerico, data_vencimento: data, data_pagamento: data,
        status: 'Pago', status_conciliacao: 'N/A', categoria: 'Transferência entre Contas',
        conta_financeira_id: contaId, conta_financeira_nome: conta?.nome, referencia_tipo: 'Manual',
      });
      await base44.entities.LancamentoFinanceiro.create({
        tipo: 'Receita', descricao: `Transferência de ${conta?.nome}`,
        valor: valorNumerico, data_vencimento: data, data_pagamento: data,
        status: 'Pago', status_conciliacao: 'N/A', categoria: 'Transferência entre Contas',
        conta_financeira_id: contaDestinoId, conta_financeira_nome: contaDestino?.nome, referencia_tipo: 'Manual',
      });
      await base44.entities.ContasFinanceiras.update(contaId, { saldo_atual: (conta?.saldo_atual || 0) - valorNumerico });
      await base44.entities.ContasFinanceiras.update(contaDestinoId, { saldo_atual: ((contas.find(c=>c.id===contaDestinoId)?.saldo_atual) || 0) + valorNumerico });
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

  if (!open) return null;

  const tipoConfig = TIPOS.find(t => t.value === tipo);
  const TipoIcon = tipoConfig?.icon;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-gray-900" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        {/* Tipo selector */}
        <div className="flex gap-1 bg-gray-200 dark:bg-gray-800 rounded-2xl p-1">
          {TIPOS.map(t => {
            const Icon = t.icon;
            const isActive = tipo === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTipo(t.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isActive ? t.activeClass + ' shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="w-10" />
      </div>

      {/* Step tabs */}
      <div className="flex gap-0 mx-4 mt-2 bg-gray-200 dark:bg-gray-800 rounded-xl p-0.5">
        {['valor', 'detalhes'].map(s => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-all ${
              step === s ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-400'
            }`}
          >
            {s === 'valor' ? 'Valor' : 'Detalhes'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {step === 'valor' ? (
          <div className="pt-2">
            <NumPad value={valorCents} onChange={setValorCents} />

            {/* Campo descrição rápida */}
            <div className="px-4 mt-4">
              <input
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder={tipo === 'Transferência' ? 'Observações (opcional)' : 'Descrição *'}
                className="w-full bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
              />
            </div>

            {/* Data */}
            <div className="px-4 mt-3">
              <input
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 shadow-sm outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
              />
            </div>

            {/* Atalho próximo */}
            <div className="px-4 mt-4">
              <button
                onClick={() => setStep('detalhes')}
                className="w-full py-3.5 rounded-2xl bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-sm font-medium active:scale-95 transition-all"
              >
                Continuar →
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 pt-4 space-y-3">
            {/* Resumo valor */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                {TipoIcon && <TipoIcon className="w-4 h-4 text-gray-500" />}
                <span className="text-xs text-gray-400">{tipo}</span>
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                R$ {(valorNumerico).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Conta origem */}
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

            {/* Conta destino (transferência) */}
            {tipo === 'Transferência' && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                <Select value={contaDestinoId} onValueChange={setContaDestinoId}>
                  <SelectTrigger className="border-0 shadow-none bg-transparent h-12 dark:text-gray-200 text-sm px-4">
                    <SelectValue placeholder="Conta Destino *" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    {contas.filter(c => c.id !== contaId).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Categoria */}
            {tipo !== 'Transferência' && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="border-0 shadow-none bg-transparent h-12 dark:text-gray-200 text-sm px-4">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status */}
            {tipo !== 'Transferência' && (
              <div className="flex gap-2">
                {['Em Aberto', 'Pago'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`flex-1 py-3 rounded-2xl text-sm font-medium transition-all shadow-sm ${
                      status === s
                        ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Salvar */}
            <button
              onClick={handleSave}
              className="w-full py-4 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-base font-semibold active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Confirmar Lançamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}