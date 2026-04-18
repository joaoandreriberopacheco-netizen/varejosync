import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Boxes } from 'lucide-react';

export default function UnidadesAlternativasEditor({ unidades = [], unidadePrincipal = 'UN', onChange }) {
  const handleItemChange = (index, field, value) => {
    const next = [...unidades];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const handleAdd = () => {
    onChange([
      ...unidades,
      { unidade: '', fator_conversao: 1, preco_venda: 0, rotulo: '', ajuste_percentual: 0, ativo: true },
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
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="border-0 shadow-sm">
          <Plus className="w-4 h-4 mr-1" />
          Adicionar
        </Button>
      </div>

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
