import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit3, Trash2, MapPin, Download, Upload, Loader2, FileUp, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AreasManager() {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingArea, setEditingArea] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    ativo: true
  });
  const { toast } = useToast();

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Area.list();
      setAreas(data.sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (error) {
      toast({ title: 'Erro ao carregar áreas', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      if (editingArea) {
        await base44.entities.Area.update(editingArea.id, formData);
        toast({ title: 'Área atualizada com sucesso!' });
      } else {
        await base44.entities.Area.create(formData);
        toast({ title: 'Área criada com sucesso!' });
      }
      loadAreas();
      handleClose();
    } catch (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir esta área?')) return;
    try {
      await base44.entities.Area.delete(id);
      toast({ title: 'Área excluída com sucesso!' });
      loadAreas();
    } catch (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (area) => {
    setEditingArea(area);
    setFormData(area);
    setShowDialog(true);
  };

  const handleClose = () => {
    setShowDialog(false);
    setEditingArea(null);
    setFormData({
      codigo: '',
      nome: '',
      descricao: '',
      ativo: true
    });
  };

  const handleExport = () => {
    const csv = [
      ['Código', 'Nome', 'Descrição', 'Ativo'],
      ...areas.map(a => [a.codigo, a.nome, a.descricao || '', a.ativo ? 'Sim' : 'Não'])
    ].map(row => row.join(';')).join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'areas.csv';
    link.click();
  };

  const handleDownloadTemplate = () => {
    const template = [
      ['Código', 'Nome', 'Descrição', 'Ativo'],
      ['A1', 'HIDRÁULICA', 'Produtos de hidráulica', 'Sim'],
      ['A2', 'ELÉTRICA', 'Produtos de elétrica', 'Sim'],
      ['A3', 'CONSTRUÇÃO', 'Materiais de construção', 'Sim']
    ].map(row => row.join(';')).join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_areas.csv';
    link.click();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const { data } = await base44.functions.invoke('importarAreas', { file_url });
      
      setImportResult(data);
      loadAreas();
      toast({ 
        title: 'Importação concluída!',
        description: `${data.criadas} criadas, ${data.atualizadas} atualizadas, ${data.produtosAtualizados} produtos atualizados`
      });
    } catch (error) {
      toast({ title: 'Erro na importação', description: error.message, variant: 'destructive' });
    }
    
    setImporting(false);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <MapPin className="w-5 h-5" /> Áreas / Setores
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie as áreas da loja</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20">
            <FileText className="w-4 h-4" /> Template CSV
          </Button>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" /> Exportar
          </Button>
          <div className="relative">
            <input
              type="file"
              id="import-areas"
              className="hidden"
              accept=".csv,.txt"
              onChange={handleImport}
              disabled={importing}
            />
            <Button 
              variant="outline" 
              onClick={() => document.getElementById('import-areas').click()}
              disabled={importing}
              className="gap-2"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
              Importar CSV
            </Button>
          </div>
          <Button onClick={() => setShowDialog(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4" /> Nova Área
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map(area => (
            <div 
              key={area.id} 
              className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-600 text-white font-bold"
                  >
                    {area.codigo}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">{area.nome}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{area.codigo}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(area)} className="h-8 w-8">
                    <Edit3 className="w-4 h-4 text-gray-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(area.id)} className="h-8 w-8">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
              {area.descricao && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{area.descricao}</p>
              )}
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-1 rounded-full ${area.ativo ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'}`}>
                  {area.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {importResult && importResult.erros > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Avisos de Importação</h4>
          <ul className="text-sm text-yellow-700 dark:text-yellow-400 list-disc list-inside">
            {importResult.detalhes?.erros?.map((erro, i) => (
              <li key={i}>{erro}</li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="dark:bg-gray-900 dark:border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              {editingArea ? 'Editar Área' : 'Nova Área'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="dark:text-gray-300">Código *</Label>
              <Input
                value={formData.codigo}
                onChange={e => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                placeholder="A1"
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div>
              <Label className="dark:text-gray-300">Nome *</Label>
              <Input
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Hidráulica"
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div>
              <Label className="dark:text-gray-300">Descrição</Label>
              <Textarea
                value={formData.descricao || ''}
                onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição opcional..."
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.ativo}
                onCheckedChange={v => setFormData({ ...formData, ativo: v })}
                id="area-ativo"
              />
              <Label htmlFor="area-ativo" className="cursor-pointer dark:text-gray-300">Área Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={handleClose} className="dark:text-gray-300">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}