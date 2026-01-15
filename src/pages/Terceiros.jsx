import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, PlusCircle, Edit, Trash2, Search, Download, Upload } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import ImportacaoTerceiros from '../components/terceiros/ImportacaoTerceiros';

export default function TerceirosPage() {
  const [terceiros, setTerceiros] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTerceiro, setSelectedTerceiro] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [showImportador, setShowImportador] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cpf_cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    tipo: 'Cliente',
    ativo: true
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTerceiros();
  }, []);

  const loadTerceiros = async () => {
    const data = await base44.entities.Terceiro.list();
    setTerceiros(data);
  };

  const handleSave = async () => {
    try {
      if (selectedTerceiro) {
        await base44.entities.Terceiro.update(selectedTerceiro.id, formData);
        toast({ 
          title: "Terceiro atualizado!", 
          className: "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700"
        });
      } else {
        const allTerceiros = await base44.entities.Terceiro.list();
        const nextNumber = (allTerceiros.length > 0 
          ? Math.max(...allTerceiros.map(t => parseInt(t.codigo_interno?.split('-')[1] || 0))) 
          : 0) + 1;
        const prefix = formData.tipo === 'Cliente' || formData.tipo === 'Ambos' ? 'CLI' : 'FOR';
        const codigo = `${prefix}-${String(nextNumber).padStart(5, '0')}`;
        
        await base44.entities.Terceiro.create({
          ...formData,
          codigo_interno: codigo
        });
        toast({ 
          title: "Terceiro criado!", 
          className: "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700"
        });
      }
      loadTerceiros();
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
    if (confirm('Deseja realmente excluir este terceiro?')) {
      await base44.entities.Terceiro.delete(id);
      loadTerceiros();
      toast({ 
        title: "Terceiro excluído!", 
        className: "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700"
      });
    }
  };

  const handleEdit = (terceiro) => {
    setSelectedTerceiro(terceiro);
    setFormData({
      nome: terceiro.nome,
      cpf_cnpj: terceiro.cpf_cnpj || '',
      email: terceiro.email || '',
      telefone: terceiro.telefone || '',
      endereco: terceiro.endereco || '',
      bairro: terceiro.bairro || '',
      cidade: terceiro.cidade || '',
      estado: terceiro.estado || '',
      cep: terceiro.cep || '',
      tipo: terceiro.tipo,
      ativo: terceiro.ativo
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedTerceiro(null);
    setFormData({
      nome: '',
      cpf_cnpj: '',
      email: '',
      telefone: '',
      endereco: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
      tipo: 'Cliente',
      ativo: true
    });
  };

  const filteredTerceiros = terceiros.filter(t => {
    const matchSearch = t.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       t.cpf_cnpj?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = tipoFiltro === 'todos' || t.tipo === tipoFiltro;
    return matchSearch && matchTipo;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header - SEM CORES */}
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-medium text-gray-800 dark:text-gray-200 mb-1">Gestão de Terceiros</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Clientes, Fornecedores e Parceiros</p>
      </div>

      {/* Controles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Buscar..." 
              className="pl-6 bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 rounded-none focus:border-gray-700 dark:focus:border-gray-400 h-9 text-sm dark:text-gray-200" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger className="w-full sm:w-[180px] bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 rounded-none h-9 text-sm dark:text-gray-200">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              <SelectItem value="todos">Todos os Tipos</SelectItem>
              <SelectItem value="Cliente">Cliente</SelectItem>
              <SelectItem value="Fornecedor">Fornecedor</SelectItem>
              <SelectItem value="Ambos">Ambos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 h-10 md:h-9">
            <Download className="w-4 h-4 text-gray-700 dark:text-gray-400" /> <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button onClick={() => setShowImportador(true)} variant="outline" className="gap-2 border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 h-10 md:h-9">
            <Upload className="w-4 h-4 text-gray-700 dark:text-gray-400" /> <span className="hidden sm:inline">Importar</span>
          </Button>
          <Button onClick={handleAddNew} className="gap-2 bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white h-11 md:h-9 px-4">
            <PlusCircle className="w-4 h-4" /> Novo
          </Button>
        </div>
      </div>

      {/* Tabela */}
      {filteredTerceiros.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">Nenhum terceiro cadastrado</p>
          <Button onClick={handleAddNew} className="gap-2 bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 text-white">
            <PlusCircle className="w-4 h-4" /> Criar Primeiro Terceiro
          </Button>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden bg-white dark:bg-gray-800">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-700">
              <TableRow className="border-b border-gray-200 dark:border-gray-700">
                <TableHead className="text-gray-700 dark:text-gray-300">Código</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">Nome / Razão Social</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">CPF / CNPJ</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">Cidade</TableHead>
                <TableHead className="text-gray-700 dark:text-gray-300">Tipo</TableHead>
                <TableHead className="text-right text-gray-700 dark:text-gray-300">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTerceiros.map(terceiro => (
                <TableRow key={terceiro.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-400">{terceiro.codigo_interno}</TableCell>
                  <TableCell className="font-medium text-gray-800 dark:text-gray-200">{terceiro.nome}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{terceiro.cpf_cnpj || '-'}</TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">{terceiro.cidade || '-'}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {terceiro.tipo}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(terceiro)}
                        className="hover:bg-gray-100 dark:hover:bg-gray-600 h-10 w-10 md:h-8 md:w-8"
                      >
                        <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(terceiro.id)}
                        className="hover:bg-gray-100 dark:hover:bg-gray-600 h-10 w-10 md:h-8 md:w-8"
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

      <ImportacaoTerceiros 
        isOpen={showImportador}
        onClose={() => setShowImportador(false)}
        onSuccess={loadTerceiros}
      />

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-gray-200">
              {selectedTerceiro ? 'Editar Terceiro' : 'Novo Terceiro'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-gray-700 dark:text-gray-300">Nome / Razão Social *</Label>
                <Input 
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                />
              </div>
              <div>
                <Label className="text-gray-700 dark:text-gray-300">CPF / CNPJ</Label>
                <Input 
                  value={formData.cpf_cnpj}
                  onChange={e => setFormData({...formData, cpf_cnpj: e.target.value})}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                />
              </div>
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Tipo *</Label>
                <Select value={formData.tipo} onValueChange={v => setFormData({...formData, tipo: v})}>
                  <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    <SelectItem value="Cliente">Cliente</SelectItem>
                    <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                    <SelectItem value="Ambos">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Email</Label>
                <Input 
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                />
              </div>
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Telefone</Label>
                <Input 
                  value={formData.telefone}
                  onChange={e => setFormData({...formData, telefone: e.target.value})}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="dark:bg-gray-700 dark:border-gray-600 text-gray-700 dark:text-gray-200 h-11 md:h-10 w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 text-white h-11 md:h-10 w-full sm:w-auto">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}