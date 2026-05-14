import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Boxes } from 'lucide-react';
import { toast } from 'sonner';

export default function UnidadesAlternativasEditor({ unidades = [], unidadePrincipal = 'UN', onChange }) {
  const MAX_UNIDADES = 5;
  const handleItemChange = (index, field, value) => {
    if (field === 'fator_conversao') {
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (Number.isFinite(num) && num === 1) {
        toast.error('Alternativa não pode ter fator 1. A unidade base já é fator 1.');
        return;
      }
    }
    const next = [...unidades];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const handleAdd = () => {
    if ((unidades || []).length >= MAX_UNIDADES) {
      toast.error(`Limite atingido: no máximo ${MAX_UNIDADES} unidades alternativas.`);
      return;
    }
    onChange([
      ...unidades,
      { id: crypto.randomUUID(), nome: '', unidade: '', fator_conversao: 2, fator_preco: 1, preco_venda: 0, rotulo: '', ajuste_percentual: 0, ativo: true },
    ]);
  };

  const handleRemove = (index) => {
    onChange(unidades.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-sm text-gray-700 dark:text-gray-300">Unidades alternativas</Label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Fator: quantos {unidadePrincipal || 'UN'} equivalem a <strong>1</strong> desta sigla (ex.: 1 CX = 2,5 M² → fator 2,5).
            Diferença %: negativo vende mais barato que o proporcional, positivo mais caro. Preço fixo (opcional) ignora proporcional e diferença.
            Opcional: % preço vs base (A29) — se preenchido, tem prioridade sobre a combinação fator de preço + diferença % para o cálculo alinhado ao monorepo A29.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="border-0 shadow-sm">
          <Plus className="w-4 h-4 mr-1" />
          Adicionar
        </Button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {(unidades || []).length}/{MAX_UNIDADES} unidades alternativas cadastradas.
      </p>

      {unidades.length === 0 ? (
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-3">
          <Boxes className="w-4 h-4" />
          Nenhuma unidade alternativa cadastrada.
        </div>
      ) : (
        <div className="space-y-3">
          {unidades.map((item, index) => (
            <div key={`${item.unidade || 'nova'}-${index}`} className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-white text-gray-700 dark:bg-gray-900 dark:text-gray-200 border-0 shadow-sm">
                  {item.unidade || `Unidade ${index + 1}`}
                </Badge>
                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemove(index)} className="h-8 w-8 text-gray-500 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Nome</Label>
                  <Input
                    value={item.nome || ''}
                    onChange={(e) => handleItemChange(index, 'nome', e.target.value)}
                    placeholder="Ex.: Caixa master"
                    className="bg-white dark:bg-gray-900 border-0 shadow-sm mb-3"
                  />
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Rótulo (opcional)</Label>
                  <Input
                    value={item.rotulo || ''}
                    onChange={(e) => handleItemChange(index, 'rotulo', e.target.value)}
                    placeholder="Ex.: Caixa fechada, Carrada"
                    className="bg-white dark:bg-gray-900 border-0 shadow-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Sigla</Label>
                  <Input
                    value={item.unidade || ''}
                    onChange={(e) => handleItemChange(index, 'unidade', e.target.value.toUpperCase())}
                    placeholder="CX, PAC, PCT"
                    className="bg-white dark:bg-gray-900 border-0 shadow-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Equivale a quantos {unidadePrincipal || 'UN'}</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={item.fator_conversao ?? 1}
                    onChange={(e) => handleItemChange(index, 'fator_conversao', parseFloat(e.target.value) || 0)}
                    className="bg-white dark:bg-gray-900 border-0 shadow-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Diferença % (sinal)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.ajuste_percentual ?? 0}
                    onChange={(e) => handleItemChange(index, 'ajuste_percentual', parseFloat(e.target.value) || 0)}
                    placeholder="-10 ou +10"
                    className="bg-white dark:bg-gray-900 border-0 shadow-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">% preço vs base (opcional, A29)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={
                      Object.prototype.hasOwnProperty.call(item, 'percentual_preco_vs_principal') &&
                      item.percentual_preco_vs_principal !== '' &&
                      item.percentual_preco_vs_principal != null
                        ? item.percentual_preco_vs_principal
                        : ''
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '' || raw === null) {
                        const next = { ...item };
                        delete next.percentual_preco_vs_principal;
                        const arr = [...unidades];
                        arr[index] = next;
                        onChange(arr);
                        return;
                      }
                      handleItemChange(index, 'percentual_preco_vs_principal', parseFloat(raw) || 0);
                    }}
                    placeholder="vazio = usa diferença % + fator preço"
                    className="bg-white dark:bg-gray-900 border-0 shadow-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Fator de preço</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={item.fator_preco ?? 1}
                    onChange={(e) => handleItemChange(index, 'fator_preco', parseFloat(e.target.value) || 1)}
                    className="bg-white dark:bg-gray-900 border-0 shadow-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Preço venda fixo (opcional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.preco_venda ?? 0}
                    onChange={(e) => handleItemChange(index, 'preco_venda', parseFloat(e.target.value) || 0)}
                    className="bg-white dark:bg-gray-900 border-0 shadow-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
