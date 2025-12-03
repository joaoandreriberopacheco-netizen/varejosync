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
import { FileText, Edit, Trash2, PlusCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

export default function CategoriasFinanceirasManager() {
  const [categorias, setCategorias] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'Receita',
    cor: '#3B82F6',
    orcamento_mensal: 0,
    ativo: true
  });
  const { toast } = useToast();

  useEffect(() => {
    loadCategorias();
  }, []);

  const loadCategorias = async () => {
    const data = await base44.entities.CategoriaFinanceira.list();
    setCategorias(data);
  };

  const handleEdit = (categoria) => {
    setSelectedCategoria(categoria);
    setFormData(categoria);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedCategoria(null);
    setFormData({
      nome: '',
      tipo: 'Receita',
      cor: '#3B82F6',
      orcamento_mensal: 0,
      ativo: true
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (categoria) => {
    if (!confirm(`Excluir categoria "${categoria.nome}"?`)) return;
    
    try {
      await base44.entities.CategoriaFinanceira.delete(categoria.id);
      toast({
        title: "Categoria excluída!",
        className: "bg-red-100 text-red-800"
      });
      loadCategorias();
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
      if (selectedCategoria) {
        await base44.entities.CategoriaFinanceira.update(selectedCategoria.id, formData);
      } else {
        await base44.entities.CategoriaFinanceira.create(formData);
      }

      toast({
        title: "Categoria salva!",
        className: "bg-emerald-100 text-emerald-800"
      });

      loadCategorias();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const categoriasReceita = categorias.filter(c => c.tipo === 'Receita' || c.tipo === 'Ambos');
  const categoriasDespesa = categorias.filter(c => c.tipo === 'Despesa' || c.tipo === 'Ambos');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-yellow-600" />
            Categorias Financeiras
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">Organize receitas e despesas por categoria</p>
        </div>
        <Button onClick={handleAddNew} className="bg-emerald-600 hover:bg-emerald-700">
          <PlusCircle className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-emerald-700 mb-3 flex items-center gap-2">
              💚 Receitas ({categoriasReceita.length})
            </h3>
            <div className="space-y-2">
              {categoriasReceita.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg bg-emerald-50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.cor }} />
                    <span className="font-medium">{cat.nome}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cat)} className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {categoriasReceita.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">Nenhuma categoria de receita</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
              ❤️ Despesas ({categoriasDespesa.length})
            </h3>
            <div className="space-y-2">
              {categoriasDespesa.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.cor }} />
                    <span className="font-medium">{cat.nome}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cat)} className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {categoriasDespesa.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">Nenhuma categoria de despesa</p>
              )}
            </div>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedCategoria ? 'Editar Categoria' : 'Nova Categoria Financeira'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  placeholder="Ex: Vendas, Aluguel, Marketing..."
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo *</Label>
                  <Select value={formData.tipo} onValueChange={v => setFormData({ ...formData, tipo: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Receita">Receita</SelectItem>
                      <SelectItem value="Despesa">Despesa</SelectItem>
                      <SelectItem value="Ambos">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Cor</Label>
                  <Input
                    type="color"
                    value={formData.cor}
                    onChange={e => setFormData({ ...formData, cor: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Orçamento Mensal</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.orcamento_mensal}
                  onChange={e => setFormData({ ...formData, orcamento_mensal: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Meta/limite mensal para esta categoria
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.ativo}
                  onChange={e => setFormData({ ...formData, ativo: e.target.checked })}
                  className="w-4 h-4 accent-emerald-600"
                />
                <Label>Categoria ativa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}