import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tag, PlusCircle, Edit, Trash2, Star, ChevronDown, ChevronRight, Percent, AlertCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

// ─── Políticas de Desconto inline para uma tabela ────────────────────────────
function PoliticasList({ tabela }) {
  const [politicas, setPoliticas] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    perfil: 'Vendedor Junior',
    desconto_maximo_percentual: 0,
    requer_aprovacao_acima: 0,
    pode_aprovar_descontos: false,
    observacoes: '',
    ativo: true
  });
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    const all = await base44.entities.PoliticasDesconto.list();
    // Filtra por tabela_id se definido, senão mostra as sem tabela associada
    // Mantemos compatibilidade: mostramos todas (sem filtro por tabela) — 
    // a integração é visual, não um filtro por FK.
    setPoliticas(all);
  };

  const handleSave = async () => {
    if (selected) {
      await base44.entities.PoliticasDesconto.update(selected.id, form);
    } else {
      await base44.entities.PoliticasDesconto.create(form);
    }
    toast({ title: 'Política salva!', className: 'bg-white dark:bg-gray-800' });
    load();
    setIsDialogOpen(false);
  };

  const handleDelete = async (p) => {
    if (!confirm(`Excluir política de "${p.perfil}"?`)) return;
    await base44.entities.PoliticasDesconto.delete(p.id);
    toast({ title: 'Política excluída!', className: 'bg-white dark:bg-gray-800' });
    load();
  };

  const openEdit = (p) => { setSelected(p); setForm(p); setIsDialogOpen(true); };
  const openNew = () => {
    setSelected(null);
    setForm({ perfil: 'Vendedor Junior', desconto_maximo_percentual: 0, requer_aprovacao_acima: 0, pode_aprovar_descontos: false, observacoes: '', ativo: true });
    setIsDialogOpen(true);
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium uppercase tracking-wide">
          <Percent className="w-3 h-3" />
          Políticas Comerciais
        </div>
        <Button onClick={openNew} size="sm" variant="ghost"
          className="h-6 px-2 text-[10px] text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 gap-1">
          <PlusCircle className="w-3 h-3" /> Nova Política
        </Button>
      </div>

      <div className="flex gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/40 text-[11px] text-gray-400">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        Descontos acima do limite exigem aprovação de gerente/admin
      </div>

      {politicas.length === 0 ? (
        <p className="text-[11px] text-gray-400 px-1">Nenhuma política cadastrada.</p>
      ) : (
        <div className="space-y-1.5">
          {politicas.map(p => (
            <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{p.perfil}</span>
                  {!p.ativo && <span className="text-[9px] bg-gray-200 dark:bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full">inativa</span>}
                  {p.pode_aprovar_descontos && <span className="text-[9px] bg-gray-200 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded-full">pode aprovar</span>}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5 flex gap-2">
                  <span>Máx {p.desconto_maximo_percentual}%</span>
                  <span>· Aprova acima de {p.requer_aprovacao_acima}%</span>
                </div>
              </div>
              <div className="flex gap-0.5">
                <Button variant="ghost" size="icon" onClick={() => openEdit(p)}
                  className="h-6 w-6 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                  <Edit className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(p)}
                  className="h-6 w-6 text-gray-400 hover:text-red-500">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm dark:bg-gray-900 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Percent className="w-4 h-4 text-gray-400" />
              {selected ? 'Editar Política' : 'Nova Política de Desconto'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Perfil *</Label>
              <Select value={form.perfil} onValueChange={v => setForm({ ...form, perfil: v })}>
                <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800">
                  {['Admin','Gerente','Vendedor Junior','Estoquista','Financeiro'].map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Desconto Máximo (%)</Label>
                <Input type="number" step="0.1" value={form.desconto_maximo_percentual}
                  onChange={e => setForm({ ...form, desconto_maximo_percentual: parseFloat(e.target.value) || 0 })}
                  className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Aprovação Acima (%)</Label>
                <Input type="number" step="0.1" value={form.requer_aprovacao_acima}
                  onChange={e => setForm({ ...form, requer_aprovacao_acima: parseFloat(e.target.value) || 0 })}
                  className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Observações</Label>
              <Input value={form.observacoes}
                onChange={e => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Ex: Política padrão para vendedores..."
                className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-9 text-sm" />
            </div>
            <div className="space-y-2 pt-1">
              {[
                { key: 'pode_aprovar_descontos', label: 'Pode aprovar descontos de outros' },
                { key: 'ativo', label: 'Política ativa' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <input type="checkbox" checked={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.checked })}
                    className="w-4 h-4 accent-gray-700" />
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)} className="h-8 text-xs">Cancelar</Button>
            <Button size="sm" onClick={handleSave}
              className="bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 text-white h-8 text-xs">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function TabelasPrecoManager() {
  const [tabelas, setTabelas] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tabelaSelecionada, setTabelaSelecionada] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [formData, setFormData] = useState({
    nome_tabela: '',
    fator_ajuste: 1,
    percentual_desconto_maximo: 0,
    is_default: false,
    ativo: true
  });
  const { toast } = useToast();

  useEffect(() => { loadTabelas(); }, []);

  const loadTabelas = async () => {
    const data = await base44.entities.TabelaPreco.list();
    setTabelas(data);
  };

  const handleSave = async () => {
    if (formData.is_default) {
      const outrasComDefault = tabelas.filter(t => t.is_default && t.id !== tabelaSelecionada?.id);
      for (const t of outrasComDefault) {
        await base44.entities.TabelaPreco.update(t.id, { is_default: false });
      }
    }
    if (tabelaSelecionada) {
      await base44.entities.TabelaPreco.update(tabelaSelecionada.id, formData);
      toast({ title: 'Tabela atualizada!', className: 'bg-white dark:bg-gray-800' });
    } else {
      await base44.entities.TabelaPreco.create(formData);
      toast({ title: 'Tabela criada!', className: 'bg-white dark:bg-gray-800' });
    }
    loadTabelas();
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id) => {
    if (confirm('Deseja realmente excluir esta tabela?')) {
      await base44.entities.TabelaPreco.delete(id);
      loadTabelas();
      toast({ title: 'Tabela excluída!', className: 'bg-white dark:bg-gray-800' });
    }
  };

  const handleEdit = (tabela) => {
    setTabelaSelecionada(tabela);
    setFormData({
      nome_tabela: tabela.nome_tabela,
      fator_ajuste: tabela.fator_ajuste,
      percentual_desconto_maximo: tabela.percentual_desconto_maximo || 0,
      is_default: tabela.is_default || false,
      ativo: tabela.ativo
    });
    setIsDialogOpen(true);
  };

  const handleSetDefault = async (tabela) => {
    const outrasComDefault = tabelas.filter(t => t.is_default && t.id !== tabela.id);
    for (const t of outrasComDefault) {
      await base44.entities.TabelaPreco.update(t.id, { is_default: false });
    }
    await base44.entities.TabelaPreco.update(tabela.id, { is_default: true });
    toast({ title: `"${tabela.nome_tabela}" definida como padrão`, className: 'bg-white dark:bg-gray-800' });
    loadTabelas();
  };

  const resetForm = () => {
    setTabelaSelecionada(null);
    setFormData({ nome_tabela: '', fator_ajuste: 1, percentual_desconto_maximo: 0, is_default: false, ativo: true });
  };

  const calcularPercentual = (fator) => ((fator - 1) * 100).toFixed(1);

  return (
    <div className="space-y-4 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" /> Tabelas de Preço & Políticas Comerciais
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Cada tabela rege o ajuste de preço e as políticas de desconto por perfil
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setIsDialogOpen(true); }}
          size="sm"
          className="bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 text-white gap-1.5 h-8 px-3 text-xs"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nova Tabela</span>
        </Button>
      </div>

      {/* Lista */}
      {tabelas.length === 0 ? (
        <div className="text-center py-12 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <Tag className="w-10 h-10 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          <p className="text-sm text-gray-400 mb-4">Nenhuma tabela cadastrada</p>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} size="sm" className="bg-gray-800 text-white gap-1.5">
            <PlusCircle className="w-3.5 h-3.5" /> Criar Primeira Tabela
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {tabelas.map(tabela => {
            const pct = calcularPercentual(tabela.fator_ajuste);
            const pctNum = parseFloat(pct);
            const isExpanded = expandedId === tabela.id;

            return (
              <div
                key={tabela.id}
                className={`rounded-xl shadow-sm overflow-hidden transition-all ${
                  tabela.is_default
                    ? 'bg-gray-800 dark:bg-gray-700'
                    : 'bg-white dark:bg-gray-800'
                }`}
              >
                {/* Linha principal */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Ícone padrão */}
                  <button
                    onClick={() => !tabela.is_default && handleSetDefault(tabela)}
                    title={tabela.is_default ? 'Tabela padrão do sistema' : 'Definir como padrão'}
                    className={`flex-shrink-0 transition-colors ${
                      tabela.is_default
                        ? 'text-yellow-400 cursor-default'
                        : 'text-gray-200 dark:text-gray-600 hover:text-yellow-400'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${tabela.is_default ? 'fill-yellow-400' : ''}`} />
                  </button>

                  {/* Nome + badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium truncate ${tabela.is_default ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                        {tabela.nome_tabela}
                      </span>
                      {tabela.is_default && (
                        <span className="text-[10px] bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded-full font-medium">PADRÃO</span>
                      )}
                      {!tabela.ativo && (
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full">inativa</span>
                      )}
                    </div>
                    <div className={`text-xs mt-0.5 flex gap-3 flex-wrap ${tabela.is_default ? 'text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                      <span>
                        Fator {tabela.fator_ajuste?.toFixed(2)} —{' '}
                        <span className={pctNum > 0 ? 'text-green-400' : pctNum < 0 ? 'text-red-400' : ''}>
                          {pctNum > 0 ? '+' : ''}{pct}%
                        </span>
                      </span>
                      {tabela.percentual_desconto_maximo > 0 && (
                        <span>· Desc. máx {tabela.percentual_desconto_maximo}%</span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-1 flex-shrink-0 items-center">
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => handleEdit(tabela)}
                      className={`h-7 w-7 ${tabela.is_default ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => handleDelete(tabela.id)}
                      className={`h-7 w-7 ${tabela.is_default ? 'text-gray-300 hover:text-red-300 hover:bg-white/10' : 'text-gray-400 hover:text-red-500'}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {/* Expandir políticas */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : tabela.id)}
                      className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${
                        tabela.is_default ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                      title="Políticas de Desconto"
                    >
                      {isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5" />
                        : <ChevronRight className="h-3.5 w-3.5" />
                      }
                    </button>
                  </div>
                </div>

                {/* Políticas expandidas */}
                {isExpanded && (
                  <div className={`px-4 pb-4 border-t ${tabela.is_default ? 'border-white/10' : 'border-gray-100 dark:border-gray-700'}`}>
                    <PoliticasList tabela={tabela} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tabelas.length > 0 && !tabelas.some(t => t.is_default) && (
        <p className="text-xs text-amber-500 dark:text-amber-400 flex items-center gap-1.5 px-1">
          <Star className="w-3.5 h-3.5" />
          Nenhuma tabela definida como padrão. Clique na estrela para definir.
        </p>
      )}

      {/* Dialog de Tabela */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm dark:bg-gray-900 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-400" />
              {tabelaSelecionada ? 'Editar Tabela' : 'Nova Tabela de Preço'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Nome da Tabela</Label>
              <Input
                value={formData.nome_tabela}
                onChange={e => setFormData({ ...formData, nome_tabela: e.target.value })}
                placeholder="Ex: Varejo, Atacado, VIP..."
                className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Fator de Ajuste</Label>
              <Input
                type="number" step="0.01"
                value={formData.fator_ajuste}
                onChange={e => setFormData({ ...formData, fator_ajuste: parseFloat(e.target.value) || 1 })}
                className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-9 text-sm"
              />
              <p className="text-[11px] text-gray-400">
                1.0 = sem alteração &nbsp;·&nbsp; 1.1 = +10% &nbsp;·&nbsp; 0.9 = −10%
              </p>
              {formData.fator_ajuste && (
                <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  Resultado: {parseFloat(calcularPercentual(formData.fator_ajuste)) > 0 ? '+' : ''}{calcularPercentual(formData.fator_ajuste)}% sobre o preço base
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Desconto Máximo Permitido (%)</Label>
              <Input
                type="number" step="0.1" min="0"
                value={formData.percentual_desconto_maximo}
                onChange={e => setFormData({ ...formData, percentual_desconto_maximo: parseFloat(e.target.value) || 0 })}
                className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-9 text-sm"
              />
              <p className="text-[11px] text-gray-400">0 = sem limite definido nesta tabela</p>
            </div>

            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800">
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-yellow-400" />
                  Tabela Padrão do Sistema
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Usada quando o usuário não tem tabela vinculada</p>
              </div>
              <Switch
                checked={formData.is_default}
                onCheckedChange={val => setFormData({ ...formData, is_default: val })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)} className="h-8 text-xs">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 text-white h-8 text-xs"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}