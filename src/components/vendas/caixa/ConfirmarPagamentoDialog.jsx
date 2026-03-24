import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Banknote, Smartphone, CreditCard, Ticket, Receipt, ArrowLeft, ChevronRight, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import SeletorMaquininhaSheet from './SeletorMaquininhaSheet';
import SeletorFiadoSheet from './SeletorFiadoSheet';

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
  const [seletorMaquininha, setSeletorMaquininha] = useState(null);
  const [showSeletorFiado, setShowSeletorFiado] = useState(false);
  const [fiadoConfig, setFiadoConfig] = useState(null);
  const [valoresVisiveis, setValoresVisiveis] = useState(true);

  // Wrapper de máscara que intercepta débito/crédito para pedir maquininha antes de digitar
  const handleInputMascaraComMaquininha = (e, setInput, setValor, modalidade) => {
    // Se é débito ou crédito e ainda não tem maquininha, abre seletor e bloqueia digitação
    if (modalidade === 'debito' && !maquininhaDebito && /^\d$/.test(e.key)) {
      e.preventDefault();
      setSeletorMaquininha('debito');
      return;
    }
    if (modalidade === 'credito' && !maquininhaCredito && /^\d$/.test(e.key)) {
      e.preventDefault();
      setSeletorMaquininha('credito');
      return;
    }
    handleInputMascara(e, setInput, setValor);
  };

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

  const handleDebitoFocus = () => { if (!maquininhaDebito) setSeletorMaquininha('debito'); };
  const handleCreditoFocus = () => { if (!maquininhaCredito) setSeletorMaquininha('credito'); };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg p-0 gap-0 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border-0 shadow-2xl">
          {/* Header */}
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
            <DialogTitle className="flex items-center justify-between">
              <span className="text-base font-semibold text-gray-900 dark:text-white font-glacial">
                {pedidoSelecionado.cliente_nome || 'Avulso'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setValoresVisiveis(!valoresVisiveis)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title={valoresVisiveis ? 'Ocultar valores' : 'Mostrar valores'}
                >
                  {valoresVisiveis ? (
                    <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  )}
                </button>
                <span className="text-2xl font-bold text-gray-900 dark:text-white font-glacial tabular-nums">
                  {valoresVisiveis ? formatValor(pedidoSelecionado.valor_total) : '••••••'}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Formas de pagamento */}
          <div className="overflow-y-auto max-h-[60vh] px-4 py-3 space-y-1.5">

            {/* Dinheiro */}
            <InputPagamento
              label="Dinheiro"
              icon={Banknote}
              index={0}
              active={formaPagamentoAtiva === 0}
              onFocus={() => setFormaPagamentoAtiva(0)}
              inputRef={inputRefs.dinheiro}
              value={inputDinheiro}
              onKeyDown={(e) => handleInputMascara(e, setInputDinheiro, setPagamentosDinheiro)}
              valoresVisiveis={valoresVisiveis}
            />

            {/* PIX */}
            <InputPagamento
              label="PIX"
              icon={Smartphone}
              index={1}
              active={formaPagamentoAtiva === 1}
              onFocus={() => setFormaPagamentoAtiva(1)}
              inputRef={inputRefs.pix}
              value={inputPix}
              onKeyDown={(e) => handleInputMascara(e, setInputPix, setPagamentosPix)}
              valoresVisiveis={valoresVisiveis}
            />

            {/* Débito */}
            <div>
              <InputPagamento
                label="Cartão Débito"
                icon={CreditCard}
                index={2}
                active={formaPagamentoAtiva === 2}
                onFocus={() => { setFormaPagamentoAtiva(2); if (!maquininhaDebito) setSeletorMaquininha('debito'); }}
                onContainerClick={() => { setFormaPagamentoAtiva(2); if (!maquininhaDebito) setSeletorMaquininha('debito'); }}
                inputRef={inputRefs.debito}
                value={inputDebito}
                onKeyDown={(e) => handleInputMascaraComMaquininha(e, setInputDebito, setPagamentosDebito, 'debito')}
                badge={maquininhaDebito ? `${maquininhaDebito.maquininha?.nome} · ${maquininhaDebito.bandeira} · ${maquininhaDebito.taxa}%` : null}
                onBadgeClick={() => setSeletorMaquininha('debito')}
                valoresVisiveis={valoresVisiveis}
              />
            </div>

            {/* Crédito */}
            <div>
              <InputPagamento
                label="Cartão Crédito"
                icon={CreditCard}
                index={3}
                active={formaPagamentoAtiva === 3}
                onFocus={() => { setFormaPagamentoAtiva(3); if (!maquininhaCredito) setSeletorMaquininha('credito'); }}
                onContainerClick={() => { setFormaPagamentoAtiva(3); if (!maquininhaCredito) setSeletorMaquininha('credito'); }}
                inputRef={inputRefs.credito}
                value={inputCredito}
                onKeyDown={(e) => handleInputMascaraComMaquininha(e, setInputCredito, setPagamentosCredito, 'credito')}
                badge={maquininhaCredito ? `${maquininhaCredito.maquininha?.nome} · ${maquininhaCredito.bandeira} · ${parcelasCredito}x · ${maquininhaCredito.taxa}%` : null}
                onBadgeClick={() => setSeletorMaquininha('credito')}
                valoresVisiveis={valoresVisiveis}
              />
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
                  className="flex-1 h-11 px-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 border-0"
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
                    index={4}
                    active={formaPagamentoAtiva === 4}
                    onFocus={() => setFormaPagamentoAtiva(4)}
                    inputRef={inputRefs.vale}
                    value={inputVale}
                    onKeyDown={(e) => handleInputMascara(e, setInputVale, setPagamentosVale)}
                    valoresVisiveis={valoresVisiveis}
                  />
              )}
            </div>

            {/* Fiado */}
            <InputPagamento
              label="Fiado (Conta a Pagar)"
              icon={Receipt}
              index={5}
              active={formaPagamentoAtiva === 5}
              onFocus={() => { setFormaPagamentoAtiva(5); if (!fiadoConfig) setShowSeletorFiado(true); }}
              inputRef={inputRefs.contaPagar}
              value={inputContaPagar}
              onKeyDown={(e) => handleInputMascara(e, setInputContaPagar, setPagamentosContaPagar)}
              badge={fiadoConfig ? `Vence em ${fiadoConfig.prazo_dias} dias` : null}
              onBadgeClick={() => setShowSeletorFiado(true)}
              valoresVisiveis={valoresVisiveis}
            />

            {/* Resumo troco / falta */}
            {(troco > 0 || valorRestante > 0) && (
              <div className="mt-1 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
                {troco > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Troco</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatValor(troco)}</span>
                  </div>
                )}
                {valorRestante > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Falta</span>
                    <span className="font-semibold text-red-500 dark:text-red-400">{formatValor(valorRestante)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="px-4 pb-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex gap-2.5">
            <button
              onClick={() => setShowRetornoDialog(true)}
              className="h-12 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium flex items-center gap-2 flex-shrink-0"
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

      <SeletorMaquininhaSheet
        visible={!!seletorMaquininha}
        modalidade={seletorMaquininha || 'debito'}
        parcelas={seletorMaquininha === 'credito' ? parcelasCredito : 1}
        onSelect={(dados) => {
          if (seletorMaquininha === 'debito') {
            setMaquininhaDebito(dados);
          } else {
            setMaquininhaCredito(dados);
            if (dados.parcelas) setParcelasCredito(dados.parcelas);
          }
          setSeletorMaquininha(null);
        }}
        onCancel={() => setSeletorMaquininha(null)}
      />

      <SeletorFiadoSheet
        visible={showSeletorFiado}
        clienteNome={pedidoSelecionado?.cliente_nome}
        valorTotal={pedidoSelecionado?.valor_total}
        formatValor={formatValor}
        onConfirm={(config) => {
          setFiadoConfig(config);
          setShowSeletorFiado(false);
        }}
        onCancel={() => setShowSeletorFiado(false)}
      />
    </>
  );
}

// ── Input de pagamento glacial ────────────────────────────────────────────────
function InputPagamento({ label, icon: Icon, active, onFocus, onContainerClick, inputRef, value, onKeyDown, badge, onBadgeClick, valoresVisiveis }) {
  return (
    <div className="space-y-0.5">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-text ${
          active
            ? 'bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-300 dark:ring-gray-600'
            : 'bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        onClick={() => {
          if (onContainerClick) onContainerClick();
          else onFocus?.();
        }}
      >
        <Icon className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400 flex-1 select-none">{label}</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={valoresVisiveis ? value : value ? '••••••' : ''}
          onChange={() => {}}
          onFocus={(e) => { e.target.select(); onFocus?.(); }}
          onKeyDown={onKeyDown}
          className="w-24 text-right text-base font-semibold bg-transparent border-0 focus:outline-none text-gray-900 dark:text-white cursor-text tabular-nums"
        />
      </div>
      {badge && (
        <button
          onClick={onBadgeClick}
          className="w-full text-left px-3 py-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {badge} · <span className="underline">trocar</span>
        </button>
      )}
    </div>
  );
}