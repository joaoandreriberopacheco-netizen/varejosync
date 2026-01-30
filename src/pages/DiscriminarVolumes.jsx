import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/components/utils';

export default function DiscriminarVolumes() {
  const navigate = useNavigate();
  const [manifesto, setManifesto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [volumes, setVolumes] = useState({
    quantidade: '',
    descricao: '',
    peso_kg: ''
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const manifestoId = params.get('id');
    const tipo = params.get('tipo'); // 'manifesto' ou 'supermanifesto'

    if (manifestoId && tipo) {
      loadManifesto(manifestoId, tipo);
    } else {
      toast.error('Manifesto não encontrado');
      navigate(createPageUrl('Compras'));
    }
  }, []);

  const loadManifesto = async (id, tipo) => {
    try {
      setLoading(true);
      let data;
      
      if (tipo === 'supermanifesto') {
        data = await base44.entities.Supermanifesto.filter({ id });
        if (data && data.length > 0) {
          setManifesto({ ...data[0], tipo: 'supermanifesto' });
        }
      } else {
        data = await base44.entities.ManifestoEntrada.filter({ id });
        if (data && data.length > 0) {
          setManifesto({ ...data[0], tipo: 'manifesto' });
        }
      }

      if (!data || data.length === 0) {
        toast.error('Manifesto não encontrado');
        navigate(createPageUrl('Compras'));
      }
    } catch (error) {
      console.error('Erro ao carregar manifesto:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!volumes.quantidade || !volumes.descricao) {
      toast.error('Preencha quantidade e descrição');
      return;
    }

    if (isNaN(volumes.quantidade) || parseInt(volumes.quantidade) <= 0) {
      toast.error('Quantidade deve ser um número maior que zero');
      return;
    }

    if (volumes.peso_kg && (isNaN(volumes.peso_kg) || parseFloat(volumes.peso_kg) < 0)) {
      toast.error('Peso deve ser um número válido');
      return;
    }

    try {
      setSaving(true);

      const updateData = {
        volumes_quantidade: parseInt(volumes.quantidade),
        volumes_descricao: volumes.descricao,
        volumes_peso_kg: volumes.peso_kg ? parseFloat(volumes.peso_kg) : null
      };

      if (manifesto.tipo === 'supermanifesto') {
        await base44.entities.Supermanifesto.update(manifesto.id, updateData);
      } else {
        await base44.entities.ManifestoEntrada.update(manifesto.id, updateData);
      }

      toast.success('Volumetrização salva com sucesso');
      navigate(createPageUrl('Compras'));
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar volumetrização');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Carregando...</div>
      </div>
    );
  }

  if (!manifesto) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl('Compras'))}
              className="text-gray-600 dark:text-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-5 h-5 text-gray-400" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Discriminar Volumes
                </h1>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {manifesto.numero}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="space-y-6">
            {/* Quantidade */}
            <div>
              <Label htmlFor="quantidade" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Quantidade de Volumes *
              </Label>
              <Input
                id="quantidade"
                type="number"
                min="1"
                placeholder="Ex: 15"
                value={volumes.quantidade}
                onChange={(e) => setVolumes({ ...volumes, quantidade: e.target.value })}
                className="text-base"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Quantos volumes/caixas/pacotes esse manifesto possui
              </p>
            </div>

            {/* Descrição */}
            <div>
              <Label htmlFor="descricao" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Descrição dos Volumes *
              </Label>
              <Textarea
                id="descricao"
                rows={4}
                placeholder="Ex: 15 caixas de papelão 60x40x30cm"
                value={volumes.descricao}
                onChange={(e) => setVolumes({ ...volumes, descricao: e.target.value })}
                className="text-base resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Descreva como os volumes estão organizados
              </p>
            </div>

            {/* Peso */}
            <div>
              <Label htmlFor="peso" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Peso Total (kg) - Opcional
              </Label>
              <Input
                id="peso"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 150.5"
                value={volumes.peso_kg}
                onChange={(e) => setVolumes({ ...volumes, peso_kg: e.target.value })}
                className="text-base"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Peso total de todos os volumes em quilogramas
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('Compras'))}
              className="flex-1"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white gap-2"
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Discriminação'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}