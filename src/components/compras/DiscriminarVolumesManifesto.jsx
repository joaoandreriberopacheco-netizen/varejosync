import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Package, Weight, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function DiscriminarVolumesManifesto({ manifesto, isOpen, onClose, onSuccess }) {
  const [pedidosVolumes, setPedidosVolumes] = useState({});
  const [saving, setSaving] = useState(false);

  // Inicializa os dados quando abre o modal
  React.useEffect(() => {
    if (isOpen && manifesto?.pedidos_vinculados) {
      const inicial = {};
      manifesto.pedidos_vinculados.forEach(pv => {
        inicial[pv.pedido_id] = {
          descritivo_volumes: pv.descritivo_volumes || '',
          peso_informado_kg: pv.peso_informado_kg || 0
        };
      });
      setPedidosVolumes(inicial);
    }
  }, [isOpen, manifesto]);

  const handleSalvar = async () => {
    try {
      setSaving(true);

      // Atualiza o array pedidos_vinculados com os novos dados
      const pedidosAtualizados = manifesto.pedidos_vinculados.map(pv => ({
        ...pv,
        descritivo_volumes: pedidosVolumes[pv.pedido_id]?.descritivo_volumes || pv.descritivo_volumes,
        peso_informado_kg: Number(pedidosVolumes[pv.pedido_id]?.peso_informado_kg || pv.peso_informado_kg || 0)
      }));

      // Calcula o peso total bruto
      const pesoTotal = pedidosAtualizados.reduce((sum, p) => sum + (p.peso_informado_kg || 0), 0);

      // Gera observações consolidadas
      const obsConsolidadas = pedidosAtualizados
        .filter(p => p.descritivo_volumes)
        .map(p => `${p.pedido_numero}: ${p.descritivo_volumes}`)
        .join(' | ');

      // Atualiza o supermanifesto
      await base44.entities.Supermanifesto.update(manifesto.id, {
        pedidos_vinculados: pedidosAtualizados,
        peso_total_bruto_kg: pesoTotal,
        observacoes_consolidadas: obsConsolidadas || null
      });

      toast.success('Volumes discriminados com sucesso');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar volumes:', error);
      toast.error('Erro ao salvar discriminação de volumes');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (pedidoId, field, value) => {
    setPedidosVolumes(prev => ({
      ...prev,
      [pedidoId]: {
        ...prev[pedidoId],
        [field]: value
      }
    }));
  };

  const pesoTotal = Object.values(pedidosVolumes).reduce((sum, pv) => sum + Number(pv.peso_informado_kg || 0), 0);

  if (!manifesto) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-600" />
            Discriminar Volumes - {manifesto.numero}
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Informe a discriminação de volumes e peso de cada pedido vinculado
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Resumo */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Weight className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Peso Total Bruto</span>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {pesoTotal.toFixed(2)} kg
            </span>
          </div>

          {/* Lista de Pedidos */}
          <div className="space-y-4">
            {manifesto.pedidos_vinculados?.map((pedidoVinculado) => (
              <div 
                key={pedidoVinculado.pedido_id} 
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 space-y-4"
              >
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {pedidoVinculado.pedido_numero}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      Descritivo de Volumes
                    </Label>
                    <Textarea
                      placeholder="Ex: 15 caixas de papelão 60x40x30cm"
                      value={pedidosVolumes[pedidoVinculado.pedido_id]?.descritivo_volumes || ''}
                      onChange={(e) => handleChange(pedidoVinculado.pedido_id, 'descritivo_volumes', e.target.value)}
                      className="min-h-[80px] bg-gray-50 dark:bg-gray-900/50"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      Peso Informado (kg)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={pedidosVolumes[pedidoVinculado.pedido_id]?.peso_informado_kg || ''}
                      onChange={(e) => handleChange(pedidoVinculado.pedido_id, 'peso_informado_kg', e.target.value)}
                      className="bg-gray-50 dark:bg-gray-900/50"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSalvar}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {saving ? 'Salvando...' : 'Salvar Discriminação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}