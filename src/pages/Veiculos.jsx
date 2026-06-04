import React, { useState, useEffect } from 'react';
import { Veiculo } from '@/entities/Veiculo';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Truck } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function VeiculosPage() {
  const [veiculos, setVeiculos] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadVeiculos();
  }, []);

  const loadVeiculos = async () => {
    const data = await Veiculo.list('-created_date');
    setVeiculos(data);
  };

  const handleSave = async (data) => {
    if (data.id) {
      await Veiculo.update(data.id, data);
    } else {
      await Veiculo.create(data);
    }
    loadVeiculos();
    setIsFormOpen(false);
    toast({ title: "Veículo salvo com sucesso!" });
  };

  const handleEdit = (veiculo) => {
    setSelectedVeiculo(veiculo);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setSelectedVeiculo(null);
    setIsFormOpen(true);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 min-w-0">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-foreground">Frota de Veículos</h1>
            <p className="text-muted-foreground">Gerencie os veículos utilizados para entrega e transporte.</p>
          </div>
          <Button onClick={handleAddNew} className="gap-2 bg-green-600 hover:bg-green-700 shrink-0 w-full sm:w-auto">
            <PlusCircle className="h-4 w-4" /> Novo Veículo
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6 min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Tipo/Modelo</TableHead>
                  <TableHead>Capacidade (Peso)</TableHead>
                  <TableHead>Capacidade (Volume)</TableHead>
                  <TableHead>Motorista Padrão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {veiculos.map(veiculo => (
                  <TableRow key={veiculo.id}>
                    <TableCell className="font-medium">{veiculo.placa}</TableCell>
                    <TableCell>
                      <div>{veiculo.tipo}</div>
                      <div className="text-sm text-muted-foreground">{veiculo.modelo}</div>
                    </TableCell>
                    <TableCell>{veiculo.capacidade_peso_kg} kg</TableCell>
                    <TableCell>{veiculo.capacidade_volume_m3 || 'N/A'} m³</TableCell>
                    <TableCell>{veiculo.motorista_padrao_nome || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={veiculo.ativo ? "default" : "secondary"}>
                        {veiculo.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(veiculo)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <VeiculoForm
            veiculo={selectedVeiculo}
            onSave={handleSave}
            onClose={() => setIsFormOpen(false)}
          />
        </Dialog>
      </div>
    </div>
  );
}

function VeiculoForm({ veiculo, onSave, onClose }) {
  const [formData, setFormData] = useState(veiculo || {
    placa: '',
    tipo: 'Caminhão',
    modelo: '',
    capacidade_peso_kg: 0,
    capacidade_volume_m3: 0,
    motorista_padrao_id: '',
    motorista_padrao_nome: '',
    ativo: true
  });

  const [motoristas, setMotoristas] = useState([]);

  useEffect(() => {
    User.list().then(users => {
      setMotoristas(users.filter(u => u.perfil === 'Motorista' || u.perfil === 'Estoquista'));
    });
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMotoristaChange = (userId) => {
    const motorista = motoristas.find(m => m.id === userId);
    if (motorista) {
      handleChange('motorista_padrao_id', userId);
      handleChange('motorista_padrao_nome', motorista.full_name);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{veiculo ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Placa</Label>
            <Input
              value={formData.placa}
              onChange={e => handleChange('placa', e.target.value.toUpperCase())}
              placeholder="ABC-1234"
              required
            />
          </div>

          <div>
            <Label>Tipo</Label>
            <Select value={formData.tipo} onValueChange={v => handleChange('tipo', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Caminhão">Caminhão</SelectItem>
                <SelectItem value="Van">Van</SelectItem>
                <SelectItem value="Utilitário">Utilitário</SelectItem>
                <SelectItem value="Moto">Moto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Modelo</Label>
          <Input
            value={formData.modelo}
            onChange={e => handleChange('modelo', e.target.value)}
            placeholder="Ex: Mercedes-Benz Accelo 1016"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Capacidade de Peso (kg)</Label>
            <Input
              type="number"
              value={formData.capacidade_peso_kg}
              onChange={e => handleChange('capacidade_peso_kg', parseFloat(e.target.value))}
              required
            />
          </div>

          <div>
            <Label>Capacidade de Volume (m³)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.capacidade_volume_m3}
              onChange={e => handleChange('capacidade_volume_m3', parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div>
          <Label>Motorista Padrão (Opcional)</Label>
          <Select value={formData.motorista_padrao_id} onValueChange={handleMotoristaChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um motorista..." />
            </SelectTrigger>
            <SelectContent>
              {motoristas.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.ativo}
            onChange={e => handleChange('ativo', e.target.checked)}
            className="w-4 h-4"
          />
          <Label>Veículo Ativo</Label>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="bg-green-600 hover:bg-green-700">Salvar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}