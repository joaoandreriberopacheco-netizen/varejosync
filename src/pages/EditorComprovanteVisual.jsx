import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TemplateBlockEditor from '@/components/comprovantes/TemplateBlockEditor';
import { Plus, Trash2, Edit2, Save } from 'lucide-react';

export default function EditorComprovanteVisual() {
  const [templates, setTemplates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('venda');
  const [blocks, setBlocks] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.ComprovanteTemplate.list();
      setTemplates(data || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      alert('Nome do template é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const templateData = {
        nome,
        tipo,
        blocks_config: JSON.stringify(blocks),
        html_content: '', // deprecated
        css_content: ''   // deprecated
      };

      if (editingId) {
        await base44.entities.ComprovanteTemplate.update(editingId, templateData);
      } else {
        await base44.entities.ComprovanteTemplate.create(templateData);
      }

      setEditingId(null);
      setEditingData(null);
      setIsCreating(false);
      setNome('');
      setBlocks([]);
      await loadTemplates();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      alert('Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Tem certeza que deseja deletar este template?')) {
      try {
        await base44.entities.ComprovanteTemplate.delete(id);
        await loadTemplates();
      } catch (error) {
        console.error('Erro ao deletar template:', error);
      }
    }
  };

  const handleEdit = (template) => {
    setEditingId(template.id);
    setEditingData(template);
    setNome(template.nome);
    setTipo(template.tipo);
    try {
      setBlocks(JSON.parse(template.blocks_config || '[]'));
    } catch {
      setBlocks([]);
    }
    setIsCreating(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingData(null);
    setIsCreating(false);
    setNome('');
    setTipo('venda');
    setBlocks([]);
  };

  const filteredTemplates = templates.filter(t =>
    t.nome.toLowerCase().includes(filter.toLowerCase())
  );

  if (isCreating) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Editor Visual - {nome || 'Novo Template'}</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCancel} variant="outline" size="sm">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>

        {/* Meta info */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex gap-4">
          <div className="flex-1">
            <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Nome</label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Cupom Venda Padrão"
              className="font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="px-3 py-2 text-sm font-mono bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
            >
              <option value="venda">Venda</option>
              <option value="compra">Compra</option>
            </select>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <TemplateBlockEditor blocks={blocks} onBlocksChange={setBlocks} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-quicksand text-gray-900 dark:text-white">Templates de Comprovante</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Editor visual com blocos arrastáveis</p>
        </div>
        <Button
          onClick={() => {
            setIsCreating(true);
            setEditingData(null);
            setNome('');
            setTipo('venda');
            setBlocks([]);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Novo
        </Button>
      </div>

      <Input
        placeholder="Buscar template..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="mb-4"
      />

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {templates.length === 0 ? 'Nenhum template criado' : 'Nenhum template encontrado'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-white truncate">{template.nome}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {template.tipo === 'venda' ? 'Venda' : 'Compra'} · {template.blocks_config ? JSON.parse(template.blocks_config || '[]').length : 0} blocos
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  onClick={() => handleEdit(template)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => handleDelete(template.id)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}