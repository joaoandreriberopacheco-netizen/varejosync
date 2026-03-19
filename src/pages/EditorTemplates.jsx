import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EditorTemplate from '@/components/comprovantes/EditorTemplate';
import { Plus, Trash2, Edit2 } from 'lucide-react';

export default function EditorTemplates() {
  const [templates, setTemplates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

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

  const handleSave = async (formData) => {
    try {
      if (editingId) {
        await base44.entities.ComprovanteTemplate.update(editingId, formData);
      } else {
        await base44.entities.ComprovanteTemplate.create(formData);
      }
      setEditingId(null);
      setEditingData(null);
      setIsCreating(false);
      await loadTemplates();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
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

  const filteredTemplates = templates.filter(t =>
    t.nome.toLowerCase().includes(filter.toLowerCase())
  );

  if (isCreating || editingId) {
    return (
      <EditorTemplate
        templateData={editingData}
        onSave={handleSave}
        onCancel={() => {
          setIsCreating(false);
          setEditingId(null);
          setEditingData(null);
        }}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-quicksand text-gray-900 dark:text-white">Templates de Comprovante</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie os layouts HTML/CSS dos seus documentos</p>
        </div>
        <Button
          onClick={() => {
            setIsCreating(true);
            setEditingData(null);
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
                  {template.tipo === 'venda' ? 'Venda' : 'Compra'} {template.descricao && `· ${template.descricao}`}
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  onClick={() => {
                    setEditingId(template.id);
                    setEditingData(template);
                  }}
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