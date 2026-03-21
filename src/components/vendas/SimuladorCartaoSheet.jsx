import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { CreditCard, X, AlertTriangle, CheckCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard'];

// Calcula a taxa total e valor líquido dado maquininha, bandeira, modalidade e parcelas
export function calcularTaxaCartao(maquininha, bandeira, modalidade, parcelas) {
  if (!maquininha) return { taxa_intermediacao: 0, taxa_parcelamento: 0, taxa_total: 0, valor_taxa: 0, valor_liquido: 0 };

  const confBandeira = (maquininha.bandeiras || []).find(b => b.bandeira === bandeira);
  if (!confBandeira) return { taxa_intermediacao: 0, taxa_parcelamento: 0, taxa_total: 0, valor_taxa: 0, valor_liquido: 0 };

  let taxa_intermediacao = 0;
  let taxa_parcelamento = 0;

  if (modalidade === 'Débito') {
    taxa_intermediacao = confBandeira.taxa_debito || 0;
  } else if (modalidade === 'Crédito à Vista') {
    taxa_intermediacao = confBandeira.taxa_credito_1x || 0;
  } else if (modalidade === 'Crédito Parcelado') {
    // Para parcelado, a intermediação é a taxa 2-6x ou 7-12x
    if (parcelas >= 7) {
      taxa_intermediacao = confBandeira.taxa_credito_7_12x || 0;
    } else {
      taxa_intermediacao = confBandeira.taxa_credito_2_6x || 0;
    }
    // Taxa de parcelamento vendedor para o número de parcelas específico
    const taxasParc = confBandeira.taxas_parcelamento_vendedor || [];
    const entradaParc = taxasParc.find(t => t.parcelas === parcelas);
    taxa_parcelamento = entradaParc?.taxa_percentual || 0;
  }

  const taxa_total = taxa_intermediacao + taxa_parcelamento;
  return { taxa_intermediacao, taxa_parcelamento, taxa_total };
}

export default function SimuladorCartaoSheet({ open, onClose, valorTotal, valorDesconto }) {
  const [maquininhas, setMaquininhas] = useState([]);
  const [maqSelecionada, setMaqSelecionada] = useState(null);
  const [bandeira, setBandeira] = useState('Visa');
  const [modalidade, setModalidade] = useState('Crédito à Vista');
  const [parcelas, setParcelas] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      base44.entities.Maquininha.filter({ ativo: true }).then(list => {
        setMaquininhas(list);
        if (list.length > 0) setMaqSelecionada(list[0]);
        setLoading(false);
      });
    }
  }, [open]);

  const { taxa_intermediacao, taxa_parcelamento, taxa_total } = useMemo(() => {
    if (!maqSelecionada) return { taxa_intermediacao: 0, taxa_parcelamento: 0, taxa_total: 0 };
    return calcularTaxaCartao(maqSelecionada, bandeira, modalidade, parcelas);
  }, [maqSelecionada, bandeira, modalidade, parcelas]);

  const valor_taxa = valorTotal * (taxa_total / 100);
  const valor_liquido = valorTotal - valor_taxa;
  const taxaMaiorQueDesconto = valorDesconto > 0 && valor_taxa > valorDesconto;

  const parcelasDisponiveis = useMemo(() => {
    if (modalidade !== 'Crédito Parcelado') return [];
    const confBandeira = (maqSelecionada?.bandeiras || []).find(b => b.bandeira === bandeira);
    const taxasParc = confBandeira?.taxas_parcelamento_vendedor || [];
    // Mostrar de 2 a 12, priorizando os que têm taxa cadastrada
    return Array.from({ length: 11 }, (_, i) => i + 2).map(n => ({
      parcelas: n,
      taxa: taxasParc.find(t => t.parcelas === n)?.taxa_percentual || 0
    }));
  }, [maqSelecionada, bandeira, modalidade]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl shadow-2xl z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white font-glacial">Simulador de Cartão</h2>
              <p className="text-xs text-gray-400">Impacto das taxas na sua venda</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="px-5 pb-8 text-center text-sm text-gray-400 py-8">Carregando maquininhas...</div>
        ) : maquininhas.length === 0 ? (
          <div className="px-5 pb-8 text-center text-sm text-gray-400 py-8">
            Nenhuma maquininha cadastrada.<br/>Configure em Configurações → Maquininhas.
          </div>
        ) : (
          <div className="px-5 pb-6 space-y-4">
            {/* Seleção de maquininha */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">Maquininha</label>
              <div className="relative">
                <select
                  value={maqSelecionada?.id || ''}
                  onChange={e => setMaqSelecionada(maquininhas.find(m => m.id === e.target.value))}
                  className="w-full h-11 pl-4 pr-10 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 appearance-none focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
                >
                  {maquininhas.map(m => <option key={m.id} value={m.id}>{m.nome} — {m.adquirente}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Bandeira + Modalidade */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">Bandeira</label>
                <div className="relative">
                  <select
                    value={bandeira}
                    onChange={e => setBandeira(e.target.value)}
                    className="w-full h-11 pl-4 pr-10 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 appearance-none focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
                  >
                    {BANDEIRAS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">Modalidade</label>
                <div className="relative">
                  <select
                    value={modalidade}
                    onChange={e => {
                      setModalidade(e.target.value);
                      if (e.target.value !== 'Crédito Parcelado') setParcelas(1);
                      else setParcelas(2);
                    }}
                    className="w-full h-11 pl-4 pr-10 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 appearance-none focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
                  >
                    <option value="Débito">Débito</option>
                    <option value="Crédito à Vista">Crédito 1x</option>
                    <option value="Crédito Parcelado">Crédito Parc.</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Parcelas — somente para crédito parcelado */}
            {modalidade === 'Crédito Parcelado' && (
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wide mb-1.5 block">Parcelas</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {parcelasDisponiveis.map(({ parcelas: n, taxa }) => (
                    <button
                      key={n}
                      onClick={() => setParcelas(n)}
                      className={`h-12 rounded-xl text-xs font-medium flex flex-col items-center justify-center transition-all ${
                        parcelas === n
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-sm font-bold">{n}x</span>
                      {taxa > 0 && <span className="text-[10px] opacity-60">+{taxa}%</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Resultado */}
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4 space-y-3">
              {/* Linha: cobrado */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">Valor cobrado</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">R$ {valorTotal.toFixed(2).replace('.', ',')}</span>
              </div>

              {/* Taxas detalhadas */}
              <div className="space-y-1.5 border-t border-gray-100 dark:border-gray-700 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Intermediação ({taxa_intermediacao.toFixed(2)}%)</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">- R$ {(valorTotal * taxa_intermediacao / 100).toFixed(2).replace('.', ',')}</span>
                </div>
                {taxa_parcelamento > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Parcelamento ({taxa_parcelamento.toFixed(2)}%)</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">- R$ {(valorTotal * taxa_parcelamento / 100).toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-700 pt-1.5">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total taxas ({taxa_total.toFixed(2)}%)</span>
                  <span className="text-xs font-medium text-red-500">- R$ {valor_taxa.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              {/* Valor líquido */}
              <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-700 pt-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Você receberá</span>
                <span className="text-xl font-bold text-gray-900 dark:text-white">R$ {valor_liquido.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            {/* Alerta desconto vs taxa */}
            {valorDesconto > 0 && (
              <div className={`flex items-start gap-3 p-3.5 rounded-2xl ${
                taxaMaiorQueDesconto
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : 'bg-emerald-50 dark:bg-emerald-900/20'
              }`}>
                {taxaMaiorQueDesconto ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">Taxa supera o desconto</p>
                      <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                        Desconto concedido: R$ {valorDesconto.toFixed(2).replace('.', ',')} · Taxa maquininha: R$ {valor_taxa.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Taxa dentro do desconto</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                        Desconto: R$ {valorDesconto.toFixed(2).replace('.', ',')} · Taxa: R$ {valor_taxa.toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}