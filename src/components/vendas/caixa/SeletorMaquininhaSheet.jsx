import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CreditCard, ChevronRight, AlertCircle } from 'lucide-react';

const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard'];

/**
 * Sheet inline para selecionar maquininha + bandeira ao usar Débito ou Crédito
 * Props:
 *   visible: boolean
 *   modalidade: 'debito' | 'credito'
 *   parcelas: number (só para crédito)
 *   onSelect: ({ maquininha, bandeira, taxa, prazo_dias }) => void
 *   onCancel: () => void
 */
export default function SeletorMaquininhaSheet({ visible, modalidade, parcelas: parcelasIniciais = 1, onSelect, onCancel }) {
  const [maquininhas, setMaquininhas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selecionada, setSelecionada] = useState(null);
  const [bandeiraSelecionada, setBandeiraSelecionada] = useState('');
  const [parcelas, setParcelas] = useState(parcelasIniciais);

  useEffect(() => {
    if (visible) {
      setSelecionada(null);
      setBandeiraSelecionada('');
      loadMaquininhas();
    }
  }, [visible]);

  const loadMaquininhas = async () => {
    setLoading(true);
    const lista = await base44.entities.Maquininha.filter({ ativo: true });
    setMaquininhas(lista);
    setLoading(false);
  };

  const getTaxaParaMaquininha = (maq, bandeira) => {
    const cfg = (maq.bandeiras || []).find(b => b.bandeira === bandeira);
    if (!cfg) return 0;
    if (modalidade === 'debito') return cfg.taxa_debito || 0;
    if (parcelas === 1) return cfg.taxa_credito_1x || 0;
    if (parcelas <= 6) return cfg.taxa_credito_2_6x || 0;
    return cfg.taxa_credito_7_12x || 0;
  };

  const getPrazoDias = (maq) => {
    if (modalidade === 'debito') return maq.prazo_debito_dias ?? 1;
    return maq.prazo_credito_vista_dias ?? 30;
  };

  const handleConfirmar = () => {
    if (!selecionada || !bandeiraSelecionada) return;
    const taxa = getTaxaParaMaquininha(selecionada, bandeiraSelecionada);
    const prazo = getPrazoDias(selecionada);
    onSelect({ maquininha: selecionada, bandeira: bandeiraSelecionada, taxa, prazo_dias: prazo });
  };

  const bandeirasDisponiveis = selecionada
    ? (selecionada.bandeiras || []).map(b => b.bandeira).filter(Boolean)
    : BANDEIRAS;

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-2xl md:rounded-2xl shadow-2xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-1">
          <CreditCard className="w-5 h-5 text-gray-500" />
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white font-glacial">
              {modalidade === 'debito' ? 'Cartão Débito' : `Cartão Crédito${parcelas > 1 ? ` ${parcelas}x` : ''}`}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">Selecione a maquininha e bandeira</p>
          </div>
        </div>

        {loading && (
          <div className="py-6 text-center text-gray-400 text-sm">Carregando maquininhas...</div>
        )}

        {!loading && maquininhas.length === 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Nenhuma maquininha cadastrada. Cadastre em Configurações → Maquininhas.
            </p>
          </div>
        )}

        {!loading && maquininhas.length > 0 && (
          <>
            {/* Maquininhas */}
            <div className="space-y-1">
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">Maquininha</p>
              {maquininhas.map(maq => (
                <button
                  key={maq.id}
                  onClick={() => { setSelecionada(maq); setBandeiraSelecionada(''); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors text-left ${
                    selecionada?.id === maq.id
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div>
                    <div className="font-medium text-sm">{maq.nome}</div>
                    {maq.adquirente && <div className="text-xs opacity-60">{maq.adquirente}</div>}
                  </div>
                  <div className="text-xs opacity-60">
                    {modalidade === 'debito'
                      ? `D+${maq.prazo_debito_dias ?? 1}`
                      : `D+${maq.prazo_credito_vista_dias ?? 30}`}
                  </div>
                </button>
              ))}
            </div>

            {/* Bandeiras */}
            {selecionada && (
              <div className="space-y-1">
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">Bandeira</p>
                <div className="grid grid-cols-3 gap-2">
                  {bandeirasDisponiveis.map(b => {
                    const taxa = getTaxaParaMaquininha(selecionada, b);
                    return (
                      <button
                        key={b}
                        onClick={() => setBandeiraSelecionada(b)}
                        className={`flex flex-col items-center py-2 px-1 rounded-xl transition-colors text-sm ${
                          bandeiraSelecionada === b
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="font-medium">{b}</span>
                        {taxa > 0 && <span className="text-xs opacity-60">{taxa}%</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Resumo taxa */}
            {selecionada && bandeiraSelecionada && (() => {
              const taxa = getTaxaParaMaquininha(selecionada, bandeiraSelecionada);
              const prazo = getPrazoDias(selecionada);
              return (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                  <span>Taxa: <b className="text-gray-700 dark:text-gray-200">{taxa}%</b></span>
                  <span>Recebimento: <b className="text-gray-700 dark:text-gray-200">D+{prazo}</b></span>
                  <span>Conta: <b className="text-gray-700 dark:text-gray-200">{selecionada.conta_destino_nome || '—'}</b></span>
                </div>
              );
            })()}

            {/* Botões */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={onCancel}
                className="flex-1 h-11 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={!selecionada || !bandeiraSelecionada}
                className="flex-1 h-11 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1"
              >
                Confirmar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}