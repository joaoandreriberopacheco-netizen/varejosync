import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Plus, Trash2, Boxes, X } from 'lucide-react';

function fmtNum(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return String(val);
  if (Math.abs(n) < 1000) return n % 1 === 0 ? String(n) : n.toFixed(2);
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

export default function VolumesDialog({ isOpen, onClose, volumes, onChange }) {
  const [descricao, setDescricao] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [pesoUnit, setPesoUnit] = useState('');

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!descricao.trim() || !quantidade) return;
    const qty = parseFloat(quantidade) || 0;
    const pesoU = parseFloat(pesoUnit) || 0;
    onChange([...(volumes || []), {
      descricao: descricao.trim().toUpperCase(),
      quantidade: qty,
      peso_unitario_kg: pesoU,
      peso_total_kg: qty * pesoU,
    }]);
    setDescricao('');
    setQuantidade('');
    setPesoUnit('');
  };

  const handleRemove = (idx) => {
    onChange((volumes || []).filter((_, i) => i !== idx));
  };

  const pesoTotalGeral = (volumes || []).reduce((s, v) => s + (v.peso_total_kg || 0), 0);
  const totalVolumes = (volumes || []).reduce((s, v) => s + (v.quantidade || 0), 0);

  return ReactDOM.createPortal(
    <>
      <div className="fixed inset-0 z-[600] bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-[601] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span className="font-quicksand font-semibold text-sm text-gray-900 dark:text-white flex-1">Volumes da Carga</span>
            <button type="button" onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Formulário de adição */}
          <div className="px-5 py-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500 dark:text-gray-400">Descrição do Volume</Label>
              <Input
                placeholder="Ex: Caixas Grandes, Pallets, Sacos..."
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Quantidade</Label>
                <Input
                  type="text" inputMode="decimal"
                  placeholder="0"
                  value={quantidade}
                  onChange={e => setQuantidade(e.target.value.replace(',', '.'))}
                  className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Peso Unit. (kg)</Label>
                <Input
                  type="text" inputMode="decimal"
                  placeholder="0,00"
                  value={pesoUnit}
                  onChange={e => setPesoUnit(e.target.value.replace(',', '.'))}
                  className="bg-gray-50 dark:bg-gray-800 border-0 shadow-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                />
              </div>
            </div>
            <Button type="button" onClick={handleAdd}
              disabled={!descricao.trim() || !quantidade}
              className="w-full h-9 text-xs bg-teal-600 hover:bg-teal-700 text-white border-0 shadow-sm">
              <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Volume
            </Button>
          </div>

          {/* Lista */}
          {(volumes || []).length > 0 ? (
            <div className="px-5 pb-2 space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-1">Carrinho</div>
              {(volumes || []).map((v, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                  <Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{fmtNum(v.quantidade)}× {v.descricao}</span>
                    <span className="text-[10px] text-gray-400 ml-2">
                      {v.peso_unitario_kg > 0 && `${fmtNum(v.peso_unitario_kg)} kg/un · `}
                      <span className="text-gray-600 dark:text-gray-300 font-medium">
                        {v.peso_total_kg > 0 ? `${fmtNum(v.peso_total_kg)} kg` : '—'}
                      </span>
                    </span>
                  </div>
                  <button type="button" onClick={() => handleRemove(idx)} className="p-1 text-gray-300 hover:text-rose-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex justify-between items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl mt-1">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">Total</span>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  {fmtNum(totalVolumes)} vol · {fmtNum(pesoTotalGeral)} kg
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-3 text-xs text-gray-400 dark:text-gray-500">
              Nenhum volume adicionado ainda
            </div>
          )}

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <Button type="button" variant="outline" onClick={onClose} size="sm"
              className="border-0 shadow-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
              Fechar
            </Button>
          </div>

        </div>
      </div>
    </>,
    document.body
  );
}