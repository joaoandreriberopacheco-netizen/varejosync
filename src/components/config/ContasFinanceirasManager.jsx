import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Wallet, Edit, Trash2, PlusCircle, Scale } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import AjusteSaldoDialog from '@/components/config/AjusteSaldoDialog';

export default function ContasFinanceirasManager() {
  const [contas, setContas] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAjusteOpen, setIsAjusteOpen] = useState(false);
  const [selectedConta, setSelectedConta] = useState(null);
  const [formData, setFormData] = useState({
    nome: '', tipo: 'Conta Bancária', banco: '', agencia: '', conta: '',
    saldo_inicial: 0, saldo_atual: 0, cor: '#10B981', observacoes: '', ativo: true, is_caixa_pdv: false
  });
  const { toast } = useToast();

  useEffect(() => { loadContas(); }, []);

  const loadContas = async () => {
    const data = await base44.entities.ContasFinanceiras.list();
    setContas(data);
  };

  const handleEdit = (conta) => { setSelectedConta(conta); setFormData(conta); setIsDialogOpen(true); };

  const handleAddNew = () => {
    setSelectedConta(null);
    setFormData({ nome: '', tipo: 'Conta Bancária', banco: '', agencia: '', conta: '',
      saldo_inicial: 0, saldo_atual: 0, cor: '#10B981', observacoes: '', ativo: true, is_caixa_pdv: false });
    setIsDialogOpen(true);
  };

  const handleAjusteSaldo = (conta) => {
    setSelectedConta(conta);
    setIsAjusteOpen(true);
  };

  const handleDelete = async (conta) => {
    if (!confirm(`Excluir conta "${conta.nome}"?`)) return;
    await base44.entities.ContasFinanceiras.delete(conta.id);
    toast({ title: "Conta excluída!", className: "bg-card" });
    loadContas();
  };

  const handleSave = async () => {
    const dataToSave = { ...formData };
    if (!selectedConta) dataToSave.saldo_atual = dataToSave.saldo_inicial;
    if (selectedConta) {
      await base44.entities.ContasFinanceiras.update(selectedConta.id, dataToSave);
    } else {
      await base44.entities.ContasFinanceiras.create(dataToSave);
    }
    toast({ title: "Conta salva!", className: "bg-card" });
    loadContas(); setIsDialogOpen(false);
  };

  const fmtR = (n) => (n ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Wallet className="w-4 h-4 text-muted-foreground" /> Contas Financeiras
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Caixas físicos, contas bancárias e carteiras digitais</p>
        </div>
        <Button onClick={handleAddNew} size="sm"
          className="bg-primary hover:bg-background dark:bg-muted dark:text-foreground text-white gap-1.5 h-8 px-3 text-xs">
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nova Conta</span>
        </Button>
      </div>

      {contas.length === 0 ? (
        <div className="text-center py-12 rounded-xl bg-muted/50/50">
          <Wallet className="w-10 h-10 mx-auto mb-3 text-muted-foreground dark:text-foreground/90" />
          <p className="text-sm text-muted-foreground mb-4">Nenhuma conta cadastrada</p>
          <Button onClick={handleAddNew} size="sm" className="bg-primary text-white gap-1.5">
            <PlusCircle className="w-3.5 h-3.5" /> Criar Primeira Conta
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {contas.map(conta => (
            <div key={conta.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm ${conta.ativo ? 'bg-card' : 'bg-muted/50/50'}`}>
              {/* Dot de cor */}
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: conta.cor }} />
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground truncate">{conta.nome}</span>
                  {conta.is_caixa_pdv && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">PDV</span>
                  )}
                  {!conta.ativo && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">inativa</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-2">
                  <span>{conta.tipo}</span>
                  {conta.banco && <span>· {conta.banco}{conta.agencia ? ` ag.${conta.agencia}` : ''}</span>}
                </div>
              </div>
              {/* Saldo */}
              <div className="flex-shrink-0 text-right">
                <div className="text-sm font-semibold text-foreground/90 tabular-nums">
                  R$ {fmtR(conta.saldo_atual)}
                </div>
              </div>
              {/* Ações */}
              <div className="flex gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" onClick={() => handleAjusteSaldo(conta)}
                  className="h-7 w-7 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400">
                  <Scale className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(conta)}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground/90 dark:hover:text-muted-foreground">
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(conta)}
                  className="h-7 w-7 text-muted-foreground hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AjusteSaldoDialog
        open={isAjusteOpen}
        onOpenChange={setIsAjusteOpen}
        conta={selectedConta}
        onSaved={loadContas}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm dark:bg-background dark:border-border/40 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              {selectedConta ? 'Editar Conta' : 'Nova Conta Financeira'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Nome *</Label>
              <Input placeholder="Ex: Caixa Loja 1, Banco Itaú" value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                className="bg-muted/50 border-0 shadow-sm h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Tipo *</Label>
                <Select value={formData.tipo} onValueChange={v => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger className="bg-muted/50 border-0 shadow-sm h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-muted">
                    {['Caixa Físico','Conta Bancária','Carteira Digital','Poupança','Investimento'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Cor</Label>
                <Input type="color" value={formData.cor}
                  onChange={e => setFormData({ ...formData, cor: e.target.value })}
                  className="bg-muted/50 border-0 shadow-sm h-9 px-2" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Banco</Label>
                <Input value={formData.banco} onChange={e => setFormData({ ...formData, banco: e.target.value })}
                  placeholder="Itaú" className="bg-muted/50 border-0 shadow-sm h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Agência</Label>
                <Input value={formData.agencia} onChange={e => setFormData({ ...formData, agencia: e.target.value })}
                  placeholder="0000" className="bg-muted/50 border-0 shadow-sm h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground font-medium">Conta</Label>
                <Input value={formData.conta} onChange={e => setFormData({ ...formData, conta: e.target.value })}
                  placeholder="00000-0" className="bg-muted/50 border-0 shadow-sm h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Saldo Inicial</Label>
              <Input type="number" step="0.01" value={formData.saldo_inicial} disabled={!!selectedConta}
                onChange={e => setFormData({ ...formData, saldo_inicial: parseFloat(e.target.value) || 0 })}
                className="bg-muted/50 border-0 shadow-sm h-9 text-sm" />
              {!!selectedConta && <p className="text-[11px] text-muted-foreground">Saldo inicial não pode ser editado</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground font-medium">Observações</Label>
              <Input value={formData.observacoes} onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Informações adicionais..." className="bg-muted/50 border-0 shadow-sm h-9 text-sm" />
            </div>
            <div className="space-y-2 pt-1">
              {[
                { key: 'ativo', label: 'Conta ativa' },
                { key: 'is_caixa_pdv', label: 'Usar como Caixa PDV', desc: 'Pode ser atribuída a um usuário de ponto de venda' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-start gap-2 px-3 py-2 rounded-xl bg-muted/50">
                  <input type="checkbox" checked={formData[key]}
                    onChange={e => setFormData({ ...formData, [key]: e.target.checked })}
                    className="w-4 h-4 mt-0.5 accent-gray-700" />
                  <div>
                    <p className="text-xs font-medium text-foreground/90">{label}</p>
                    {desc && <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)} className="h-8 text-xs">Cancelar</Button>
            <Button size="sm" onClick={handleSave}
              className="bg-primary hover:bg-background dark:bg-muted dark:text-foreground text-white h-8 text-xs">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}