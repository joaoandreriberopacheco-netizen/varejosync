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

  const principal = unidadePrincipal || 'UN';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-sm text-gray-800 dark:text-gray-200">Linhas do array</Label>
            <Badge variant="outline" className="text-[10px] font-medium border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400">
              unidades_alternativas
            </Badge>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl">
            Cada linha abaixo vira um item neste array no produto (sigla, fatores, preço opcional). A unidade base continua na coluna{' '}
            <code className="rounded bg-gray-100 dark:bg-gray-900 px-1 py-0.5 text-[10px]">unidade_principal</code>
            {' '}— não duplique aqui com fator&nbsp;1.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="border-gray-200 dark:border-gray-600 shadow-sm shrink-0 self-start sm:self-auto">
          <Plus className="w-4 h-4 mr-1" />
          Adicionar linha
        </Button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {(unidades || []).length}/{MAX_UNIDADES} alternativas cadastradas.
      </p>

      {unidades.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-white/60 dark:bg-gray-900/50 p-4 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-3">
          <Boxes className="w-4 h-4 shrink-0" />
          Nenhuma unidade alternativa. Use “Adicionar linha” para caixas, pacotes, etc.
        </div>
      ) : (
        <div className="space-y-4">
          {unidades.map((item, index) => (
            <div
              key={`${item.unidade || 'nova'}-${index}`}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 p-4 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100 border-0 font-medium">
                  {item.unidade || `Nova linha ${index + 1}`}
                </Badge>
                <Button type="button" variant="ghost" size="icon" onClick={() => handleRemove(index)} className="h-8 w-8 text-gray-500 hover:text-red-500 shrink-0" title="Remover linha">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Identificação</p>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">Nome</Label>
                    <Input
                      value={item.nome || ''}
                      onChange={(e) => handleItemChange(index, 'nome', e.target.value)}
                      placeholder="Ex.: Caixa master"
                      className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg h-10 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">Rótulo (opcional)</Label>
                      <Input
                        value={item.rotulo || ''}
                        onChange={(e) => handleItemChange(index, 'rotulo', e.target.value)}
                        placeholder="Ex.: Caixa fechada"
                        className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">Sigla</Label>
                      <Input
                        value={item.unidade || ''}
                        onChange={(e) => handleItemChange(index, 'unidade', e.target.value.toUpperCase())}
                        placeholder="CX, PAC, PCT"
                        className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg h-10 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-1 border-t border-gray-100 dark:border-gray-800">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Conversão para a base</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Quantos <span className="font-medium text-gray-700 dark:text-gray-300">{principal}</span> equivalem a <strong>1</strong> desta sigla.
                  Ex.: 1 CX = 2,5 {principal} → fator <strong>2,5</strong>.
                </p>
                <div className="max-w-xs">
                  <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">Fator de conversão</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={item.fator_conversao ?? 1}
                    onChange={(e) => handleItemChange(index, 'fator_conversao', parseFloat(e.target.value) || 0)}
                    className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-1 border-t border-gray-100 dark:border-gray-800">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Preço nesta unidade</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  <strong>Diferença %</strong>: negativo vende mais barato que o proporcional; positivo, mais caro.
                  <strong className="ml-1">Preço fixo</strong> (opcional) ignora proporcional e diferença.
                  <strong className="ml-1">% vs base</strong> (opcional, alinhado A29): se preenchido, tem prioridade sobre fator de preço + diferença %.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">Diferença % (sinal)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.ajuste_percentual ?? 0}
                      onChange={(e) => handleItemChange(index, 'ajuste_percentual', parseFloat(e.target.value) || 0)}
                      placeholder="-10 ou +10"
                      className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg h-10 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">% preço vs base (opcional)</Label>
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
                      placeholder="Vazio = usa % + fator preço"
                      className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg h-10 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">Fator de preço</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={item.fator_preco ?? 1}
                      onChange={(e) => handleItemChange(index, 'fator_preco', parseFloat(e.target.value) || 1)}
                      className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg h-10 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 block">Preço venda fixo (opcional)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.preco_venda ?? 0}
                      onChange={(e) => handleItemChange(index, 'preco_venda', parseFloat(e.target.value) || 0)}
                      className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg h-10 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
