import React, { useState, useEffect } from 'react';
import { TabelaPreco } from '@/entities/TabelaPreco';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Percent, DollarSign } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function TabelasPrecoPage() {
  const [tabelas, setTabelas] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTabela, setSelectedTabela] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTabelas();
  }, []);

  const loadTabelas = async () => {
    const data = await TabelaPreco.list('-created_date');
    setTabelas(data);
  };

  const handleSave = async (data) => {
    if (data.id) {
      await TabelaPreco.update(data.id, data);
    } else {
      await TabelaPreco.create(data);
    }
    loadTabelas();
    setIsFormOpen(false);
    toast({ title: "Tabela de preço salva com sucesso!" });
  };

  const handleEdit = (tabela) => {
    setSelectedTabela(tabela);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setSelectedTabela(null);
    setIsFormOpen(true);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Tabelas de Preço</h1>
            <p className="text-gray-600">Gerencie diferentes políticas de precificação para seus clientes.</p>
          </div>
          <Button onClick={handleAddNew} className="gap-2 bg-green-600 hover:bg-green-700">
            <PlusCircle className="h-4 w-4" /> Nova Tabela
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Tabela</TableHead>
                  <TableHead>Fator de Ajuste</TableHead>
                  <TableHead>Exemplo (Base: R$ 100)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tabelas.map(tabela => {
                  const exemplo = 100 * (tabela.fator_ajuste || 1);
                  const ajuste = ((tabela.fator_ajuste || 1) - 1) * 100;
                  return (
                    <TableRow key={tabela.id}>
                      <TableCell className="font-medium">{tabela.nome_tabela}</TableCell>
                      <TableCell>
                        <span className={ajuste > 0 ? 'text-green-600' : ajuste < 0 ? 'text-red-600' : ''}>
                          {ajuste > 0 ? '+' : ''}{ajuste.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>R$ {exemplo.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={tabela.ativo ? "default" : "secondary"}>
                          {tabela.ativo ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(tabela)}>
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
          <TabelaPrecoForm
            tabela={selectedTabela}
            onSave={handleSave}
            onClose={() => setIsFormOpen(false)}
          />
        </Dialog>
      </div>
    </div>
  );
}

function TabelaPrecoForm({ tabela, onSave, onClose }) {
  const [formData, setFormData] = useState(tabela || {
    nome_tabela: '',
    fator_ajuste: 1,
    ativo: true
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const ajustePercentual = ((formData.fator_ajuste - 1) * 100).toFixed(1);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{tabela ? 'Editar Tabela de Preço' : 'Nova Tabela de Preço'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Nome da Tabela</Label>
          <Input
            value={formData.nome_tabela}
            onChange={e => handleChange('nome_tabela', e.target.value)}
            placeholder="Ex: Atacado, Varejo Premium, Black Friday"
            required
          />
        </div>

        <div>
          <Label>Fator de Ajuste (Multiplicador)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.fator_ajuste}
            onChange={e => handleChange('fator_ajuste', parseFloat(e.target.value))}
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            {ajustePercentual > 0 ? `+${ajustePercentual}%` : `${ajustePercentual}%`} sobre o preço padrão
          </p>
          <p className="text-xs text-gray-400">
            Exemplo: 1.1 = +10% | 0.9 = -10% | 1.0 = Preço padrão
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.ativo}
            onChange={e => handleChange('ativo', e.target.checked)}
            className="w-4 h-4"
          />
          <Label>Tabela Ativa</Label>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="bg-green-600 hover:bg-green-700">Salvar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}