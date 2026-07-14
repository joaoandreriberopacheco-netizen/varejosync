import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

export default function CamposEdicaoSistema({ produto, campo, valor, onSave, onCancel }) {
  const [tempValue, setTempValue] = useState(valor);

  const handleSave = async () => {
    if (tempValue === valor) {
      onCancel();
      return;
    }
    
    const parsed = parseFloat(tempValue) || 0;
    await onSave(campo, parsed);
  };

  const getLabelCampo = () => {
    const labels = {
      casas_decimais: 'Casas Decimais',
      tempo_reposicao_dias: 'Tempo Reposição',
      estoque_minimo: 'Est. Mínimo',
      estoque_ideal: 'Est. Ideal',
      estoque_maximo: 'Est. Máximo',
      unidades_por_pacote: 'Qtd/Pacote',
      peso_kg: 'Peso (kg)',
    };
    return labels[campo] || campo;
  };

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        step={campo === 'peso_kg' ? '0.001' : campo === 'casas_decimais' ? '1' : '0.0001'}
        min="0"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        className="h-7 text-xs px-2 w-16 bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
        autoFocus
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
        onClick={handleSave}
      >
        <Check className="w-3.5 h-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        onClick={onCancel}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}