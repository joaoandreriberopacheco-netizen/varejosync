import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Package, Weight, Calendar, AlertCircle } from 'lucide-react';
import { getTenantId } from '@/components/utils/tenant';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export default function InformarEmbarque({ pedido, isOpen, onClose, onSuccess }) {
  const [transportadoras, setTransportadoras] = useState([]);
  const [formData, setFormData] = useState({
    transportadora_id: '',
    eta: '',
    peso_informado_kg: pedido?.peso_total_kg || 0,
    descritivo_volumes: ''
  });
  const [manifestoExistente, setManifestoExistente] = useState(null);
  const [showConfirmacao, setShowConfirmacao] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTransportadoras();
      setFormData({
        transportadora_id: '',
        eta: '',
        peso_informado_kg: pedido?.peso_total_kg || 0,
        descritivo_volumes: ''
      });
      setManifestoExistente(null);
      setShowConfirmacao(false);
    }
  }, [isOpen, pedido]);

  const loadTransportadoras = async () => {
    try {
      const tenantId = getTenantId();
      const data = await base44.entities.Terceiro.filter({
        empresa_id: tenantId,
        tipo: { $in: ['Fornecedor', 'Ambos'] },
        ativo: true
      });
      setTransportadoras(data);
    } catch (error) {
      console.error('Erro ao carregar transportadoras:', error);
    }
  };

  const verificarManifestoExistente = async () => {
    if (!formData.transportadora_id || !formData.eta) return;

    try {
      const tenantId = getTenantId();
      const etaDate = new Date(formData.eta);
      const etaStart = new Date(etaDate);
      etaStart.setHours(0, 0, 0, 0);
      const etaEnd = new Date(etaDate);
      etaEnd.setHours(23, 59, 59, 999);

      const manifestos = await base44.entities.Supermanifesto.filter({
        empresa_id: tenantId,
        transportadora_id: formData.transportadora_id,
        status: { $in: ['Pendente', 'Em Trânsito'] }
      });

      const manifestoMesmaData = manifestos.find(m => {
        const manifestoEta = new Date(m.eta);
        return manifestoEta >= etaStart && manifestoEta <= etaEnd;
      });

      if (manifestoMesmaData) {
        setManifestoExistente(manifestoMesmaData);
        setShowConfirmacao(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao verificar manifesto:', error);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!formData.transportadora_id || !formData.eta) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      const existeManifesto = await verificarManifestoExistente();
      
      if (existeManifesto && !showConfirmacao) {
        setLoading(false);
        return;
      }

      await vincularPedidoAoManifesto();
      
    } catch (error) {
      console.error('Erro ao informar embarque:', error);
      toast.error('Erro ao informar embarque');
      setLoading(false);
    }
  };

  const vincularPedidoAoManifesto = async (criarNovo = false) => {
    try {
      const tenantId = getTenantId();
      const transportadora = transportadoras.find(t => t.id === formData.transportadora_id);
      
      let manifestoId;

      if (manifestoExistente && !criarNovo) {
        // Adicionar ao manifesto existente
        manifestoId = manifestoExistente.id;
        
        const pedidosVinculados = manifestoExistente.pedidos_vinculados || [];
        pedidosVinculados.push({
          pedido_id: pedido.id,
          pedido_numero: pedido.numero,
          descritivo_volumes: formData.descritivo_volumes,
          peso_informado_kg: formData.peso_informado_kg
        });

        const observacoesConsolidadas = pedidosVinculados
          .map(p => `${p.pedido_numero}: ${p.descritivo_volumes}`)
          .filter(o => o.trim() !== ':')
          .join(' | ');

        const pesoTotal = pedidosVinculados.reduce((sum, p) => sum + (p.peso_informado_kg || 0), 0);

        await base44.entities.Supermanifesto.update(manifestoId, {
          pedidos_vinculados: pedidosVinculados,
          peso_total_bruto_kg: pesoTotal,
          observacoes_consolidadas: observacoesConsolidadas
        });

      } else {
        // Criar novo manifesto
        const manifestos = await base44.entities.Supermanifesto.filter({ empresa_id: tenantId });
        const numero = `SM-${String(manifestos.length + 1).padStart(5, '0')}`;

        const novoManifesto = await base44.entities.Supermanifesto.create({
          empresa_id: tenantId,
          numero,
          transportadora_id: formData.transportadora_id,
          transportadora_nome: transportadora?.nome || '',
          eta: formData.eta,
          status: 'Pendente',
          peso_total_bruto_kg: formData.peso_informado_kg,
          pedidos_vinculados: [{
            pedido_id: pedido.id,
            pedido_numero: pedido.numero,
            descritivo_volumes: formData.descritivo_volumes,
            peso_informado_kg: formData.peso_informado_kg
          }],
          observacoes_consolidadas: `${pedido.numero}: ${formData.descritivo_volumes}`
        });

        manifestoId = novoManifesto.id;
      }

      // Atualizar o pedido
      await base44.entities.PedidoCompra.update(pedido.id, {
        status: 'Aguardando Recepção',
        supermanifesto_id: manifestoId
      });

      toast.success('Embarque informado com sucesso!');
      setLoading(false);
      onSuccess?.();
      onClose();

    } catch (error) {
      console.error('Erro ao vincular pedido:', error);
      toast.error('Erro ao vincular pedido ao manifesto');
      setLoading(false);
      throw error;
    }
  };

  if (showConfirmacao && manifestoExistente) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Manifesto Existente
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Já existe um manifesto para <strong>{manifestoExistente.transportadora_nome}</strong> na data{' '}
                <strong>{format(parseISO(manifestoExistente.eta), 'dd/MM/yyyy')}</strong>.
              </p>
              <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <p><strong>Manifesto:</strong> {manifestoExistente.numero}</p>
                <p><strong>Pedidos:</strong> {manifestoExistente.pedidos_vinculados?.length || 0}</p>
                <p><strong>Peso Total:</strong> {manifestoExistente.peso_total_bruto_kg || 0} kg</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              Deseja adicionar este pedido ao manifesto existente ou criar um novo?
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={() => vincularPedidoAoManifesto(true)}
              disabled={loading}
            >
              Criar Novo
            </Button>
            <Button
              onClick={() => vincularPedidoAoManifesto(false)}
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {loading ? 'Adicionando...' : 'Adicionar ao Existente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-teal-600" />
            Informar Embarque - {pedido?.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-gray-400" />
              Transportadora *
            </Label>
            <Select 
              value={formData.transportadora_id} 
              onValueChange={(value) => setFormData({ ...formData, transportadora_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a transportadora" />
              </SelectTrigger>
              <SelectContent>
                {transportadoras.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              Data de Chegada Prevista (ETA) *
            </Label>
            <Input
              type="datetime-local"
              value={formData.eta}
              onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Weight className="w-4 h-4 text-gray-400" />
              Peso Bruto da Nota (kg) *
            </Label>
            <Input
              type="number"
              step="0.01"
              value={formData.peso_informado_kg}
              onChange={(e) => setFormData({ ...formData, peso_informado_kg: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              Descritivo de Volumes
            </Label>
            <Textarea
              placeholder="Ex: 10 caixas, 2 fardos..."
              value={formData.descritivo_volumes}
              onChange={(e) => setFormData({ ...formData, descritivo_volumes: e.target.value })}
              rows={3}
            />
            <p className="text-xs text-gray-500">
              Descreva os volumes conforme sua expertise logística
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {loading ? 'Processando...' : 'Informar Embarque'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}