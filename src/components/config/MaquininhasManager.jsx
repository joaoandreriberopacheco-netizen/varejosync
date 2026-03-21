import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard'];

const PARCELAS_PARCELAMENTO = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const bandeiraPadrao = (b) => ({
  bandeira: b,
  taxa_debito: 0,
  taxa_credito_1x: 0,
  taxa_credito_2_6x: 0,
  taxa_credito_7_12x: 0,
  taxas_parcelamento_vendedor: PARCELAS_PARCELAMENTO.map(n => ({ parcelas: n, taxa_percentual: 0 }))
});

const maqVazia = () => ({
  nome: '',
  adquirente: '',
  conta_destino_id: '',
  conta_destino_nome: '',
  prazo_debito_dias: 1,
  prazo_credito_vista_dias: 30,
  prazo_credito_parcelado_dias: 30,
  bandeiras: BANDEIRAS.map(bandeiraPadrao),
  ativo: true,
});

export default function MaquininhasManager() {
  const [maquininhas, setMaquininhas] = useState([]);
  const [contas, setContas] = useState([]);
  const [editando, setEditando] = useState(null);
  const [expandido, setExpandido] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [mlist, clist] = await Promise.all([
      base44.entities.Maquininha.list(),
      base44.entities.ContasFinanceiras.list(),
    ]);
    setMaquininhas(mlist);
    setContas(clist);
    setLoading(false);
  };

  const handleSalvar = async () => {
    if (!editando.nome.trim()) { toast.error('Informe o nome da maquininha'); return; }
    const contaSel = contas.find(c => c.id === editando.conta_destino_id);
    const dados = { ...editando, conta_destino_nome: contaSel?.nome || '' };

    if (editando.id) {
      await base44.entities.Maquininha.update(editando.id, dados);
      toast.success('Maquininha atualizada');
    } else {
      await base44.entities.Maquininha.create(dados);
      toast.success('Maquininha criada');
    }
    setEditando(null);
    load();
  };

  const handleExcluir = async (id) => {
    await base44.entities.Maquininha.delete(id);
    toast.success('Maquininha removida');
    load();
  };

  const updateBandeira = (bandeira, campo, valor) => {
    setEditando(prev => ({
      ...prev,
      bandeiras: (prev.bandeiras || []).map(b =>
        b.bandeira === bandeira ? { ...b, [campo]: parseFloat(valor) || 0 } : b
      ),
    }));
  };

  const updateTaxaParcelamento = (bandeira, parcelas, valor) => {
    setEditando(prev => ({
      ...prev,
      bandeiras: (prev.bandeiras || []).map(b => {
        if (b.bandeira !== bandeira) return b;
        const taxasAtuais = b.taxas_parcelamento_vendedor || PARCELAS_PARCELAMENTO.map(n => ({ parcelas: n, taxa_percentual: 0 }));
        return {
          ...b,
          taxas_parcelamento_vendedor: taxasAtuais.map(t =>
            t.parcelas === parcelas ? { ...t, taxa_percentual: parseFloat(valor) || 0 } : t
          )
        };
      })
    }));
  };

  const [bandeiraExpandida, setBandeiraExpandida] = useState(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white font-glacial">Maquininhas</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Taxas por bandeira e prazos de recebimento</p>
        </div>
        <Button onClick={() => setEditando(maqVazia())} size="sm" className="gap-1">
          <Plus className="w-4 h-4" /> Nova
        </Button>
      </div>

      {loading && <div className="text-sm text-gray-400 py-4 text-center">Carregando...</div>}

      <div className="space-y-2">
        {maquininhas.map(maq => (
          <div key={maq.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{maq.nome}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {maq.adquirente || '—'} · Débito D+{maq.prazo_debito_dias ?? 1} · Crédito D+{maq.prazo_credito_vista_dias ?? 30}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setExpandido(expandido === maq.id ? null : maq.id)} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                  {expandido === maq.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                <button onClick={() => setEditando({ ...maq, bandeiras: maq.bandeiras?.length ? maq.bandeiras.map(b => ({ ...bandeiraPadrao(b.bandeira), ...b, taxas_parcelamento_vendedor: b.taxas_parcelamento_vendedor?.length ? b.taxas_parcelamento_vendedor : PARCELAS_PARCELAMENTO.map(n => ({ parcelas: n, taxa_percentual: 0 })) })) : BANDEIRAS.map(bandeiraPadrao) })} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                  <Pencil className="w-4 h-4 text-gray-400" />
                </button>
                <button onClick={() => handleExcluir(maq.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
            {expandido === maq.id && (
              <div className="border-t border-gray-50 dark:border-gray-700 px-4 py-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400 dark:text-gray-500">
                        <th className="text-left py-1 font-medium">Bandeira</th>
                        <th className="text-right py-1 font-medium">Débito</th>
                        <th className="text-right py-1 font-medium">Créd 1x</th>
                        <th className="text-right py-1 font-medium">Créd 2-6x</th>
                        <th className="text-right py-1 font-medium">Créd 7-12x</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(maq.bandeiras || []).map(b => (
                        <tr key={b.bandeira} className="border-t border-gray-50 dark:border-gray-700/50">
                          <td className="py-1.5 font-medium text-gray-700 dark:text-gray-300">{b.bandeira}</td>
                          <td className="py-1.5 text-right text-gray-500 dark:text-gray-400">{b.taxa_debito ?? 0}%</td>
                          <td className="py-1.5 text-right text-gray-500 dark:text-gray-400">{b.taxa_credito_1x ?? 0}%</td>
                          <td className="py-1.5 text-right text-gray-500 dark:text-gray-400">{b.taxa_credito_2_6x ?? 0}%</td>
                          <td className="py-1.5 text-right text-gray-500 dark:text-gray-400">{b.taxa_credito_7_12x ?? 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dialog de edição */}
      <Dialog open={!!editando} onOpenChange={() => setEditando(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="font-glacial">{editando?.id ? 'Editar Maquininha' : 'Nova Maquininha'}</DialogTitle>
          </DialogHeader>
          {editando && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Nome *</label>
                  <Input value={editando.nome} onChange={e => setEditando(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: PagSeguro Loja 1" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Adquirente</label>
                  <Input value={editando.adquirente || ''} onChange={e => setEditando(p => ({ ...p, adquirente: e.target.value }))} placeholder="PagSeguro, Stone..." />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Conta Destino</label>
                  <select
                    value={editando.conta_destino_id || ''}
                    onChange={e => setEditando(p => ({ ...p, conta_destino_id: e.target.value }))}
                    className="w-full h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200"
                  >
                    <option value="">Selecionar conta...</option>
                    {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Débito (dias)</label>
                  <Input type="number" value={editando.prazo_debito_dias ?? 1} onChange={e => setEditando(p => ({ ...p, prazo_debito_dias: parseInt(e.target.value) || 1 }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Créd. Vista (dias)</label>
                  <Input type="number" value={editando.prazo_credito_vista_dias ?? 30} onChange={e => setEditando(p => ({ ...p, prazo_credito_vista_dias: parseInt(e.target.value) || 30 }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Créd. Parc. (dias)</label>
                  <Input type="number" value={editando.prazo_credito_parcelado_dias ?? 30} onChange={e => setEditando(p => ({ ...p, prazo_credito_parcelado_dias: parseInt(e.target.value) || 30 }))} />
                </div>
              </div>

              {/* Taxas por bandeira */}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Taxas por Bandeira (%)</p>
                <div className="space-y-1">
                  {(editando.bandeiras || []).map(b => (
                    <div key={b.bandeira} className="border border-gray-100 dark:border-gray-700/50 rounded-xl overflow-hidden">
                      {/* Linha de taxas base */}
                      <div className="flex items-center gap-1 px-2 py-2">
                        <button
                          type="button"
                          onClick={() => setBandeiraExpandida(bandeiraExpandida === b.bandeira ? null : b.bandeira)}
                          className="text-xs font-medium text-gray-700 dark:text-gray-300 w-20 text-left flex items-center gap-1"
                        >
                          {b.bandeira}
                          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${bandeiraExpandida === b.bandeira ? 'rotate-180' : ''}`} />
                        </button>
                        {[
                          { campo: 'taxa_debito', label: 'Déb' },
                          { campo: 'taxa_credito_1x', label: '1x' },
                          { campo: 'taxa_credito_2_6x', label: '2-6x' },
                          { campo: 'taxa_credito_7_12x', label: '7-12x' },
                        ].map(({ campo, label }) => (
                          <div key={campo} className="flex-1 flex flex-col items-center">
                            <span className="text-[9px] text-gray-400 mb-0.5">{label}</span>
                            <input
                              type="number" step="0.01"
                              value={b[campo] ?? 0}
                              onChange={e => updateBandeira(b.bandeira, campo, e.target.value)}
                              className="w-full h-7 text-center text-xs bg-gray-50 dark:bg-gray-700 rounded-lg focus:outline-none dark:text-gray-200"
                            />
                          </div>
                        ))}
                      </div>
                      {/* Taxas de parcelamento expandidas */}
                      {bandeiraExpandida === b.bandeira && (
                        <div className="border-t border-gray-100 dark:border-gray-700/50 px-2 py-2 bg-gray-50/50 dark:bg-gray-800/30">
                          <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-wider">Taxa Parcelamento Vendedor (por nº de parcelas)</p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {(b.taxas_parcelamento_vendedor || PARCELAS_PARCELAMENTO.map(n => ({ parcelas: n, taxa_percentual: 0 }))).map(t => (
                              <div key={t.parcelas} className="flex flex-col items-center">
                                <span className="text-[9px] text-gray-400 mb-0.5">{t.parcelas}x</span>
                                <input
                                  type="number" step="0.01"
                                  value={t.taxa_percentual ?? 0}
                                  onChange={e => updateTaxaParcelamento(b.bandeira, t.parcelas, e.target.value)}
                                  className="w-full h-7 text-center text-xs bg-white dark:bg-gray-700 rounded-lg focus:outline-none dark:text-gray-200 border border-gray-100 dark:border-gray-600"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditando(null)} className="flex-1">Cancelar</Button>
                <Button onClick={handleSalvar} className="flex-1">Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}