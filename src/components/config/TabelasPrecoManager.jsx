import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tag, PlusCircle, Edit, Trash2, Star, Percent, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

const defaultForm = {
  nome_tabela: '',
  fator_ajuste: 1,
  is_default: false,
  ativo: true,
  desconto_maximo_vendedor: 5,
  desconto_maximo_gerente: 15,
  requer_aprovacao_acima: 0,
};

export default function TabelasPrecoManager() {
  const [tabelas, setTabelas] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tabelaSelecionada, setTabelaSelecionada] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [showPolitica, setShowPolitica] = useState(false);
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
      toast({ title: "Tabela atualizada!", className: "bg-white dark:bg-gray-800" });
    } else {
      await base44.entities.TabelaPreco.create(formData);
      toast({ title: "Tabela criada!", className: "bg-white dark:bg-gray-800" });
    }
    loadTabelas();
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id) => {
    if (confirm('Deseja realmente excluir esta tabela?')) {
      await base44.entities.TabelaPreco.delete(id);
      loadTabelas();
      toast({ title: "Tabela excluída!", className: "bg-white dark:bg-gray-800" });
    }
  };

  const handleEdit = (tabela) => {
    setTabelaSelecionada(tabela);
    setFormData({
      nome_tabela: tabela.nome_tabela,
      fator_ajuste: tabela.fator_ajuste,
      is_default: tabela.is_default || false,
      ativo: tabela.ativo,
      desconto_maximo_vendedor: tabela.desconto_maximo_vendedor ?? 5,
      desconto_maximo_gerente: tabela.desconto_maximo_gerente ?? 15,
      requer_aprovacao_acima: tabela.requer_aprovacao_acima ?? 0,
    });
    setShowPolitica(false);
    setIsDialogOpen(true);
  };

  const handleSetDefault = async (tabela) => {
    const outrasComDefault = tabelas.filter(t => t.is_default && t.id !== tabela.id);
    for (const t of outrasComDefault) {
      await base44.entities.TabelaPreco.update(t.id, { is_default: false });
    }
    await base44.entities.TabelaPreco.update(tabela.id, { is_default: true });
    toast({ title: `"${tabela.nome_tabela}" definida como padrão`, className: "bg-white dark:bg-gray-800" });
    loadTabelas();
  };

  const resetForm = () => {
    setTabelaSelecionada(null);
    setFormData(defaultForm);
    setShowPolitica(false);
  };

  const calcularPercentual = (fator) => ((fator - 1) * 100).toFixed(1);

  return (
    <div className="space-y-4 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" /> Tabelas de Preço
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Cada tabela define preços e política comercial de desconto
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
            return (
              <div
                key={tabela.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm ${
                  tabela.is_default
                    ? 'bg-gray-800 dark:bg-gray-700 text-white'
                    : 'bg-white dark:bg-gray-800'
                }`}
              >
                {/* Ícone padrão */}
                <button
                  onClick={() => !tabela.is_default && handleSetDefault(tabela)}
                  title={tabela.is_default ? 'Tabela padrão do sistema' : 'Definir como padrão'}
                  className={`flex-shrink-0 ${
                    tabela.is_default
                      ? 'text-yellow-400 cursor-default'
                      : 'text-gray-200 dark:text-gray-600 hover:text-yellow-400'
                  }`}
                >
                  <Star className={`w-4 h-4 ${tabela.is_default ? 'fill-yellow-400' : ''}`} />
                </button>

                {/* Nome + info */}
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
                  <div className={`text-xs mt-0.5 flex flex-wrap gap-3 ${tabela.is_default ? 'text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                    <span>
                      Fator {tabela.fator_ajuste.toFixed(2)} —{' '}
                      <span className={pctNum > 0 ? 'text-green-400' : pctNum < 0 ? 'text-red-400' : ''}>
                        {pctNum > 0 ? '+' : ''}{pct}%
                      </span>
                    </span>
                    {(tabela.desconto_maximo_vendedor || tabela.desconto_maximo_gerente) ? (
                      <span className="flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        Vend. {tabela.desconto_maximo_vendedor ?? 5}% · Ger. {tabela.desconto_maximo_gerente ?? 15}%
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(tabela)}
                    className={`h-7 w-7 ${tabela.is_default ? 'text-gray-300 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(tabela.id)}
                    className={`h-7 w-7 ${tabela.is_default ? 'text-gray-300 hover:text-red-300 hover:bg-white/10' : 'text-gray-400 hover:text-red-500'}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
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

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm dark:bg-gray-900 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-400" />
              {tabelaSelecionada ? 'Editar Tabela' : 'Nova Tabela de Preço'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Nome da Tabela</Label>
              <Input
                value={formData.nome_tabela}
                onChange={e => setFormData({ ...formData, nome_tabela: e.target.value })}
                placeholder="Ex: Varejo, Atacado, VIP..."
                className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-9 text-sm"
              />
            </div>

            {/* Fator */}
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Fator de Ajuste de Preço</Label>
              <Input
                type="number" step="0.01"
                value={formData.fator_ajuste}
                onChange={e => setFormData({ ...formData, fator_ajuste: parseFloat(e.target.value) || 1 })}
                className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-9 text-sm"
              />
              <p className="text-[11px] text-gray-400">
                1.0 = sem alteração &nbsp;·&nbsp; 1.1 = +10% &nbsp;·&nbsp; 0.9 = −10%
                {formData.fator_ajuste && (
                  <span className="ml-2 font-medium text-gray-600 dark:text-gray-300">
                    ({parseFloat(calcularPercentual(formData.fator_ajuste)) > 0 ? '+' : ''}{calcularPercentual(formData.fator_ajuste)}%)
                  </span>
                )}
              </p>
            </div>

            {/* Toggle padrão */}
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

            {/* Política de Desconto - expansível */}
            <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPolitica(!showPolitica)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-gray-400" />
                  Política Comercial de Desconto
                </span>
                {showPolitica ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
              </button>

              {showPolitica && (
                <div className="px-3 py-3 space-y-3 bg-white dark:bg-gray-900">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Máx. Vendedor (%)</Label>
                      <Input
                        type="number" step="0.5" min="0"
                        value={formData.desconto_maximo_vendedor}
                        onChange={e => setFormData({ ...formData, desconto_maximo_vendedor: parseFloat(e.target.value) || 0 })}
                        className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Máx. Gerente (%)</Label>
                      <Input
                        type="number" step="0.5" min="0"
                        value={formData.desconto_maximo_gerente}
                        onChange={e => setFormData({ ...formData, desconto_maximo_gerente: parseFloat(e.target.value) || 0 })}
                        className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Exige aprovação Admin acima de (%)</Label>
                    <Input
                      type="number" step="0.5" min="0"
                      value={formData.requer_aprovacao_acima}
                      onChange={e => setFormData({ ...formData, requer_aprovacao_acima: parseFloat(e.target.value) || 0 })}
                      className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm h-9 text-sm"
                    />
                    <p className="text-[11px] text-gray-400">Descontos acima deste valor exigem autenticação de admin</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)} className="h-8 text-xs">
              Cancelar
            </Button>
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