import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard'];

const PARCELAS_PADRAO = [2,3,4,5,6,7,8,9,10,11,12];

const bandeiraPadrao = (b) => ({
  bandeira: b,
  taxa_debito: 0,
  taxa_credito_1x: 0,
  taxa_intermediacao_parcelado: 0,
  taxas_parcelamento_vendedor: PARCELAS_PADRAO.map(p => ({ parcelas: p, taxa_parcelamento_percentual: 0 })),
  taxa_credito_7_12x: 0
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
        const existing = b.taxas_parcelamento_vendedor || PARCELAS_PADRAO.map(p => ({ parcelas: p, taxa_parcelamento_percentual: 0 }));
        return {
          ...b,
          taxas_parcelamento_vendedor: existing.map(t =>
            t.parcelas === parcelas ? { ...t, taxa_parcelamento_percentual: parseFloat(valor) || 0 } : t
          )
        };
      }),
    }));
  };

  const [bandeirExpandida, setBandeirExpandida] = useState(null);

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
                <button onClick={() => setEditando({ ...maq, bandeiras: (maq.bandeiras?.length ? maq.bandeiras : BANDEIRAS.map(bandeiraPadrao)).map(b => ({ ...bandeiraPadrao(b.bandeira), ...b, taxas_parcelamento_vendedor: b.taxas_parcelamento_vendedor?.length ? b.taxas_parcelamento_vendedor : PARCELAS_PADRAO.map(p => ({ parcelas: p, taxa_parcelamento_percentual: 0 })) })) })} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
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
                <div className="space-y-3">
                  {(editando.bandeiras || []).map(b => (
                    <div key={b.bandeira} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl overflow-hidden">
                      {/* Linha principal */}
                      <div className="px-3 py-2 flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-20">{b.bandeira}</span>
                        <div className="flex-1 grid grid-cols-3 gap-1.5">
                          <div>
                            <div className="text-[9px] text-gray-400 mb-0.5 text-center">Débito</div>
                            <input type="number" step="0.01" value={b.taxa_debito ?? 0}
                              onChange={e => updateBandeira(b.bandeira, 'taxa_debito', e.target.value)}
                              className="w-full h-7 text-center text-xs bg-white dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 dark:text-gray-200" />
                          </div>
                          <div>
                            <div className="text-[9px] text-gray-400 mb-0.5 text-center">Créd 1x</div>
                            <input type="number" step="0.01" value={b.taxa_credito_1x ?? 0}
                              onChange={e => updateBandeira(b.bandeira, 'taxa_credito_1x', e.target.value)}
                              className="w-full h-7 text-center text-xs bg-white dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 dark:text-gray-200" />
                          </div>
                          <div>
                            <div className="text-[9px] text-gray-400 mb-0.5 text-center">Interm. Parc.</div>
                            <input type="number" step="0.01" value={b.taxa_intermediacao_parcelado ?? 0}
                              onChange={e => updateBandeira(b.bandeira, 'taxa_intermediacao_parcelado', e.target.value)}
                              className="w-full h-7 text-center text-xs bg-white dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 dark:text-gray-200" />
                          </div>
                        </div>
                        <button onClick={() => setBandeirExpandida(bandeirExpandida === b.bandeira ? null : b.bandeira)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white dark:hover:bg-gray-700">
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${bandeirExpandida === b.bandeira ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      {/* Taxas parcelamento expandidas */}
                      {bandeirExpandida === b.bandeira && (
                        <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700 pt-2">
                          <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-2">Taxa Parcelamento Vendedor por Parcelas (%)</p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {(b.taxas_parcelamento_vendedor || PARCELAS_PADRAO.map(p => ({ parcelas: p, taxa_parcelamento_percentual: 0 }))).map(t => (
                              <div key={t.parcelas}>
                                <div className="text-[9px] text-gray-400 mb-0.5 text-center">{t.parcelas}x</div>
                                <input type="number" step="0.01" value={t.taxa_parcelamento_percentual ?? 0}
                                  onChange={e => updateTaxaParcelamento(b.bandeira, t.parcelas, e.target.value)}
                                  className="w-full h-7 text-center text-xs bg-white dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 dark:text-gray-200" />
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