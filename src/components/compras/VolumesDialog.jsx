import React, { useState } from 'react';

function fmtNum(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  if (Math.abs(n) < 1000) return n % 1 === 0 ? String(n) : n.toFixed(1);
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Plus, Trash2, Boxes } from 'lucide-react';

// volumes: [{ descricao, quantidade, peso_unitario_kg }]
export default function VolumesDialog({ isOpen, onClose, volumes, onChange }) {
  const [descricao, setDescricao] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [pesoUnit, setPesoUnit] = useState('');

  const handleAdd = () => {
    if (!descricao.trim() || !quantidade) return;
    const qty = parseFloat(quantidade) || 0;
    const pesoU = parseFloat(pesoUnit) || 0;
    const novoVolume = {
      descricao: descricao.trim().toUpperCase(),
      quantidade: qty,
      peso_unitario_kg: pesoU,
      peso_total_kg: qty * pesoU
    };
    onChange([...(volumes || []), novoVolume]);
    setDescricao('');
    setQuantidade('');
    setPesoUnit('');
  };

  const handleRemove = (idx) => {
    onChange((volumes || []).filter((_, i) => i !== idx));
  };

  const pesoTotalGeral = (volumes || []).reduce((s, v) => s + (v.peso_total_kg || 0), 0);
  const totalVolumes = (volumes || []).reduce((s, v) => s + (v.quantidade || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-gray-900 border-0 shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-quicksand text-gray-900 dark:text-white text-base">
            <Boxes className="w-4 h-4 text-teal-600" />
            Volumes da Carga
          </DialogTitle>
        </DialogHeader>

        {/* Formulário de adição */}
        <div className="space-y-3">
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
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!descricao.trim() || !quantidade}
            className="w-full h-9 text-xs bg-teal-600 hover:bg-teal-700 text-white border-0 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Volume
          </Button>
        </div>

        {/* Lista de volumes */}
        {(volumes || []).length > 0 && (
          <div className="space-y-1.5 mt-1">
            <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-2">Carrinho de Volumes</div>
            {(volumes || []).map((v, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
                <Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{fmtNum(v.quantidade)}× {v.descricao}</span>
                  <span className="text-[10px] text-gray-400 ml-2">
                    {v.peso_unitario_kg > 0 && `${fmtNum(v.peso_unitario_kg)} kg/un · `}
                    <span className="text-gray-600 dark:text-gray-300 font-medium">{v.peso_total_kg > 0 ? `${fmtNum(v.peso_total_kg)} kg total` : '—'}</span>
                  </span>
                </div>
                <button onClick={() => handleRemove(idx)} className="p-1 text-gray-300 hover:text-rose-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {/* Totalizador */}
            <div className="flex justify-between items-center px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl mt-1">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">Total</span>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                {fmtNum(totalVolumes)} volumes · {fmtNum(pesoTotalGeral.toFixed(1))} kg
              </span>
            </div>
          </div>
        )}

        {(volumes || []).length === 0 && (
          <div className="text-center py-4 text-xs text-gray-400 dark:text-gray-500">
            Nenhum volume adicionado ainda
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} size="sm" className="border-0 shadow-sm text-gray-700 dark:text-gray-300">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}