import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Tag } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function TabelasPrecoManager() {
  const [tabelas, setTabelas] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tabelaSelecionada, setTabelaSelecionada] = useState(null);
  const [formData, setFormData] = useState({
    nome_tabela: '',
    fator_ajuste: 1,
    ativo: true
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTabelas();
  }, []);

  const loadTabelas = async () => {
    const data = await base44.entities.TabelaPreco.list();
    setTabelas(data);
  };

  const handleSave = async () => {
    try {
      if (tabelaSelecionada) {
        await base44.entities.TabelaPreco.update(tabelaSelecionada.id, formData);
        toast({ 
          title: "Tabela atualizada!", 
          className: "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700"
        });
      } else {
        await base44.entities.TabelaPreco.create(formData);
        toast({ 
          title: "Tabela criada!", 
          className: "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700"
        });
      }
      loadTabelas();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({ 
        title: "Erro ao salvar", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Deseja realmente excluir esta tabela?')) {
      await base44.entities.TabelaPreco.delete(id);
      loadTabelas();
      toast({ 
        title: "Tabela excluída!", 
        className: "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700"
      });
    }
  };

  const handleEdit = (tabela) => {
    setTabelaSelecionada(tabela);
    setFormData({
      nome_tabela: tabela.nome_tabela,
      fator_ajuste: tabela.fator_ajuste,
      ativo: tabela.ativo
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setTabelaSelecionada(null);
    setFormData({ nome_tabela: '', fator_ajuste: 1, ativo: true });
  };

  const calcularPercentual = (fator) => {
    return ((fator - 1) * 100).toFixed(1);
  };

  return (
    <div className="space-y-4">
      {/* Header - SEM CORES */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-base font-normal text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-700 dark:text-gray-400" /> Tabelas de Preço
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie diferentes tabelas (Varejo, Atacado, VIP)</p>
        </div>
        <Button onClick={handleAddNew} className="gap-2 bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500">
          <PlusCircle className="w-4 h-4" /> Nova Tabela
        </Button>
      </div>

      {/* Tabela - SEM FUNDO BRANCO NO MODO ESCURO */}
      {tabelas.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
          <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">Nenhuma tabela cadastrada</p>
          <Button onClick={handleAddNew} className="gap-2 bg-gray-700 hover:bg-gray-600 dark:bg-gray-600">
            <PlusCircle className="w-4 h-4" /> Criar Primeira Tabela
          </Button>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden bg-white dark:bg-gray-800">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-700">
              <TableRow className="border-b border-gray-200 dark:border-gray-700">
                <TableHead className="text-gray-700 dark:text-gray-300">Nome da Tabela</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">Fator</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">Ajuste</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">Status</TableHead>
                <TableHead className="text-right text-gray-700 dark:text-gray-300">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabelas.map(tabela => (
                <TableRow key={tabela.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <TableCell className="font-medium text-gray-800 dark:text-gray-200">{tabela.nome_tabela}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{tabela.fator_ajuste.toFixed(2)}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {calcularPercentual(tabela.fator_ajuste) > 0 ? '+' : ''}
                    {calcularPercentual(tabela.fator_ajuste)}%
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${
                      tabela.ativo 
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-500'
                    }`}>
                      {tabela.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(tabela)}
                        className="hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(tabela.id)}
                        className="hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <Trash2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-gray-200">
              {tabelaSelecionada ? 'Editar Tabela' : 'Nova Tabela de Preço'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Nome da Tabela</Label>
              <Input 
                value={formData.nome_tabela}
                onChange={e => setFormData({...formData, nome_tabela: e.target.value})}
                placeholder="Ex: Varejo, Atacado..."
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
            </div>
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Fator de Ajuste</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.fator_ajuste}
                onChange={e => setFormData({...formData, fator_ajuste: parseFloat(e.target.value)})}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                1.0 = sem alteração | 1.1 = +10% | 0.9 = -10%
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="dark:bg-gray-700 dark:border-gray-600">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-gray-700 hover:bg-gray-600 dark:bg-gray-600">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}