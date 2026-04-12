import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Tag, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";

export default function CampanhasPage() {
  const [campanhas, setCampanhas] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCampanha, setSelectedCampanha] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCampanhas();
  }, []);

  const loadCampanhas = async () => {
    const data = await base44.entities.Campanha.list('-created_date');
    setCampanhas(data);
  };

  const handleSave = async (data) => {
    if (data.id) {
      await base44.entities.Campanha.update(data.id, data);
    } else {
      await base44.entities.Campanha.create(data);
    }
    loadCampanhas();
    setIsFormOpen(false);
    toast({ title: "Campanha salva com sucesso!" });
  };

  const handleEdit = (campanha) => {
    setSelectedCampanha(campanha);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setSelectedCampanha(null);
    setIsFormOpen(true);
  };

  const getStatusCampanha = (campanha) => {
    const agora = new Date();
    const inicio = new Date(campanha.data_inicio);
    const fim = new Date(campanha.data_fim);

    if (!campanha.ativo) return { label: 'Inativa', variant: 'secondary' };
    if (agora < inicio) return { label: 'Agendada', variant: 'default' };
    if (agora >= inicio && agora <= fim) return { label: 'Ativa', variant: 'default' };
    return { label: 'Expirada', variant: 'destructive' };
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 min-w-0">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-gray-800">Campanhas Promocionais</h1>
            <p className="text-gray-600">Crie promoções automáticas com data e hora de validade.</p>
          </div>
          <Button onClick={handleAddNew} className="gap-2 bg-green-600 hover:bg-green-700 shrink-0 w-full sm:w-auto">
            <PlusCircle className="h-4 w-4" /> Nova Campanha
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6 min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Campanha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Produtos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campanhas.map(campanha => {
                  const status = getStatusCampanha(campanha);
                  return (
                    <TableRow key={campanha.id}>
                      <TableCell className="font-medium">{campanha.nome_campanha}</TableCell>
                      <TableCell>{campanha.tipo}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(campanha.data_inicio), 'dd/MM/yyyy HH:mm')} até{' '}
                        {format(new Date(campanha.data_fim), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{campanha.produtos_ids?.length || 0} produto(s)</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(campanha)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <CampanhaForm
            campanha={selectedCampanha}
            onSave={handleSave}
            onClose={() => setIsFormOpen(false)}
          />
        </Dialog>
      </div>
    </div>
  );
}

function CampanhaForm({ campanha, onSave, onClose }) {
  const [formData, setFormData] = useState(campanha || {
    nome_campanha: '',
    tipo: 'Desconto Percentual',
    data_inicio: '',
    data_fim: '',
    produtos_ids: [],
    valor_desconto: 0,
    ativo: true
  });

  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    base44.entities.Produto.list().then(setProdutos);
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{campanha ? 'Editar Campanha' : 'Nova Campanha Promocional'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Nome da Campanha</Label>
          <Input
            value={formData.nome_campanha}
            onChange={e => handleChange('nome_campanha', e.target.value)}
            placeholder="Ex: Black Friday 2024, Queima de Estoque"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tipo de Promoção</Label>
            <Select value={formData.tipo} onValueChange={v => handleChange('tipo', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Desconto Percentual">Desconto Percentual</SelectItem>
                <SelectItem value="Desconto Fixo">Desconto Fixo (R$)</SelectItem>
                <SelectItem value="Preço Especial">Preço Especial</SelectItem>
                <SelectItem value="Leve N Pague M">Leve N Pague M</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Valor do Desconto/Preço</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.valor_desconto}
              onChange={e => handleChange('valor_desconto', parseFloat(e.target.value))}
              placeholder="Ex: 10 (para 10%)"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Data/Hora de Início</Label>
            <Input
              type="datetime-local"
              value={formData.data_inicio}
              onChange={e => handleChange('data_inicio', e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Data/Hora de Término</Label>
            <Input
              type="datetime-local"
              value={formData.data_fim}
              onChange={e => handleChange('data_fim', e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <Label>Produtos Participantes</Label>
          <p className="text-xs text-gray-500 mb-2">
            Selecione quais produtos fazem parte desta campanha
          </p>
          <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
            {produtos.map(produto => (
              <div key={produto.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.produtos_ids?.includes(produto.id)}
                  onChange={e => {
                    const ids = formData.produtos_ids || [];
                    if (e.target.checked) {
                      handleChange('produtos_ids', [...ids, produto.id]);
                    } else {
                      handleChange('produtos_ids', ids.filter(id => id !== produto.id));
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">{produto.nome}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.ativo}
            onChange={e => handleChange('ativo', e.target.checked)}
            className="w-4 h-4"
          />
          <Label>Campanha Ativa</Label>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="bg-green-600 hover:bg-green-700">Salvar Campanha</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}