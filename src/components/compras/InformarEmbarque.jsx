import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, Package, Weight, Calendar, AlertCircle, PlusCircle, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export default function InformarEmbarque({ pedido, isOpen, onClose, onSuccess }) {
  const [transportadoras, setTransportadoras] = useState([]);
  const [transportadoraId, setTransportadoraId] = useState('');
  const [eta, setEta] = useState('');
  const [pesoBruto, setPesoBruto] = useState('');
  const [volumes, setVolumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNovaTransportadora, setShowNovaTransportadora] = useState(false);
  const [novaTransportadora, setNovaTransportadora] = useState({ nome: '', email: '', telefone: '' });

  useEffect(() => {
    if (isOpen && pedido) {
      loadTransportadoras();
      setTransportadoraId('');
      setEta('');
      setPesoBruto(pedido?.peso_total_kg?.toString() || '');
      setVolumes([]);
      setShowNovaTransportadora(false);
      setNovaTransportadora({ nome: '', email: '', telefone: '' });
    }
  }, [isOpen, pedido]);

  const loadTransportadoras = async () => {
    try {
      const data = await base44.entities.Terceiro.filter({
        tipo: { $in: ['Fornecedor', 'Ambos'] },
        ativo: true
      });
      setTransportadoras(data || []);
    } catch (error) {
      console.error('Erro ao carregar transportadoras:', error);
      toast.error('Erro ao carregar transportadoras');
    }
  };

  const handleCriarTransportadora = async () => {
    if (!novaTransportadora.nome?.trim()) {
      toast.error('Nome da transportadora é obrigatório');
      return;
    }

    try {
      const count = transportadoras.length;
      const codigo = `FOR-${String(count + 1).padStart(5, '0')}`;

      const nova = await base44.entities.Terceiro.create({
        codigo_interno: codigo,
        nome: novaTransportadora.nome,
        email: novaTransportadora.email || '',
        telefone: novaTransportadora.telefone || '',
        tipo: 'Fornecedor',
        ativo: true
      });

      setTransportadoras([...transportadoras, nova]);
      setTransportadoraId(nova.id);
      setShowNovaTransportadora(false);
      setNovaTransportadora({ nome: '', email: '', telefone: '' });
      toast.success('Transportadora criada com sucesso');
    } catch (error) {
      console.error('Erro ao criar transportadora:', error);
      toast.error('Erro ao criar transportadora');
    }
  };

  const handleAddVolume = () => {
    setVolumes([...volumes, { quantidade: '', descricao: '', preco_unit_frete: '', observacoes: '' }]);
  };

  const handleRemoveVolume = (index) => {
    setVolumes(volumes.filter((_, i) => i !== index));
  };

  const handleVolumeChange = (index, field, value) => {
    const newVolumes = [...volumes];
    newVolumes[index][field] = value;
    setVolumes(newVolumes);
  };

  const calcularTotalFrete = () => {
    return volumes.reduce((sum, v) => {
      const qty = parseFloat(v.quantidade) || 0;
      const price = parseFloat(v.preco_unit_frete) || 0;
      return sum + (qty * price);
    }, 0);
  };

  const gerarDescritivoVolumes = () => {
    return volumes
      .map(v => `${v.quantidade || 0}x ${v.descricao || ''}`)
      .filter(d => d.trim() !== 'x' && d.trim() !== '0x')
      .join(', ');
  };

  const handleSalvar = async () => {
    // Validações
    if (!transportadoraId) {
      toast.error('Selecione uma Transportadora');
      return;
    }

    if (!eta || eta.trim() === '') {
      toast.error('Informe a Data de Chegada Prevista (ETA)');
      return;
    }

    const pesoNumerico = parseFloat(pesoBruto);
    if (!pesoNumerico || pesoNumerico <= 0) {
      toast.error('Informe o Peso Bruto (deve ser maior que zero)');
      return;
    }

    setLoading(true);

    try {
      const transportadora = transportadoras.find(t => t.id === transportadoraId);

      if (!transportadora) {
        throw new Error('Transportadora não encontrada');
      }

      // Verificar se existe manifesto no mesmo dia
      const etaDate = new Date(eta);
      const etaStart = new Date(etaDate);
      etaStart.setHours(0, 0, 0, 0);
      const etaEnd = new Date(etaDate);
      etaEnd.setHours(23, 59, 59, 999);

      const manifestos = await base44.entities.Supermanifesto.filter({
        transportadora_id: transportadoraId,
        status: { $in: ['Pendente', 'Em Trânsito'] }
      });

      const manifestoExistente = manifestos.find(m => {
        const manifestoEta = new Date(m.eta);
        return manifestoEta >= etaStart && manifestoEta <= etaEnd;
      });

      let manifestoId;

      if (manifestoExistente) {
        // Adicionar ao manifesto existente
        manifestoId = manifestoExistente.id;
        
        const pedidosVinculados = manifestoExistente.pedidos_vinculados || [];
        pedidosVinculados.push({
          pedido_id: pedido.id,
          pedido_numero: pedido.numero,
          descritivo_volumes: gerarDescritivoVolumes(),
          peso_informado_kg: pesoNumerico,
          volumes: volumes,
          total_frete: calcularTotalFrete()
        });

        const observacoesConsolidadas = pedidosVinculados
          .map(p => `${p.pedido_numero}: ${p.descritivo_volumes}`)
          .filter(o => o.trim() && o.trim() !== ':')
          .join(' | ');

        const pesoTotal = pedidosVinculados.reduce((sum, p) => sum + (p.peso_informado_kg || 0), 0);

        await base44.entities.Supermanifesto.update(manifestoId, {
          pedidos_vinculados: pedidosVinculados,
          peso_total_bruto_kg: pesoTotal,
          observacoes_consolidadas: observacoesConsolidadas
        });

        toast.success(`Pedido adicionado ao manifesto ${manifestoExistente.numero}`);

      } else {
        // Criar novo manifesto
        const todosManifestos = await base44.entities.Supermanifesto.list();
        const numero = `SM-${String(todosManifestos.length + 1).padStart(5, '0')}`;

        const novoManifesto = await base44.entities.Supermanifesto.create({
          numero,
          transportadora_id: transportadoraId,
          transportadora_nome: transportadora.nome,
          eta: eta,
          status: 'Pendente',
          peso_total_bruto_kg: pesoNumerico,
          pedidos_vinculados: [{
            pedido_id: pedido.id,
            pedido_numero: pedido.numero,
            descritivo_volumes: gerarDescritivoVolumes(),
            peso_informado_kg: pesoNumerico,
            volumes: volumes,
            total_frete: calcularTotalFrete()
          }],
          observacoes_consolidadas: `${pedido.numero}: ${gerarDescritivoVolumes()}`
        });

        manifestoId = novoManifesto.id;
        toast.success(`Novo manifesto ${numero} criado com sucesso!`);
      }

      // Atualizar o pedido
      await base44.entities.PedidoCompra.update(pedido.id, {
        status: 'Aguardando Recepção',
        supermanifesto_id: manifestoId
      });

      setLoading(false);
      onSuccess?.();
      onClose();

    } catch (error) {
      console.error('Erro ao informar embarque:', error);
      toast.error('Erro ao informar embarque: ' + (error.message || 'Erro desconhecido'));
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-teal-600" />
            Informar Embarque - {pedido?.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transportadora */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-400" />
                Transportadora *
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowNovaTransportadora(!showNovaTransportadora)}
                className="h-6 text-xs gap-1 text-teal-600 hover:text-teal-700"
              >
                <PlusCircle className="w-3 h-3" />
                Nova
              </Button>
            </Label>
            
            {showNovaTransportadora ? (
              <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <Input
                  placeholder="Nome da transportadora *"
                  value={novaTransportadora.nome}
                  onChange={(e) => setNovaTransportadora({ ...novaTransportadora, nome: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Email"
                    type="email"
                    value={novaTransportadora.email}
                    onChange={(e) => setNovaTransportadora({ ...novaTransportadora, email: e.target.value })}
                  />
                  <Input
                    placeholder="Telefone"
                    value={novaTransportadora.telefone}
                    onChange={(e) => setNovaTransportadora({ ...novaTransportadora, telefone: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowNovaTransportadora(false);
                      setNovaTransportadora({ nome: '', email: '', telefone: '' });
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCriarTransportadora}
                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                  >
                    Criar
                  </Button>
                </div>
              </div>
            ) : (
              <Select value={transportadoraId} onValueChange={setTransportadoraId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a transportadora" />
                </SelectTrigger>
                <SelectContent>
                  {transportadoras.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Data ETA */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              Data de Chegada Prevista (ETA) *
            </Label>
            <Input
              type="datetime-local"
              value={eta}
              onChange={(e) => setEta(e.target.value)}
            />
          </div>

          {/* Peso Bruto */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Weight className="w-4 h-4 text-gray-400" />
              Peso Bruto da Nota (kg) *
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={pesoBruto}
              onChange={(e) => {
                const val = e.target.value.replace(',', '.');
                setPesoBruto(val);
              }}
            />
          </div>

          {/* Descritivo de Volumes */}
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-400" />
                Descritivo de Volumes
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddVolume}
                className="h-6 text-xs gap-1"
              >
                <PlusCircle className="w-3 h-3" />
                Adicionar
              </Button>
            </Label>

            {volumes.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-900">
                    <TableRow>
                      <TableHead className="w-20 text-xs">Quant.</TableHead>
                      <TableHead className="text-xs">Volumes</TableHead>
                      <TableHead className="text-xs">Observações</TableHead>
                      <TableHead className="w-28 text-xs text-right">R$ Frete Un</TableHead>
                      <TableHead className="w-28 text-xs text-right">Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {volumes.map((volume, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="p-2">
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={volume.quantidade}
                            onChange={(e) => {
                              const val = e.target.value.replace(',', '.');
                              handleVolumeChange(idx, 'quantidade', val);
                            }}
                            className="h-8 text-sm w-full"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            placeholder="Ex: Caixas, Pallets..."
                            value={volume.descricao}
                            onChange={(e) => handleVolumeChange(idx, 'descricao', e.target.value)}
                            className="h-8 text-sm w-full"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            placeholder="Observações..."
                            value={volume.observacoes}
                            onChange={(e) => handleVolumeChange(idx, 'observacoes', e.target.value)}
                            className="h-8 text-sm w-full"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={volume.preco_unit_frete}
                            onChange={(e) => {
                              const val = e.target.value.replace(',', '.');
                              handleVolumeChange(idx, 'preco_unit_frete', val);
                            }}
                            className="h-8 text-sm w-full text-right"
                          />
                        </TableCell>
                        <TableCell className="p-2 text-right text-sm font-medium">
                          {((parseFloat(volume.quantidade) || 0) * (parseFloat(volume.preco_unit_frete) || 0)).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </TableCell>
                        <TableCell className="p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveVolume(idx)}
                            className="h-7 w-7 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50 dark:bg-gray-900 font-medium">
                      <TableCell colSpan={4} className="text-right text-sm">Total Frete:</TableCell>
                      <TableCell className="text-right text-sm">
                        R$ {calcularTotalFrete().toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSalvar} 
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {loading ? 'Salvando...' : 'Informar Embarque'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}