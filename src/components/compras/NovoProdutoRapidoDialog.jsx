import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Package } from 'lucide-react';

export default function NovoProdutoRapidoDialog({ isOpen, onClose, onSuccess, nomeInicial = '' }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    campo_hierarquico_1: nomeInicial,
    campo_hierarquico_2: '',
    campo_hierarquico_3: '',
    valor_compra: '',
    preco_venda_percentual: '40',
    unidade_principal: 'UN',
    tipo: 'Produto',
  });

  // Sync nome inicial quando dialog abrir
  React.useEffect(() => {
    if (isOpen) {
      setForm(prev => ({ ...prev, campo_hierarquico_1: nomeInicial }));
    }
  }, [isOpen, nomeInicial]);

  const nomeFinal = [form.campo_hierarquico_1, form.campo_hierarquico_2, form.campo_hierarquico_3]
    .filter(Boolean).join(' ');

  const custoNum = parseFloat(form.valor_compra.replace(',', '.')) || 0;
  const markupNum = parseFloat(form.preco_venda_percentual.replace(',', '.')) || 40;
  const precoVenda = custoNum > 0 ? custoNum * (1 + markupNum / 100) : 0;

  const handleSave = async () => {
    if (!form.campo_hierarquico_1.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const novoProduto = await base44.entities.Produto.create({
        campo_hierarquico_1: form.campo_hierarquico_1.trim(),
        campo_hierarquico_2: form.campo_hierarquico_2.trim() || undefined,
        campo_hierarquico_3: form.campo_hierarquico_3.trim() || undefined,
        nome: nomeFinal,
        tipo: form.tipo,
        unidade_principal: form.unidade_principal,
        valor_compra: custoNum,
        preco_venda_padrao: precoVenda,
        preco_venda_percentual: markupNum,
        preco_venda_tipo: 'percentual',
        preco_custo_calculado: custoNum,
        ativo: true,
      });
      toast({ title: 'Produto criado!', description: novoProduto.nome });
      onSuccess(novoProduto);
      onClose();
    } catch (e) {
      toast({ title: 'Erro ao criar produto', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-white dark:bg-gray-900 border-0 shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Package className="w-4 h-4" />
            Novo Produto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1.5 block">
              Nome / Descrição *
            </Label>
            <Input
              placeholder="Ex: Cimento Portland"
              value={form.campo_hierarquico_1}
              onChange={e => setForm(p => ({ ...p, campo_hierarquico_1: e.target.value }))}
              className="bg-gray-50 dark:bg-gray-800 border-0 h-10 shadow-sm text-gray-900 dark:text-white"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1.5 block">
                Variação
              </Label>
              <Input
                placeholder="Ex: 50kg"
                value={form.campo_hierarquico_2}
                onChange={e => setForm(p => ({ ...p, campo_hierarquico_2: e.target.value }))}
                className="bg-gray-50 dark:bg-gray-800 border-0 h-10 shadow-sm text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1.5 block">
                Detalhe
              </Label>
              <Input
                placeholder="Ex: Saco"
                value={form.campo_hierarquico_3}
                onChange={e => setForm(p => ({ ...p, campo_hierarquico_3: e.target.value }))}
                className="bg-gray-50 dark:bg-gray-800 border-0 h-10 shadow-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {nomeFinal !== form.campo_hierarquico_1 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1">
              Nome completo: <span className="text-gray-600 dark:text-gray-300 font-medium">{nomeFinal}</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1.5 block">
                Unidade
              </Label>
              <Select value={form.unidade_principal} onValueChange={v => setForm(p => ({ ...p, unidade_principal: v }))}>
                <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-0 h-10 shadow-sm text-gray-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 border-0 shadow-lg">
                  {['UN', 'CX', 'KG', 'SC', 'MT', 'M2', 'M3', 'LT', 'PC', 'BD', 'RL', 'PR'].map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1.5 block">
                Tipo
              </Label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-0 h-10 shadow-sm text-gray-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 border-0 shadow-lg">
                  <SelectItem value="Produto">Produto</SelectItem>
                  <SelectItem value="Serviço">Serviço</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1.5 block">
                Custo Compra (R$)
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={form.valor_compra}
                onChange={e => setForm(p => ({ ...p, valor_compra: e.target.value }))}
                onFocus={e => e.target.select()}
                className="bg-gray-50 dark:bg-gray-800 border-0 h-10 shadow-sm text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold mb-1.5 block">
                Markup %
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="40"
                value={form.preco_venda_percentual}
                onChange={e => setForm(p => ({ ...p, preco_venda_percentual: e.target.value }))}
                onFocus={e => e.target.select()}
                className="bg-gray-50 dark:bg-gray-800 border-0 h-10 shadow-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {custoNum > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 flex justify-between items-center">
              <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Preço de Venda</span>
              <span className="text-base font-bold text-emerald-800 dark:text-emerald-200">
                R$ {precoVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 justify-end mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-0 shadow-sm rounded-lg h-9"
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.campo_hierarquico_1.trim()}
            className="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 rounded-lg h-9"
          >
            {saving ? 'Criando...' : 'Criar Produto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}