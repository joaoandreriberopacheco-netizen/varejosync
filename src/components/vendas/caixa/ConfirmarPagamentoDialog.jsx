import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Banknote, Smartphone, CreditCard, Receipt, Edit, CheckCircle2, RefreshCw } from 'lucide-react';

export default function ConfirmarPagamentoDialog({
  open,
  onOpenChange,
  pedidoSelecionado,
  pagamentosDinheiro,
  setPagamentosDinheiro,
  inputDinheiro,
  setInputDinheiro,
  pagamentosPix,
  setPagamentosPix,
  inputPix,
  setInputPix,
  pagamentosDebito,
  setPagamentosDebito,
  inputDebito,
  setInputDebito,
  pagamentosCredito,
  setPagamentosCredito,
  inputCredito,
  setInputCredito,
  parcelasCredito,
  setParcelasCredito,
  formaPagamentoAtiva,
  setFormaPagamentoAtiva,
  inputRefs,
  handleInputMascara,
  pagamentosVale,
  setPagamentosVale,
  inputVale,
  setInputVale,
  codigoVale,
  setCodigoVale,
  valeEncontrado,
  setValeEncontrado,
  buscandoVale,
  setBuscandoVale,
  troco,
  valorRestante,
  pagamentoValido,
  processandoVenda,
  formatValor,
  formatarValorExibicao,
  handleFinalizarVenda,
  setShowRetornoDialog,
  toast,
  base44
}) {
  const handleBuscarVale = async () => {
    setBuscandoVale(true);
    setValeEncontrado(null);
    const todos = await base44.entities.ValeCompra.list();
    const vale = todos.find(v => v.codigo?.toUpperCase() === codigoVale.trim().toUpperCase() && ['Ativo', 'Utilizado Parcialmente'].includes(v.status) && (v.valor_disponivel || 0) > 0.01);
    setBuscandoVale(false);
    if (!vale) { toast({ title: 'Vale não encontrado, inativo ou sem saldo', variant: 'destructive' }); return; }
    setValeEncontrado(vale);
    const maxVale = Math.min(vale.valor_disponivel || 0, pedidoSelecionado?.valor_total || 0);
    setInputVale(formatarValorExibicao(maxVale));
    setPagamentosVale(maxVale);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:text-gray-200">
        <DialogHeader>
          <DialogTitle className="text-lg text-gray-800 dark:text-gray-200">Confirmar Pagamento</DialogTitle>
        </DialogHeader>
        {pedidoSelecionado &&
        <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Pedido</div>
                  <div className="font-bold text-lg text-gray-800 dark:text-gray-200">{pedidoSelecionado.numero}</div>
                </div>
                {pedidoSelecionado.senha_atendimento &&
              <div className="text-center px-4 py-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-600">
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Senha</div>
                    <div className="text-3xl font-bold text-gray-800 dark:text-gray-200 font-mono">{pedidoSelecionado.senha_atendimento}</div>
                  </div>
              }
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">{pedidoSelecionado.cliente_nome}</div>
              <div className="text-xs text-gray-500 dark:text-gray-500">Vendedor: {pedidoSelecionado.vendedor_nome}</div>
              <div className="text-3xl font-bold text-gray-800 dark:text-gray-200 mt-3">
                {formatValor(pedidoSelecionado.valor_total)}
              </div>
            </div>
            
            {/* Detalhes dos Itens */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Itens da Venda</span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {pedidoSelecionado.itens?.map((item, idx) =>
              <div key={idx} className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.produto_nome}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.quantidade} × R$ {item.preco_unitario_praticado?.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        R$ {item.total?.toFixed(2)}
                      </div>
                    </div>
                  </div>
              )}
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">SUBTOTAL</span>
                  <span className="text-base font-bold text-gray-800 dark:text-gray-200">
                    R$ {(pedidoSelecionado.subtotal || pedidoSelecionado.valor_total)?.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Formas de Pagamento - Clean Style */}
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Formas de Pagamento
              </p>
              
              <div className="space-y-1">
                {/* Dinheiro */}
                <div
                className={`flex items-center justify-between py-4 cursor-pointer rounded-lg transition-colors ${formaPagamentoAtiva === 0 ? 'bg-gray-50 dark:bg-gray-800 -mx-2 px-2' : ''}`}
                onClick={() => {
                  setFormaPagamentoAtiva(0);
                  inputRefs.dinheiro.current?.focus();
                }}>
                  <div className="flex items-center gap-3">
                    <Banknote className="w-5 h-5 text-gray-400" />
                    <span className="text-base text-gray-700 dark:text-gray-300">Dinheiro</span>
                  </div>
                  <input
                  ref={inputRefs.dinheiro}
                  type="text"
                  inputMode="numeric"
                  value={inputDinheiro}
                  onChange={() => {}}
                  onKeyDown={(e) => handleInputMascara(e, setInputDinheiro, setPagamentosDinheiro)}
                  onFocus={(e) => {
                    e.target.select();
                    setFormaPagamentoAtiva(0);
                  }}
                  className={`w-32 h-12 text-right text-xl font-semibold bg-transparent border-0 focus:outline-none ${formaPagamentoAtiva === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`} />
                </div>

                {/* PIX */}
                <div
                className={`flex items-center justify-between py-4 cursor-pointer rounded-lg transition-colors ${formaPagamentoAtiva === 1 ? 'bg-gray-50 dark:bg-gray-800 -mx-2 px-2' : ''}`}
                onClick={() => {
                  setFormaPagamentoAtiva(1);
                  inputRefs.pix.current?.focus();
                }}>
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-gray-400" />
                    <span className="text-base text-gray-700 dark:text-gray-300">PIX</span>
                  </div>
                  <input
                  ref={inputRefs.pix}
                  type="text"
                  inputMode="numeric"
                  value={inputPix}
                  onChange={() => {}}
                  onKeyDown={(e) => handleInputMascara(e, setInputPix, setPagamentosPix)}
                  onFocus={(e) => {
                    e.target.select();
                    setFormaPagamentoAtiva(1);
                  }}
                  className={`w-32 h-12 text-right text-xl font-semibold bg-transparent border-0 focus:outline-none ${formaPagamentoAtiva === 1 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`} />
                </div>

                {/* Cartão Débito */}
                <div
                className={`flex items-center justify-between py-4 cursor-pointer rounded-lg transition-colors ${formaPagamentoAtiva === 2 ? 'bg-gray-50 dark:bg-gray-800 -mx-2 px-2' : ''}`}
                onClick={() => {
                  setFormaPagamentoAtiva(2);
                  inputRefs.debito.current?.focus();
                }}>
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <span className="text-base text-gray-700 dark:text-gray-300">Cartão Débito</span>
                  </div>
                  <input
                  ref={inputRefs.debito}
                  type="text"
                  inputMode="numeric"
                  value={inputDebito}
                  onChange={() => {}}
                  onKeyDown={(e) => handleInputMascara(e, setInputDebito, setPagamentosDebito)}
                  onFocus={(e) => {
                    e.target.select();
                    setFormaPagamentoAtiva(2);
                  }}
                  className={`w-32 h-12 text-right text-xl font-semibold bg-transparent border-0 focus:outline-none ${formaPagamentoAtiva === 2 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`} />
                </div>

                {/* Cartão Crédito */}
                <div
                className={`flex items-center justify-between py-4 cursor-pointer rounded-lg transition-colors ${formaPagamentoAtiva === 3 ? 'bg-gray-50 dark:bg-gray-800 -mx-2 px-2' : ''}`}
                onClick={() => {
                  setFormaPagamentoAtiva(3);
                  inputRefs.credito.current?.focus();
                }}>
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <span className="text-base text-gray-700 dark:text-gray-300">Cartão Crédito</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                    ref={inputRefs.credito}
                    type="text"
                    inputMode="numeric"
                    value={inputCredito}
                    onChange={() => {}}
                    onKeyDown={(e) => handleInputMascara(e, setInputCredito, setPagamentosCredito)}
                    onFocus={(e) => {
                      e.target.select();
                      setFormaPagamentoAtiva(3);
                    }}
                    className={`w-32 h-12 text-right text-xl font-semibold bg-transparent border-0 focus:outline-none ${formaPagamentoAtiva === 3 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`} />

                    {pagamentosCredito > 0 &&
                  <Select value={parcelasCredito.toString()} onValueChange={(v) => setParcelasCredito(parseInt(v))}>
                        <SelectTrigger className="w-16 h-10 bg-transparent border-0 focus:ring-0 text-gray-700 dark:text-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
                          {[...Array(12)].map((_, i) =>
                      <SelectItem key={i + 1} value={(i + 1).toString()} className="dark:hover:bg-gray-700">
                              {i + 1}x
                            </SelectItem>
                      )}
                        </SelectContent>
                      </Select>
                  }
                  </div>
                </div>

                {/* Vale Compra */}
                <div className={`py-4 rounded-lg transition-colors ${formaPagamentoAtiva === 4 ? 'bg-gray-50 dark:bg-gray-800 -mx-2 px-2' : ''}`}>
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => { setFormaPagamentoAtiva(4); }}>
                    <div className="flex items-center gap-3">
                      <Receipt className="w-5 h-5 text-gray-400" />
                      <span className="text-base text-gray-700 dark:text-gray-300">Vale Troca</span>
                    </div>
                    <input
                      ref={inputRefs.vale}
                      type="text"
                      inputMode="numeric"
                      value={inputVale}
                      onChange={() => {}}
                      onKeyDown={(e) => {
                        if (valeEncontrado) {
                          handleInputMascara(e, (v) => {
                            const num = parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0;
                            const maxVale = Math.min(valeEncontrado.valor_disponivel || 0, pedidoSelecionado?.valor_total || 0);
                            const clamped = Math.min(num, maxVale);
                            setInputVale(formatarValorExibicao(clamped));
                            setPagamentosVale(clamped);
                          }, () => {});
                        }
                      }}
                      onFocus={(e) => { e.target.select(); setFormaPagamentoAtiva(4); }}
                      className={`w-32 h-12 text-right text-xl font-semibold bg-transparent border-0 focus:outline-none ${formaPagamentoAtiva === 4 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'}`}
                    />
                  </div>
                  {/* Busca de vale */}
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="Código do vale (ex: VC-00001)"
                      value={codigoVale}
                      onChange={e => setCodigoVale(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleBuscarVale();
                        }
                      }}
                      className="flex-1 h-9 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 px-3 text-sm font-mono uppercase focus:outline-none focus:ring-1 focus:ring-gray-300 dark:text-white"
                    />
                    <button
                      onClick={handleBuscarVale}
                      className="h-9 px-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm"
                      disabled={buscandoVale}>
                      {buscandoVale ? '...' : 'Buscar'}
                    </button>
                  </div>
                  {valeEncontrado && (
                    <div className="mt-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{valeEncontrado.codigo}</div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">{valeEncontrado.cliente_nome}</div>
                      </div>
                      <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        Saldo: R$ {(valeEncontrado.valor_disponivel || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Resumo */}
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                <div className="flex justify-between text-base">
                  <span className="text-gray-500 dark:text-gray-400">Total a Pagar</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">R$ {formatarValorExibicao(pedidoSelecionado.valor_total)}</span>
                </div>
                {troco > 0 &&
              <div className="flex justify-between text-lg font-semibold">
                    <span className="text-emerald-600 dark:text-emerald-400">Troco</span>
                    <span className="text-emerald-600 dark:text-emerald-400">R$ {formatarValorExibicao(troco)}</span>
                  </div>
              }
                {valorRestante > 0.01 &&
              <div className="flex justify-between text-base">
                    <span className="text-gray-500 dark:text-gray-400">Falta</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">R$ {formatarValorExibicao(valorRestante)}</span>
                  </div>
              }
                
                {pagamentoValido &&
              <p className="text-sm text-center text-gray-400 pt-3">
                    ↵ Enter para aprovar
                  </p>
              }
              </div>
            </div>

            <div className="flex gap-2">
              <Button
              variant="outline"
              onClick={() => setShowRetornoDialog(true)}
              className="flex-1 h-12 gap-2 border-gray-300 dark:border-gray-600">
                <Edit className="w-4 h-4" />
                Retornar para Edição
              </Button>
              <Button
              onClick={handleFinalizarVenda}
              disabled={!pagamentoValido || processandoVenda}
              className="flex-1 h-14 text-lg font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl">
                {processandoVenda
                  ? <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Processando...</>
                  : <><CheckCircle2 className="w-5 h-5 mr-2" /> Aprovar {pagamentoValido && '(Enter)'}</>
                }
              </Button>
            </div>
          </div>
        }
      </DialogContent>
    </Dialog>
  );
}