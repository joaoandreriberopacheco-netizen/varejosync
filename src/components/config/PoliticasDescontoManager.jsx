
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Percent, Edit, Trash2, PlusCircle, AlertCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function PoliticasDescontoManager() {
  const [politicas, setPoliticas] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPolitica, setSelectedPolitica] = useState(null);
  const [formData, setFormData] = useState({
    perfil: 'Vendedor Junior',
    desconto_maximo_percentual: 0,
    requer_aprovacao_acima: 0,
    pode_aprovar_descontos: false,
    observacoes: '',
    ativo: true
  });
  const { toast } = useToast();

  useEffect(() => {
    loadPoliticas();
  }, []);

  const loadPoliticas = async () => {
    const data = await base44.entities.PoliticasDesconto.list();
    setPoliticas(data);
  };

  const handleEdit = (politica) => {
    setSelectedPolitica(politica);
    setFormData(politica);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedPolitica(null);
    setFormData({
      perfil: 'Vendedor Junior',
      desconto_maximo_percentual: 0,
      requer_aprovacao_acima: 0,
      pode_aprovar_descontos: false,
      observacoes: '',
      ativo: true
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (politica) => {
    if (!confirm(`Excluir política de "${politica.perfil}"?`)) return;
    
    try {
      await base44.entities.PoliticasDesconto.delete(politica.id);
      toast({
        title: "Política excluída!",
        className: "bg-red-100 text-red-800"
      });
      loadPoliticas();
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    try {
      if (selectedPolitica) {
        await base44.entities.PoliticasDesconto.update(selectedPolitica.id, formData);
      } else {
        await base44.entities.PoliticasDesconto.create(formData);
      }

      toast({
        title: "Política salva!",
        className: "bg-emerald-100 text-emerald-800"
      });

      loadPoliticas();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-base font-normal text-gray-800 dark:text-gray-200">Políticas de Desconto</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure limites de desconto por perfil de usuário</p>
        </div>
        <Button onClick={handleAddNew} className="gap-2 bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white">
          <PlusCircle className="w-4 h-4" /> Adicionar
        </Button>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Controle de descontos por perfil</h4>
            <p className="text-sm text-gray-700">
              Descontos acima do limite definido exigirão aprovação de gerente/admin.
            </p>
          </div>
        </div>
      </div>

      {politicas.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Percent className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500 mb-4">Nenhuma política cadastrada</p>
          <Button onClick={handleAddNew} className="bg-gray-600 hover:bg-gray-700">
            Criar Primeira Política
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Perfil</TableHead>
              <TableHead>Desconto Máximo</TableHead>
              <TableHead>Requer Aprovação Acima</TableHead>
              <TableHead>Pode Aprovar</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {politicas.map(politica => (
              <TableRow key={politica.id}>
                <TableCell className="font-medium">{politica.perfil}</TableCell>
                <TableCell>
                  <Badge className="bg-gray-100 text-gray-800">
                    {politica.desconto_maximo_percentual}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className="bg-gray-100 text-gray-800">
                    {politica.requer_aprovacao_acima}%
                  </Badge>
                </TableCell>
                <TableCell>
                  {politica.pode_aprovar_descontos ? '✓ Sim' : '✗ Não'}
                </TableCell>
                <TableCell>
                  {politica.ativo ? '✓ Ativa' : '✗ Inativa'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(politica)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(politica)} className="text-gray-600 hover:text-gray-800">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPolitica ? 'Editar Política' : 'Nova Política de Desconto'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Perfil *</Label>
              <Select value={formData.perfil} onValueChange={v => setFormData({ ...formData, perfil: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Gerente">Gerente</SelectItem>
                  <SelectItem value="Vendedor Junior">Vendedor Junior</SelectItem>
                  <SelectItem value="Estoquista">Estoquista</SelectItem>
                  <SelectItem value="Financeiro">Financeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Desconto Máximo Permitido (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.desconto_maximo_percentual}
                onChange={e => setFormData({ ...formData, desconto_maximo_percentual: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Requer Aprovação Acima de (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.requer_aprovacao_acima}
                onChange={e => setFormData({ ...formData, requer_aprovacao_acima: parseFloat(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Descontos entre este valor e o máximo exigem aprovação
              </p>
            </div>

            <div>
              <Label>Observações</Label>
              <Input
                value={formData.observacoes}
                onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Ex: Política padrão para vendedores..."
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.pode_aprovar_descontos}
                  onChange={e => setFormData({ ...formData, pode_aprovar_descontos: e.target.checked })}
                  className="w-4 h-4 accent-gray-600"
                />
                <Label>Pode aprovar descontos</Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.ativo}
                  onChange={e => setFormData({ ...formData, ativo: e.target.checked })}
                  className="w-4 h-4 accent-gray-600"
                />
                <Label>Política ativa</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-gray-600 hover:bg-gray-700">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
