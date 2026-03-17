import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Banknote, Smartphone, CreditCard, Ticket, Receipt, ArrowLeft, ChevronRight, RefreshCw
} from 'lucide-react';
import SeletorMaquininhaSheet from './SeletorMaquininhaSheet';

const FORMAS = [
  { key: 'dinheiro', label: 'Dinheiro',   icon: Banknote,    color: 'emerald' },
  { key: 'pix',      label: 'PIX',        icon: Smartphone,  color: 'sky' },
  { key: 'debito',   label: 'Débito',     icon: CreditCard,  color: 'violet' },
  { key: 'credito',  label: 'Crédito',    icon: CreditCard,  color: 'orange' },
  { key: 'vale',     label: 'Vale Troca', icon: Ticket,      color: 'pink' },
  { key: 'fiado',    label: 'Fiado',      icon: Receipt,     color: 'amber' },
];

export default function ConfirmarPagamentoDialog({
  open, onOpenChange,
  pedidoSelecionado,
  pagamentosDinheiro, setPagamentosDinheiro, inputDinheiro, setInputDinheiro,
  pagamentosPix, setPagamentosPix, inputPix, setInputPix,
  pagamentosDebito, setPagamentosDebito, inputDebito, setInputDebito,
  pagamentosCredito, setPagamentosCredito, inputCredito, setInputCredito,
  parcelasCredito, setParcelasCredito,
  formaPagamentoAtiva, setFormaPagamentoAtiva,
  inputRefs, handleInputMascara,
  pagamentosVale, setPagamentosVale, inputVale, setInputVale,
  pagamentosContaPagar, setPagamentosContaPagar, inputContaPagar, setInputContaPagar,
  codigoVale, setCodigoVale, valeEncontrado, setValeEncontrado, buscandoVale, setBuscandoVale,
  maquininhaDebito, setMaquininhaDebito,
  maquininhaCredito, setMaquininhaCredito,
  troco, valorRestante, pagamentoValido, processandoVenda,
  formatValor, formatarValorExibicao,
  handleFinalizarVenda, setShowRetornoDialog,
  toast, base44,
}) {
  const [seletorMaquininha, setSeletorMaquininha] = useState(null); // 'debito' | 'credito' | null

  if (!pedidoSelecionado) return null;

  const handleBuscarVale = async () => {
    if (!codigoVale.trim()) return;
    setBuscandoVale(true);
    try {
      const vales = await base44.entities.ValeCompra.filter({ codigo: codigoVale.trim(), status: 'Ativo' });
      if (vales.length > 0) {
        setValeEncontrado(vales[0]);
        const maxVale = Math.min(vales[0].saldo, pedidoSelecionado.valor_total);
        setPagamentosVale(maxVale);
        setInputVale(formatarValorExibicao(maxVale));
        toast({ title: `Vale encontrado: ${formatValor(vales[0].saldo)}`, className: 'bg-emerald-100 text-emerald-800', duration: 2000 });
      } else {
        toast({ title: 'Vale não encontrado ou inativo', variant: 'destructive', duration: 2000 });
        setValeEncontrado(null);
      }
    } catch (e) {
      toast({ title: 'Erro ao buscar vale', variant: 'destructive' });
    } finally {
      setBuscandoVale(false);
    }
  };

  const handleDebitoFocus = () => {
    if (!maquininhaDebito) setSeletorMaquininha('debito');
  };
  const handleCreditoFocus = () => {
    if (!maquininhaCredito) setSeletorMaquininha('credito');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg p-0 gap-0 rounded-2xl overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700">
            <DialogTitle className="flex items-center justify-between">
              <span className="text-base font-semibold text-gray-900 dark:text-white font-glacial">
                {pedidoSelecionado.cliente_nome || 'Confirmação de Pagamento'}
              </span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white font-glacial">
                {formatValor(pedidoSelecionado.valor_total)}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[70vh] px-5 py-4 space-y-3">
            {/* Dinheiro */}
            <InputPagamento
              label="Dinheiro"
              icon={Banknote}
              colorClass="text-emerald-600"
              active={formaPagamentoAtiva === 0}
              onFocus={() => setFormaPagamentoAtiva(0)}
              inputRef={inputRefs.dinheiro}
              value={inputDinheiro}
              onKeyDown={(e) => handleInputMascara(e, setInputDinheiro, setPagamentosDinheiro)}
              readOnly={false}
            />

            {/* PIX */}
            <InputPagamento
              label="PIX"
              icon={Smartphone}
              colorClass="text-sky-600"
              active={formaPagamentoAtiva === 1}
              onFocus={() => setFormaPagamentoAtiva(1)}
              inputRef={inputRefs.pix}
              value={inputPix}
              onKeyDown={(e) => handleInputMascara(e, setInputPix, setPagamentosPix)}
            />

            {/* Débito */}
            <div className="space-y-1">
              <InputPagamento
                label="Cartão Débito"
                icon={CreditCard}
                colorClass="text-violet-600"
                active={formaPagamentoAtiva === 2}
                onFocus={() => { setFormaPagamentoAtiva(2); handleDebitoFocus(); }}
                inputRef={inputRefs.debito}
                value={inputDebito}
                onKeyDown={(e) => handleInputMascara(e, setInputDebito, setPagamentosDebito)}
              />
              {maquininhaDebito && (
                <div className="flex items-center justify-between px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-500 dark:text-gray-400">
                  <span>{maquininhaDebito.maquininha?.nome} · {maquininhaDebito.bandeira} · {maquininhaDebito.taxa}% · D+{maquininhaDebito.prazo_dias}</span>
                  <button onClick={() => setSeletorMaquininha('debito')} className="text-blue-500 underline ml-2">trocar</button>
                </div>
              )}
            </div>

            {/* Crédito */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <InputPagamento
                    label="Cartão Crédito"
                    icon={CreditCard}
                    colorClass="text-orange-600"
                    active={formaPagamentoAtiva === 3}
                    onFocus={() => { setFormaPagamentoAtiva(3); handleCreditoFocus(); }}
                    inputRef={inputRefs.credito}
                    value={inputCredito}
                    onKeyDown={(e) => handleInputMascara(e, setInputCredito, setPagamentosCredito)}
                  />
                </div>
                {/* Parcelas */}
                <div className="flex gap-1 mt-4 flex-shrink-0">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(p => (
                    <button
                      key={p}
                      onClick={() => setParcelasCredito(p)}
                      className={`w-7 h-7 rounded text-xs font-medium transition-colors ${parcelasCredito === p ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                    >
                      {p}x
                    </button>
                  ))}
                </div>
              </div>
              {maquininhaCredito && (
                <div className="flex items-center justify-between px-3 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-500 dark:text-gray-400">
                  <span>{maquininhaCredito.maquininha?.nome} · {maquininhaCredito.bandeira} · {maquininhaCredito.taxa}% · D+{maquininhaCredito.prazo_dias}</span>
                  <button onClick={() => setSeletorMaquininha('credito')} className="text-blue-500 underline ml-2">trocar</button>
                </div>
              )}
            </div>

            {/* Vale Troca */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Código do Vale..."
                  value={codigoVale}
                  onChange={(e) => setCodigoVale(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleBuscarVale(); }}
                  className="flex-1 h-11 px-3 bg-gray-50 dark:bg-gray-800 rounded-xl border-0 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
                />
                <button
                  onClick={handleBuscarVale}
                  disabled={buscandoVale}
                  className="h-11 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {buscandoVale ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Buscar'}
                </button>
              </div>
              {valeEncontrado && (
                <InputPagamento
                  label={`Vale (saldo: ${formatValor(valeEncontrado.saldo)})`}
                  icon={Ticket}
                  colorClass="text-pink-600"
                  active={formaPagamentoAtiva === 4}
                  onFocus={() => setFormaPagamentoAtiva(4)}
                  inputRef={inputRefs.vale}
                  value={inputVale}
                  onKeyDown={(e) => handleInputMascara(e, setInputVale, setPagamentosVale)}
                />
              )}
            </div>

            {/* Fiado / Conta a Pagar */}
            <InputPagamento
              label="Fiado (Conta a Pagar)"
              icon={Receipt}
              colorClass="text-amber-600"
              active={formaPagamentoAtiva === 5}
              onFocus={() => setFormaPagamentoAtiva(5)}
              inputRef={inputRefs.contaPagar}
              value={inputContaPagar}
              onKeyDown={(e) => handleInputMascara(e, setInputContaPagar, setPagamentosContaPagar)}
            />

            {/* Resumo */}
            <div className="mt-2 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
              {troco > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Troco</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatValor(troco)}</span>
                </div>
              )}
              {valorRestante > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Falta</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">{formatValor(valorRestante)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Botões de ação */}
          <div className="px-5 pb-5 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-3">
            <button
              onClick={() => setShowRetornoDialog(true)}
              className="h-12 px-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Devolver
            </button>
            <button
              onClick={handleFinalizarVenda}
              disabled={!pagamentoValido || processandoVenda}
              className="flex-1 h-12 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {processandoVenda
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processando...</>
                : <><ChevronRight className="w-4 h-4" /> Confirmar Pagamento</>
              }
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Seletor de Maquininha */}
      <SeletorMaquininhaSheet
        visible={!!seletorMaquininha}
        modalidade={seletorMaquininha || 'debito'}
        parcelas={seletorMaquininha === 'credito' ? parcelasCredito : 1}
        onSelect={(dados) => {
          if (seletorMaquininha === 'debito') setMaquininhaDebito(dados);
          else setMaquininhaCredito(dados);
          setSeletorMaquininha(null);
        }}
        onCancel={() => setSeletorMaquininha(null)}
      />
    </>
  );
}

function InputPagamento({ label, icon: Icon, colorClass, active, onFocus, inputRef, value, onKeyDown }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-text ${
        active
          ? 'bg-gray-100 dark:bg-gray-700 ring-2 ring-gray-300 dark:ring-gray-500'
          : 'bg-gray-50 dark:bg-gray-800'
      }`}
      onClick={() => inputRef?.current?.focus()}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${colorClass}`} />
      <span className="text-sm text-gray-600 dark:text-gray-400 w-32 flex-shrink-0">{label}</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={value}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        readOnly
        className="flex-1 text-right text-base font-semibold bg-transparent border-0 focus:outline-none text-gray-900 dark:text-white cursor-text"
      />
    </div>
  );
}