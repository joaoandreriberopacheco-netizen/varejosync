import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, CheckCircle2, CreditCard, Banknote, Smartphone, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

function BuscarPedidoStep({ onFound }) {
  const [numeroPedido, setNumeroPedido] = useState('');
  const [buscando, setBuscando] = useState(false);
  const { toast } = useToast();

  const buscar = async () => {
    const termo = numeroPedido.trim().toUpperCase();
    if (!termo) return;
    setBuscando(true);
    const todos = await base44.entities.PedidoVenda.list();
    const encontrado = todos.find(p =>
      p.numero?.toUpperCase() === termo ||
      p.numero?.toUpperCase().includes(termo)
    );
    setBuscando(false);
    if (!encontrado) {
      toast({ title: 'Pedido não encontrado', variant: 'destructive' });
      return;
    }
    if (!encontrado.pagamentos || encontrado.pagamentos.length === 0) {
      toast({ title: 'Pedido sem pagamentos registrados', variant: 'destructive' });
      return;
    }
    onFound(encontrado);
  };

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Informe o número do pedido</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">A forma de pagamento registrada será substituída</p>
        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="Ex: PV-00042"
            value={numeroPedido}
            onChange={e => setNumeroPedido(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscar()}
            className="text-lg font-mono uppercase border-0 border-b border-gray-200 dark:border-gray-700 rounded-none bg-transparent focus-visible:ring-0"
          />
          <Button onClick={buscar} disabled={buscando} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl px-5">
            {buscando ? '...' : <Search className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditarPagamentosStep({ pedido, onConfirm }) {
  const [pagamentos, setPagamentos] = useState(
    (pedido.pagamentos || []).map((p, i) => ({ ...p, _id: i }))
  );
  const { toast } = useToast();

  const formas = ['Dinheiro', 'PIX', 'Cartão de Débito', 'Cartão de Crédito', 'Vale Compra'];
  const formatValor = v => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const totalPago = pagamentos.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
  const diferenca = totalPago - pedido.valor_total;

  const atualizarPagamento = (id, campo, valor) => {
    setPagamentos(prev => prev.map(p => p._id === id ? { ...p, [campo]: valor } : p));
  };

  const adicionarPagamento = () => {
    setPagamentos(prev => [...prev, { _id: Date.now(), forma_pagamento: 'Dinheiro', valor: 0, parcelas: 1 }]);
  };

  const removerPagamento = (id) => {
    if (pagamentos.length === 1) return;
    setPagamentos(prev => prev.filter(p => p._id !== id));
  };

  const handleConfirm = () => {
    if (Math.abs(diferenca) > 0.01) {
      toast({ title: `Diferença de ${formatValor(Math.abs(diferenca))}`, description: 'O total dos pagamentos deve ser igual ao valor do pedido.', variant: 'destructive' });
      return;
    }
    const limpos = pagamentos.map(({ _id, ...rest }) => ({ ...rest, valor: parseFloat(rest.valor) || 0 }));
    onConfirm(limpos);
  };

  const IconForma = ({ forma }) => {
    if (forma?.toLowerCase().includes('pix')) return <Smartphone className="w-4 h-4 text-gray-400" />;
    if (forma?.toLowerCase().includes('dinheiro')) return <Banknote className="w-4 h-4 text-gray-400" />;
    return <CreditCard className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto max-h-[65vh]">
      <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">{pedido.numero}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{pedido.cliente_nome}</div>
          </div>
          <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{formatValor(pedido.valor_total)}</div>
        </div>
      </div>

      <div className="space-y-2">
        {pagamentos.map((pag) => (
          <div key={pag._id} className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <IconForma forma={pag.forma_pagamento} />
              <Select value={pag.forma_pagamento} onValueChange={v => atualizarPagamento(pag._id, 'forma_pagamento', v)}>
                <SelectTrigger className="flex-1 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800">
                  {formas.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
              {pagamentos.length > 1 && (
                <button
                  onClick={() => removerPagamento(pag._id)}
                  className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 flex-shrink-0"
                  style={{ minWidth: 32, minHeight: 32 }}>
                  ×
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400 w-14">Valor</label>
              <Input
                type="number"
                value={pag.valor}
                onChange={e => atualizarPagamento(pag._id, 'valor', e.target.value)}
                className="bg-gray-50 dark:bg-gray-700 border-0 rounded-xl h-10 text-right font-mono"
                step="0.01"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={adicionarPagamento}
        className="w-full h-10 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 dark:text-gray-500 flex items-center justify-center gap-2">
        + Adicionar forma de pagamento
      </button>

      {/* Status total */}
      <div className={`rounded-2xl px-4 py-3 flex justify-between items-center ${Math.abs(diferenca) < 0.01 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
        <span className={`text-sm font-medium ${Math.abs(diferenca) < 0.01 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
          {Math.abs(diferenca) < 0.01 ? '✓ Total correto' : diferenca > 0 ? `Sobrando ${formatValor(Math.abs(diferenca))}` : `Faltando ${formatValor(Math.abs(diferenca))}`}
        </span>
        <span className={`text-lg font-bold font-glacial ${Math.abs(diferenca) < 0.01 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
          {formatValor(totalPago)}
        </span>
      </div>

      <Button
        onClick={handleConfirm}
        disabled={Math.abs(diferenca) > 0.01}
        className="w-full h-14 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-semibold text-base"
        style={{ minHeight: 56 }}>
        Salvar Alteração
      </Button>
    </div>
  );
}

export default function AlterarPagamentoDialog({ open, onClose }) {
  const [step, setStep] = useState('buscar');
  const [pedido, setPedido] = useState(null);
  const [formasDePagamento, setFormasDePagamento] = useState([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    base44.entities.FormasDePagamento.filter({ ativo: true }).then(setFormasDePagamento).catch(() => {});
  }, []);
  const { toast } = useToast();

  const handleClose = () => {
    setStep('buscar');
    setPedido(null);
    onClose();
  };

  const handleConfirm = async (novosPagamentos) => {
    setSalvando(true);
    try {
      await base44.entities.PedidoVenda.update(pedido.id, { pagamentos: novosPagamentos });

      // Atualizar LancamentoFinanceiro vinculados: conta conforme forma de pagamento
      const lancamentos = await base44.entities.LancamentoFinanceiro.filter({
        referencia_id: pedido.id,
        referencia_tipo: 'PedidoVenda'
      });
      for (const lanc of lancamentos) {
        // Encontrar a forma de pagamento correspondente no novo array
        const pag = novosPagamentos.find(p =>
          p.forma_pagamento === lanc.forma_pagamento ||
          novosPagamentos.length === 1
        ) || novosPagamentos[0];
        if (!pag) continue;
        const forma = formasDePagamento.find(f => f.nome === pag.forma_pagamento);
        if (forma && forma.conta_destino_id) {
          await base44.entities.LancamentoFinanceiro.update(lanc.id, {
            forma_pagamento: pag.forma_pagamento,
            forma_pagamento_id: forma.id,
            forma_pagamento_tipo: forma.tipo,
            conta_financeira_id: forma.conta_destino_id,
            conta_financeira_nome: forma.conta_destino_nome || '',
          });
        }
      }

      toast({ title: '✓ Pagamento atualizado!', description: `Formas de pagamento do ${pedido.numero} foram alteradas.`, className: 'bg-emerald-100 text-emerald-800' });
      handleClose();
    } catch (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
    setSalvando(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-full w-full h-full m-0 p-0 rounded-none bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center flex-shrink-0">
          <button
            onClick={step === 'editar' ? () => setStep('buscar') : handleClose}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            style={{ minWidth: 44, minHeight: 44 }}>
            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 dark:text-white font-glacial">
            Alterar Pagamento
          </h2>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-auto relative">
          {salvando && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center z-50">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 dark:border-white" />
            </div>
          )}
          {step === 'buscar' && <BuscarPedidoStep onFound={p => { setPedido(p); setStep('editar'); }} />}
          {step === 'editar' && pedido && <EditarPagamentosStep pedido={pedido} onConfirm={handleConfirm} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}